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

// Simple hashing function for password validation
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

// JWT Token session key
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

// Seed initial database in Firestore if empty
async function seedFirestoreIfNeeded() {
  try {
    const empSnap = await getDocs(collection(firestoreDb, 'empresas'));
    if (empSnap.empty) {
      const companyId = 'emp_teste_001';
      const company: Empresa = {
        id: companyId,
        nome: 'Empresa Teste Logística',
        criadoEm: new Date().toISOString()
      };

      const masterUser: Usuario = {
        id: 'usr_master_001',
        companyId,
        nome: 'Administrador Master',
        email: 'master@fastlog.com',
        senhaHash: hashPassword('123456'),
        telefone: '(11) 99999-9999',
        role: 'master',
        ativo: true,
        criadoEm: new Date().toISOString()
      };

      const adminUser: Usuario = {
        id: 'usr_admin_001',
        companyId,
        nome: 'Administrador Empresa',
        email: 'admin@empresa.com',
        senhaHash: hashPassword('123456'),
        telefone: '(11) 98888-8888',
        role: 'admin',
        ativo: true,
        criadoEm: new Date().toISOString()
      };

      const driverId = 'drv_mateus_001';
      const driverUser: Usuario = {
        id: 'usr_mateus_001',
        companyId,
        nome: 'Mateus Entregador',
        email: 'mateus@empresa.com',
        senhaHash: hashPassword('123456'),
        telefone: '(11) 97777-7777',
        role: 'motorista',
        motoristaId: driverId,
        ativo: true,
        criadoEm: new Date().toISOString()
      };

      const driver: Motorista = {
        id: driverId,
        userId: driverUser.id,
        companyId,
        nome: 'Mateus Entregador',
        cpf: '123.456.789-00',
        telefone: '(11) 98888-7777',
        email: 'mateus@empresa.com',
        cnh: '12345678900',
        categoriaCNH: 'B',
        validadeCNH: '2028-12-31',
        ativo: true,
        criadoEm: new Date().toISOString()
      };

      const vehicle: Veiculo = {
        id: 'vec_001',
        companyId,
        placa: 'ABC-1234',
        modelo: 'Fiorino 1.4 EVO',
        tipo: 'van',
        ativo: true
      };

      const delivery: Entrega = {
        id: 'ent_001',
        companyId,
        numeroNF: '1001',
        numeroPedido: 'PED-5001',
        cliente: {
          nome: 'Cliente Teste Mercado S.A.',
          telefone: '(11) 97777-6666'
        },
        endereco: {
          ruaNumero: 'Av. Paulista',
          numero: '1500',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          cep: '01310-200',
          latitude: -23.5615,
          longitude: -46.6560
        },
        volumes: 2,
        valorVenda: 250.00,
        formaPagamento: 'pix',
        statusPagamento: 'pago',
        status: 'aguardando_motorista',
        motoristaId: driverId,
        entregadorId: driverUser.id,
        entregadorNome: driver.nome,
        dataEntregaPrevista: new Date().toISOString().split('T')[0],
        prioridade: 'media',
        criadoPor: adminUser.nome,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        origem: 'manual',
        historico: [
          {
            id: 'hist_001',
            statusAnterior: 'venda_realizada',
            statusNovo: 'aguardando_motorista',
            alteradoPor: adminUser.nome,
            alteradoEm: new Date().toISOString(),
            motivo: 'Pedido criado e atribuído ao entregador Mateus'
          }
        ]
      };

      await setDoc(doc(firestoreDb, 'empresas', companyId), company);
      await setDoc(doc(firestoreDb, 'usuarios', masterUser.id), masterUser);
      await setDoc(doc(firestoreDb, 'usuarios', adminUser.id), adminUser);
      await setDoc(doc(firestoreDb, 'usuarios', driverUser.id), driverUser);
      await setDoc(doc(firestoreDb, 'drivers', driverId), driver);
      await setDoc(doc(firestoreDb, 'vehicles', vehicle.id), vehicle);
      await setDoc(doc(firestoreDb, 'deliveries', delivery.id), delivery);
    }
  } catch (err) {
    console.error('Error seeding Firestore:', err);
  }
}

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

