import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase';
import { Empresa, Usuario, Motorista, Veiculo, Entrega, EntregaStatus, HistoricoStatus, UserRole, Cliente, RegistroAuditoria, StorageMetrics } from '../types';

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
  clients: {} as Record<string, Cliente[]>,     // key: companyId
  auditLogs: {} as Record<string, RegistroAuditoria[]>, // key: companyId
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

  // Real-time Clients
  onSnapshot(collection(firestoreDb, 'clientes'), (snapshot) => {
    const clientsByCompany: Record<string, Cliente[]> = {};
    snapshot.docs.forEach(doc => {
      const cli = doc.data() as Cliente;
      if (!clientsByCompany[cli.companyId]) clientsByCompany[cli.companyId] = [];
      clientsByCompany[cli.companyId].push(cli);
    });
    inMemoryCache.clients = clientsByCompany;
    notifySubscribers();
  });

  // Real-time Audit Logs
  onSnapshot(collection(firestoreDb, 'auditoria'), (snapshot) => {
    const auditByCompany: Record<string, RegistroAuditoria[]> = {};
    snapshot.docs.forEach(doc => {
      const aud = doc.data() as RegistroAuditoria;
      if (!auditByCompany[aud.companyId]) auditByCompany[aud.companyId] = [];
      auditByCompany[aud.companyId].push(aud);
    });
    inMemoryCache.auditLogs = auditByCompany;
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

    // Auto register or update client record in clientes list
    if (delivery.cliente && delivery.cliente.nome) {
      const currentClients = inMemoryCache.clients[companyId] || [];
      const existingClient = currentClients.find(c => 
        c.nome.trim().toLowerCase() === delivery.cliente.nome.trim().toLowerCase() ||
        (delivery.cliente.documento && c.documento === delivery.cliente.documento)
      );

      if (!existingClient) {
        const newClient: Cliente = {
          id: 'cli_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          companyId,
          nome: delivery.cliente.nome,
          telefone: delivery.cliente.telefone || '',
          whatsapp: delivery.cliente.whatsapp,
          documento: delivery.cliente.documento,
          endereco: delivery.endereco ? `${delivery.endereco.ruaNumero}, ${delivery.endereco.numero}` : '',
          bairro: delivery.endereco?.bairro || '',
          cidade: delivery.endereco?.cidade || '',
          cep: delivery.endereco?.cep || '',
          ativo: true,
          criadoEm: new Date().toISOString()
        };
        this.saveClient(companyId, newClient).catch(err => console.warn('Auto client save warning:', err));
      }
    }

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
  },

  async deleteDelivery(companyId: string, deliveryId: string, options?: { deleteFiles?: boolean; motivo?: string; usuarioNome?: string; usuarioId?: string }): Promise<{ success: boolean; error?: string }> {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    try {
      // 1. Delete directly from Firestore so real-time listeners trigger across all client instances
      await deleteDoc(doc(firestoreDb, 'deliveries', deliveryId)).catch(() => {});

      // 2. Update local cache immediately
      if (inMemoryCache.deliveries[companyId]) {
        inMemoryCache.deliveries[companyId] = inMemoryCache.deliveries[companyId].filter(d => d.id !== deliveryId);
        notifySubscribers();
      }

      // 3. Request API deletion for server validation and Audit Log creation
      fetch(`/api/deliveries/${companyId}/${deliveryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(options || {})
      }).catch(err => console.warn('Error calling API deleteDelivery:', err));

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting delivery:', err);
      return { success: false, error: err?.message || 'Erro ao excluir entrega.' };
    }
  },

  // CLIENTS MANAGEMENT
  getClients(companyId: string): Cliente[] {
    return inMemoryCache.clients[companyId] || [];
  },

  async saveClient(companyId: string, clientData: Partial<Cliente> & { nome: string; telefone: string }): Promise<Cliente> {
    const clientId = clientData.id || ('cli_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const fullClient: Cliente = {
      id: clientId,
      companyId,
      nome: clientData.nome,
      telefone: clientData.telefone || '',
      whatsapp: clientData.whatsapp,
      documento: clientData.documento,
      email: clientData.email,
      endereco: clientData.endereco,
      bairro: clientData.bairro,
      cidade: clientData.cidade,
      cep: clientData.cep,
      ativo: clientData.ativo !== undefined ? clientData.ativo : true,
      criadoEm: clientData.criadoEm || new Date().toISOString()
    };

    await setDoc(doc(firestoreDb, 'clientes', clientId), fullClient, { merge: true });

    const token = localStorage.getItem(JWT_TOKEN_KEY);
    fetch(`/api/clients/${companyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(fullClient)
    }).catch(err => console.warn('Error saving client via API:', err));

    return fullClient;
  },

  async deleteClient(companyId: string, clientId: string): Promise<{ success: boolean; error?: string; message?: string; activeDeliveries?: string[] }> {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    try {
      const response = await fetch(`/api/clients/${companyId}/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Erro ao excluir cliente.' };
      }

      await deleteDoc(doc(firestoreDb, 'clientes', clientId)).catch(() => {});
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error('Error deleting client:', err);
      return { success: false, error: err.message || 'Erro de comunicação com o servidor para exclusão.' };
    }
  },

  // AUDIT TRAIL LOGS
  getAuditLogs(companyId: string): RegistroAuditoria[] {
    return inMemoryCache.auditLogs[companyId] || [];
  },

  // BULK CLIENT CLEANUP FOR ADMINS
  async bulkCleanupClients(companyId: string, startDate: string, endDate: string, mode: 'only_without_deliveries' | 'all_with_history'): Promise<{ success: boolean; clientsRemovedCount?: number; deliveriesRemovedCount?: number; freedFormatted?: string; error?: string; message?: string }> {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    try {
      const response = await fetch(`/api/admin/bulk-cleanup-clients/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ startDate, endDate, mode })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Erro na limpeza em massa do banco.' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro na requisição de limpeza em massa.' };
    }
  },

  // STORAGE MONITOR METRICS
  async getStorageMetrics(companyId: string): Promise<StorageMetrics> {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    try {
      const response = await fetch(`/api/storage-metrics/${companyId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (e) {
      console.warn('Fallback calculating storage metrics on client:', e);
    }

    const clients = inMemoryCache.clients[companyId] || [];
    const deliveries = inMemoryCache.deliveries[companyId] || [];
    const drivers = inMemoryCache.drivers[companyId] || [];
    const auditLogs = inMemoryCache.auditLogs[companyId] || [];

    const totalClientes = clients.length;
    const totalClientesAtivos = clients.filter(c => c.ativo !== false).length;
    let totalClientesExcluidos = 0;
    auditLogs.filter(a => a.tipoAcao === 'exclusao_cliente' || a.tipoAcao === 'exclusao_massa_clientes').forEach(a => {
      if (a.tipoAcao === 'exclusao_cliente') totalClientesExcluidos++;
      else if (a.detalhes?.qtdClientesRemovidos) totalClientesExcluidos += a.detalhes.qtdClientesRemovidos;
    });

    const totalEntregas = deliveries.length;
    let totalComprovantes = 0;
    let totalFotos = 0;
    let totalDocumentos = 0;

    deliveries.forEach(d => {
      if (d.numeroNF) totalDocumentos++;
      if (d.comprovante) {
        totalComprovantes++;
        if (d.comprovante.assinaturaUrl) totalFotos++;
        if (d.comprovante.fotoProdutoUrl) totalFotos++;
        if (d.comprovante.fotoFachadaUrl) totalFotos++;
      }
    });

    drivers.forEach(drv => {
      if (drv.fotoPerfilUrl) totalFotos++;
      if (drv.cnh) totalDocumentos++;
    });

    let totalBytes = 0;
    clients.forEach(c => totalBytes += JSON.stringify(c).length);
    deliveries.forEach(d => totalBytes += JSON.stringify(d).length);
    drivers.forEach(drv => totalBytes += JSON.stringify(drv).length);

    const totalMB = totalBytes / (1024 * 1024);
    const espacoUtilizadoFormatted = totalMB < 1 ? `${(totalBytes / 1024).toFixed(1)} KB` : `${totalMB.toFixed(2)} MB`;

    return {
      totalClientes,
      totalClientesAtivos,
      totalClientesExcluidos,
      totalEntregas,
      totalComprovantes,
      totalFotos,
      totalDocumentos,
      espacoUtilizadoBytes: totalBytes,
      espacoUtilizadoFormatted,
      percentualUso: Math.min(100, Math.max(1, Math.round((totalBytes / (50 * 1024 * 1024)) * 100)))
    };
  }
};
