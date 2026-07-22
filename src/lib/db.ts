import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc 
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase';
import { Empresa, Usuario, Motorista, Veiculo, Entrega, EntregaStatus, HistoricoStatus, UserRole } from '../types';

// Simple hashing function for fallback password validation
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sec_hash_${hash.toString(16)}`;
}

// Generate unique IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

// JWT Token session key - ONLY key stored in LocalStorage
const JWT_TOKEN_KEY = 'fast_jwt_token';

// In-Memory cache fed by real-time Firestore onSnapshot listeners
const inMemoryCache = {
  empresas: [] as Empresa[],
  usuarios: [] as Usuario[],
  deliveries: {} as Record<string, Entrega[]>, // key: companyId
  drivers: {} as Record<string, Motorista[]>,    // key: companyId
  vehicles: {} as Record<string, Veiculo[]>,   // key: companyId
  activeSession: null as Usuario | null,
  listenersInitialized: false,
  subscribers: new Set<() => void>()
};

// Setup real-time listeners for instant multi-device synchronization
function setupRealtimeListeners() {
  if (inMemoryCache.listenersInitialized) return;
  inMemoryCache.listenersInitialized = true;

  // Real-time Companies
  onSnapshot(collection(firestoreDb, 'empresas'), (snapshot) => {
    inMemoryCache.empresas = snapshot.docs.map(doc => doc.data() as Empresa);
    notifySubscribers();
  });

  // Real-time Users
  onSnapshot(collection(firestoreDb, 'usuarios'), (snapshot) => {
    inMemoryCache.usuarios = snapshot.docs.map(doc => doc.data() as Usuario);
    // Refresh session user if active
    if (inMemoryCache.activeSession) {
      const freshUser = inMemoryCache.usuarios.find(u => u.id === inMemoryCache.activeSession?.id);
      if (freshUser) {
        inMemoryCache.activeSession = freshUser;
      }
    }
    notifySubscribers();
  });

  // Real-time Drivers
  onSnapshot(collection(firestoreDb, 'drivers'), (snapshot) => {
    const driversByCompany: Record<string, Motorista[]> = {};
    snapshot.docs.forEach(doc => {
      const drv = doc.data() as Motorista;
      if (!driversByCompany[drv.companyId]) driversByCompany[drv.companyId] = [];
      driversByCompany[drv.companyId].push(drv);
    });
    inMemoryCache.drivers = driversByCompany;
    notifySubscribers();
  });

  // Real-time Vehicles
  onSnapshot(collection(firestoreDb, 'vehicles'), (snapshot) => {
    const vehiclesByCompany: Record<string, Veiculo[]> = {};
    snapshot.docs.forEach(doc => {
      const vec = doc.data() as Veiculo;
      if (!vehiclesByCompany[vec.companyId]) vehiclesByCompany[vec.companyId] = [];
      vehiclesByCompany[vec.companyId].push(vec);
    });
    inMemoryCache.vehicles = vehiclesByCompany;
    notifySubscribers();
  });

  // Real-time Deliveries
  onSnapshot(collection(firestoreDb, 'deliveries'), (snapshot) => {
    const deliveriesByCompany: Record<string, Entrega[]> = {};
    snapshot.docs.forEach(doc => {
      const del = doc.data() as Entrega;
      if (!deliveriesByCompany[del.companyId]) deliveriesByCompany[del.companyId] = [];
      deliveriesByCompany[del.companyId].push(del);
    });
    inMemoryCache.deliveries = deliveriesByCompany;
    notifySubscribers();
  });
}

function notifySubscribers() {
  inMemoryCache.subscribers.forEach(callback => callback());
}

// Trigger real-time listeners initialization
setupRealtimeListeners();

export const Database = {
  // Subscribe to real-time database changes across all devices
  subscribe(callback: () => void) {
    inMemoryCache.subscribers.add(callback);
    return () => inMemoryCache.subscribers.delete(callback);
  },

  // Clear session token only (no database data stored in LocalStorage!)
  clearAll() {
    localStorage.removeItem(JWT_TOKEN_KEY);
    inMemoryCache.activeSession = null;
    notifySubscribers();
  },

  // Get current session user from JWT token
  getCurrentSession(): Usuario | null {
    if (inMemoryCache.activeSession) return inMemoryCache.activeSession;

    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (!token) return null;

    try {
      // Decode JWT token payload
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));

      if (payload && payload.userId) {
        const user = inMemoryCache.usuarios.find(u => u.id === payload.userId && u.ativo);
        if (user) {
          inMemoryCache.activeSession = user;
          return user;
        }
      }
    } catch (e) {
      console.error('Failed to parse JWT token session:', e);
    }
    return null;
  },

  setCurrentSession(user: Usuario | null, token?: string) {
    inMemoryCache.activeSession = user;
    if (token) {
      localStorage.setItem(JWT_TOKEN_KEY, token);
    } else if (!user) {
      localStorage.removeItem(JWT_TOKEN_KEY);
    }
  },

  // Auth Functions - Central API Authentication with Backend / Firestore
  async login(email: string, password: string): Promise<{ success: boolean; user?: Usuario; token?: string; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'E-mail ou senha incorretos' };
      }

      // Save ONLY the JWT token in LocalStorage
      localStorage.setItem(JWT_TOKEN_KEY, data.token);
      inMemoryCache.activeSession = data.user;
      notifySubscribers();

      return { success: true, user: data.user, token: data.token };
    } catch (err) {
      console.error('Error connecting to login API, attempting direct Firestore query:', err);
      // Client-side fallback if server API is unavailable
      const cleanEmail = email.trim().toLowerCase();
      const q = query(collection(firestoreDb, 'usuarios'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'E-mail ou senha incorretos' };
      }

      const user = snap.docs[0].data() as Usuario;
      if (!user.ativo) {
        return { success: false, error: 'Sua conta está inativa. Contate o administrador.' };
      }

      if (user.senhaHash !== hashPassword(password)) {
        return { success: false, error: 'E-mail ou senha incorretos' };
      }

      inMemoryCache.activeSession = user;
      notifySubscribers();
      return { success: true, user };
    }
  },

  async registerCompany(companyName: string, adminName: string, adminEmail: string, adminPassword: string, adminPhone: string): Promise<{ success: boolean; user?: Usuario; token?: string; error?: string }> {
    try {
      const response = await fetch('/api/auth/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, adminName, adminEmail, adminPassword, adminPhone })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Erro ao registrar empresa' };
      }

      // Save ONLY the JWT token in LocalStorage
      localStorage.setItem(JWT_TOKEN_KEY, data.token);
      inMemoryCache.activeSession = data.user;
      notifySubscribers();

      return { success: true, user: data.user, token: data.token };
    } catch (err) {
      console.error('Error during company registration:', err);
      return { success: false, error: 'Erro de conexão ao registrar empresa' };
    }
  },

  recoverPassword(email: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    const user = inMemoryCache.usuarios.find(u => u.email === cleanEmail);
    if (!user) {
      return { success: false, message: 'Caso o e-mail exista em nossa base, uma mensagem de redefinição será enviada.' };
    }
    
    const newHash = hashPassword('123456');
    setDoc(doc(firestoreDb, 'usuarios', user.id), { senhaHash: newHash }, { merge: true });
    return { success: true, message: 'Senha recuperada e resetada temporariamente para "123456". Prossiga com o login e altere no perfil.' };
  },

  changePassword(userId: string, currentPass: string, newPass: string): { success: boolean; error?: string } {
    const user = inMemoryCache.usuarios.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Usuário não encontrado' };

    if (user.senhaHash !== hashPassword(currentPass)) {
      return { success: false, error: 'Senha atual incorreta' };
    }

    const newHash = hashPassword(newPass);
    setDoc(doc(firestoreDb, 'usuarios', userId), { senhaHash: newHash }, { merge: true });
    return { success: true };
  },

  updateProfile(userId: string, nome: string, email: string, telefone: string): { success: boolean; error?: string } {
    const user = inMemoryCache.usuarios.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Usuário não encontrado' };

    const cleanEmail = email.trim().toLowerCase();
    const emailExists = inMemoryCache.usuarios.find(u => u.email === cleanEmail && u.id !== userId);
    if (emailExists) return { success: false, error: 'E-mail já está em uso por outro usuário' };

    const updates = { nome, email: cleanEmail, telefone };
    setDoc(doc(firestoreDb, 'usuarios', userId), updates, { merge: true });

    if (inMemoryCache.activeSession && inMemoryCache.activeSession.id === userId) {
      inMemoryCache.activeSession = { ...inMemoryCache.activeSession, ...updates };
      notifySubscribers();
    }

    return { success: true };
  },

  // Multi-Company Query Isolation
  getCompany(companyId: string): Empresa | undefined {
    const found = inMemoryCache.empresas.find(e => e.id === companyId);
    if (found) return found;
    // Fallback company object if cache is loading
    return {
      id: companyId,
      nome: 'Empresa Logística',
      criadoEm: new Date().toISOString()
    };
  },

  getDeliveries(companyId: string): Entrega[] {
    return inMemoryCache.deliveries[companyId] || [];
  },

  getDrivers(companyId: string): Motorista[] {
    return inMemoryCache.drivers[companyId] || [];
  },

  getVehicles(companyId: string): Veiculo[] {
    return inMemoryCache.vehicles[companyId] || [];
  },

  getUsers(companyId: string): Usuario[] {
    return inMemoryCache.usuarios.filter(u => u.companyId === companyId);
  },

  // Asynchronous central data sync from backend API / Firestore
  async syncCompanyData(companyId: string): Promise<void> {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (!companyId) return;

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [delRes, drvRes, vecRes, usrRes] = await Promise.all([
        fetch(`/api/deliveries/${companyId}`, { headers }),
        fetch(`/api/drivers/${companyId}`, { headers }),
        fetch(`/api/vehicles/${companyId}`, { headers }),
        fetch(`/api/users/${companyId}`, { headers })
      ]);

      if (delRes.ok) {
        const dels = await delRes.json();
        inMemoryCache.deliveries[companyId] = dels;
      }
      if (drvRes.ok) {
        const drvs = await drvRes.json();
        inMemoryCache.drivers[companyId] = drvs;
      }
      if (vecRes.ok) {
        const vecs = await vecRes.json();
        inMemoryCache.vehicles[companyId] = vecs;
      }
      if (usrRes.ok) {
        const usrs = await usrRes.json();
        const otherUsers = inMemoryCache.usuarios.filter(u => u.companyId !== companyId);
        inMemoryCache.usuarios = [...otherUsers, ...usrs];
      }
      notifySubscribers();
    } catch (err) {
      console.error('Error syncing company data from API:', err);
    }
  },

  // Data Writing to Firestore & Express API Central Database
  async saveSingleDelivery(companyId: string, delivery: Entrega): Promise<Entrega> {
    const existing = inMemoryCache.deliveries[companyId] || [];
    const index = existing.findIndex(d => d.id === delivery.id);
    if (index >= 0) {
      existing[index] = delivery;
    } else {
      existing.unshift(delivery);
    }
    inMemoryCache.deliveries[companyId] = existing;
    notifySubscribers();

    // Direct Firestore write as primary client storage
    await setDoc(doc(firestoreDb, 'deliveries', delivery.id), { ...delivery, companyId });

    // API POST request to Express backend
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    try {
      const res = await fetch(`/api/deliveries/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(delivery)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.delivery) return data.delivery;
      }
    } catch (err) {
      console.warn('API saveSingleDelivery warning:', err);
    }

    return delivery;
  },

  saveDeliveries(companyId: string, deliveries: Entrega[]) {
    inMemoryCache.deliveries[companyId] = deliveries;
    notifySubscribers();

    // Sync to Firestore without triggering duplicate POST loops
    deliveries.forEach(del => {
      setDoc(doc(firestoreDb, 'deliveries', del.id), { ...del, companyId });
    });
  },

  saveDrivers(companyId: string, drivers: Motorista[]) {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    drivers.forEach(drv => {
      setDoc(doc(firestoreDb, 'drivers', drv.id), { ...drv, companyId });
      fetch(`/api/drivers/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(drv)
      }).catch(err => console.error('Error syncing driver via API:', err));
    });
  },

  saveVehicles(companyId: string, vehicles: Veiculo[]) {
    vehicles.forEach(vec => {
      setDoc(doc(firestoreDb, 'vehicles', vec.id), { ...vec, companyId });
    });
  },

  saveUsers(companyId: string, users: Usuario[]) {
    users.forEach(usr => {
      setDoc(doc(firestoreDb, 'usuarios', usr.id), { ...usr, companyId });
    });
  },

  // Driver Creation via Express API + Firestore
  async createDriver(companyId: string, driverData: Omit<Motorista, 'id' | 'companyId' | 'criadoEm'>): Promise<{ success: boolean; driver?: Motorista; user?: Usuario; error?: string }> {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    const driverId = 'drv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const fullDriver: Motorista = {
      ...driverData,
      id: driverId,
      companyId,
      criadoEm: new Date().toISOString()
    };

    try {
      // 1. Create Driver via Express API
      const response = await fetch(`/api/drivers/${companyId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(fullDriver)
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        await setDoc(doc(firestoreDb, 'drivers', driverId), fullDriver);
      }

      // 2. If email provided, create user account via Express API
      let createdUser: Usuario | undefined;
      if (driverData.email) {
        const userRes = await this.createUser(
          companyId,
          driverData.nome,
          driverData.email,
          '123456', // Default password
          'motorista',
          driverId
        );
        if (userRes.success) {
          createdUser = userRes.user;
        }
      }

      return { success: true, driver: data.driver || fullDriver, user: createdUser };
    } catch (err) {
      console.error('Error creating driver via API, falling back to client SDK:', err);
      await setDoc(doc(firestoreDb, 'drivers', driverId), fullDriver);
      if (driverData.email) {
        await this.createUser(companyId, driverData.nome, driverData.email, '123456', 'motorista', driverId);
      }
      return { success: true, driver: fullDriver };
    }
  },

  // Admin User Creation (For operators / drivers) via API + Firestore
  async createUser(companyId: string, nome: string, email: string, senha: string, role: UserRole, motoristaId?: string): Promise<{ success: boolean; user?: Usuario; error?: string }> {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    try {
      const response = await fetch(`/api/users/${companyId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ nome, email, senha, role, motoristaId })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Erro ao cadastrar usuário' };
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Error creating user via API, falling back to Firestore client SDK:', err);
      const cleanEmail = email.trim().toLowerCase();
      const exists = inMemoryCache.usuarios.find(u => u.email === cleanEmail);
      if (exists) {
        return { success: false, error: 'E-mail de usuário já está cadastrado' };
      }

      const userId = generateId('usr');
      const newUser: Usuario = {
        id: userId,
        companyId,
        nome,
        email: cleanEmail,
        senhaHash: hashPassword(senha),
        telefone: '',
        role,
        motoristaId,
        ativo: true,
        criadoEm: new Date().toISOString()
      };

      await setDoc(doc(firestoreDb, 'usuarios', userId), newUser);

      if (role === 'motorista' && motoristaId) {
        await setDoc(doc(firestoreDb, 'drivers', motoristaId), { userId }, { merge: true });
      }

      return { success: true, user: newUser };
    }
  },

  updateUserStatus(userId: string, ativo: boolean): boolean {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    const user = inMemoryCache.usuarios.find(u => u.id === userId);
    if (!user) return false;
    
    setDoc(doc(firestoreDb, 'usuarios', userId), { ativo }, { merge: true });
    
    fetch(`/api/users/${user.companyId}/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ ativo })
    }).catch(err => console.error('Error updating user status via API:', err));

    return true;
  },

  async updateDelivery(id: string, updates: Partial<Entrega>): Promise<boolean> {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    try {
      await setDoc(doc(firestoreDb, 'deliveries', id), updates, { merge: true });
      fetch(`/api/deliveries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(updates)
      }).catch(err => console.error('Error updating delivery via API:', err));
      return true;
    } catch (err) {
      console.error('Error updating delivery:', err);
      return false;
    }
  }
};