// Trigger initial seed and real-time listeners
seedFirestoreIfNeeded().then(() => setupRealtimeListeners());

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

  setCurrentSession(user: Usuario | null) {
    inMemoryCache.activeSession = user;
    if (user) {
      // Create lightweight JWT token for session
      const header = window.btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = window.btoa(JSON.stringify({ 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        companyId: user.companyId,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      }));
      const mockSignature = 'signature';
      const token = `${header}.${payload}.${mockSignature}`;
      localStorage.setItem(JWT_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(JWT_TOKEN_KEY);
    }
  },

  // Auth Functions with Firestore Real-Time Persistence
  login(email: string, password: string): { success: boolean; user?: Usuario; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const user = inMemoryCache.usuarios.find(u => u.email === cleanEmail);

    if (!user) {
      return { success: false, error: 'E-mail ou senha incorretos' };
    }

    if (!user.ativo) {
      return { success: false, error: 'Sua conta está inativa. Contate o administrador.' };
    }

    const hashed = hashPassword(password);
    if (user.senhaHash !== hashed) {
      return { success: false, error: 'E-mail ou senha incorretos' };
    }

    // Update last login in Firestore
    const updatedUser = { ...user, ultimoLogin: new Date().toISOString() };
    setDoc(doc(firestoreDb, 'usuarios', user.id), updatedUser, { merge: true });

    this.setCurrentSession(updatedUser);
    return { success: true, user: updatedUser };
  },

  registerCompany(companyName: string, adminName: string, adminEmail: string, adminPassword: string, adminPhone: string): { success: boolean; user?: Usuario; error?: string } {
    const cleanEmail = adminEmail.trim().toLowerCase();

    const exists = inMemoryCache.usuarios.find(u => u.email === cleanEmail);
    if (exists) {
      return { success: false, error: 'E-mail já cadastrado no sistema.' };
    }

    const companyId = generateId('emp');
    const newCompany: Empresa = {
      id: companyId,
      nome: companyName,
      criadoEm: new Date().toISOString()
    };

    const adminId = generateId('usr');
    const newAdmin: Usuario = {
      id: adminId,
      companyId,
      nome: adminName,
      email: cleanEmail,
      senhaHash: hashPassword(adminPassword),
      telefone: adminPhone,
      role: 'admin',
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    // Save to real Firestore DB
    setDoc(doc(firestoreDb, 'empresas', companyId), newCompany);
    setDoc(doc(firestoreDb, 'usuarios', adminId), newAdmin);

    this.setCurrentSession(newAdmin);
    return { success: true, user: newAdmin };
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
      this.setCurrentSession({ ...inMemoryCache.activeSession, ...updates });
    }

    return { success: true };
  },

  // Multi-Company Query Isolation
  getCompany(companyId: string): Empresa | undefined {
    return inMemoryCache.empresas.find(e => e.id === companyId);
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

  // Data Writing to Firestore
  saveDeliveries(companyId: string, deliveries: Entrega[]) {
    // Update or insert each delivery into Firestore
    deliveries.forEach(del => {
      setDoc(doc(firestoreDb, 'deliveries', del.id), { ...del, companyId });
    });
  },

  saveDrivers(companyId: string, drivers: Motorista[]) {
    drivers.forEach(drv => {
      setDoc(doc(firestoreDb, 'drivers', drv.id), { ...drv, companyId });
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

  // Admin User Creation (For operators / drivers)
  createUser(companyId: string, nome: string, email: string, senha: string, role: UserRole, motoristaId?: string): { success: boolean; user?: Usuario; error?: string } {
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

    setDoc(doc(firestoreDb, 'usuarios', userId), newUser);

    // Sync with driver profile if motorista
    if (role === 'motorista' && motoristaId) {
      setDoc(doc(firestoreDb, 'drivers', motoristaId), { userId }, { merge: true });
    }

    return { success: true, user: newUser };
  },

  updateUserStatus(userId: string, ativo: boolean): boolean {
    const user = inMemoryCache.usuarios.find(u => u.id === userId);
    if (!user) return false;
    setDoc(doc(firestoreDb, 'usuarios', userId), { ativo }, { merge: true });
    return true;
  }
};
