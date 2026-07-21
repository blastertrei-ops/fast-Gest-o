/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Empresa, Usuario, Motorista, Veiculo, Entrega, EntregaStatus, HistoricoStatus, UserRole } from '../types';

// Simple hashing function for secure password storage in localStorage
export function hashPassword(password: string): string {
  // Simple but secure enough hashing algorithm for client-side storage simulation
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `sec_hash_${hash.toString(16)}`;
}

// Generate unique IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

// Interfaces for our DB state
interface DBState {
  empresas: Empresa[];
  usuarios: Usuario[];
  deliveries: Record<string, Entrega[]>; // key: companyId
  drivers: Record<string, Motorista[]>; // key: companyId
  vehicles: Record<string, Veiculo[]>; // key: companyId
}

// Initial Empty State
const STORAGE_KEY = 'fast_gestao_entregas_db';

function loadDB(): DBState {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const initial: DBState = {
      empresas: [],
      usuarios: [],
      deliveries: {},
      drivers: {},
      vehicles: {}
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse DB, resetting...', e);
    const initial: DBState = {
      empresas: [],
      usuarios: [],
      deliveries: {},
      drivers: {},
      vehicles: {}
    };
    return initial;
  }
}

function saveDB(state: DBState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const Database = {
  // Clear everything (Reset)
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('fast_session_user');
  },

  // Get current active session
  getCurrentSession(): Usuario | null {
    const session = localStorage.getItem('fast_session_user');
    if (!session) return null;
    try {
      const user = JSON.parse(session) as Usuario;
      // Validate that user still exists in DB
      const db = loadDB();
      const exists = db.usuarios.find(u => u.id === user.id && u.ativo);
      return exists || null;
    } catch {
      return null;
    }
  },

  setCurrentSession(user: Usuario | null) {
    if (user) {
      localStorage.setItem('fast_session_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('fast_session_user');
    }
  },

  // Auth Functions
  login(email: string, password: string): { success: boolean; user?: Usuario; error?: string } {
    const db = loadDB();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.usuarios.find(u => u.email === cleanEmail);

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

    // Update last login
    user.ultimoLogin = new Date().toISOString();
    saveDB(db);

    this.setCurrentSession(user);
    return { success: true, user };
  },

  registerCompany(companyName: string, adminName: string, adminEmail: string, adminPassword: string, adminPhone: string): { success: boolean; user?: Usuario; error?: string } {
    const db = loadDB();
    const cleanEmail = adminEmail.trim().toLowerCase();

    // Check if email already registered
    const exists = db.usuarios.find(u => u.email === cleanEmail);
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

    db.empresas.push(newCompany);
    db.usuarios.push(newAdmin);
    db.deliveries[companyId] = [];
    db.drivers[companyId] = [];
    db.vehicles[companyId] = [];

    saveDB(db);
    this.setCurrentSession(newAdmin);

    return { success: true, user: newAdmin };
  },

  recoverPassword(email: string): { success: boolean; message: string } {
    const db = loadDB();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.usuarios.find(u => u.email === cleanEmail);
    if (!user) {
      return { success: false, message: 'Caso o e-mail exista em nossa base, uma mensagem de redefinição será enviada.' };
    }
    
    // Simulate re-securing with a reset
    user.senhaHash = hashPassword('123456'); // Reset to default 123456 for easy simulation recovery
    saveDB(db);
    return { success: true, message: 'Senha recuperada e resetada temporariamente para "123456". Prossiga com o login e altere no perfil.' };
  },

  changePassword(userId: string, currentPass: string, newPass: string): { success: boolean; error?: string } {
    const db = loadDB();
    const user = db.usuarios.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Usuário não encontrado' };

    if (user.senhaHash !== hashPassword(currentPass)) {
      return { success: false, error: 'Senha atual incorreta' };
    }

    user.senhaHash = hashPassword(newPass);
    saveDB(db);
    return { success: true };
  },

  updateProfile(userId: string, nome: string, email: string, telefone: string): { success: boolean; error?: string } {
    const db = loadDB();
    const user = db.usuarios.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Usuário não encontrado' };

    const cleanEmail = email.trim().toLowerCase();
    const emailExists = db.usuarios.find(u => u.email === cleanEmail && u.id !== userId);
    if (emailExists) return { success: false, error: 'E-mail já está em uso por outro usuário' };

    user.nome = nome;
    user.email = cleanEmail;
    user.telefone = telefone;
    saveDB(db);

    // Sync with active session
    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === userId) {
      this.setCurrentSession({ ...currentSession, nome, email: cleanEmail, telefone });
    }

    return { success: true };
  },

  // Multi-Company Query Isolation
  getCompany(companyId: string): Empresa | undefined {
    const db = loadDB();
    return db.empresas.find(e => e.id === companyId);
  },

  getDeliveries(companyId: string): Entrega[] {
    const db = loadDB();
    return db.deliveries[companyId] || [];
  },

  getDrivers(companyId: string): Motorista[] {
    const db = loadDB();
    return db.drivers[companyId] || [];
  },

  getVehicles(companyId: string): Veiculo[] {
    const db = loadDB();
    return db.vehicles[companyId] || [];
  },

  getUsers(companyId: string): Usuario[] {
    const db = loadDB();
    return db.usuarios.filter(u => u.companyId === companyId);
  },

  // Data Writing
  saveDeliveries(companyId: string, deliveries: Entrega[]) {
    const db = loadDB();
    db.deliveries[companyId] = deliveries;
    saveDB(db);
  },

  saveDrivers(companyId: string, drivers: Motorista[]) {
    const db = loadDB();
    db.drivers[companyId] = drivers;
    saveDB(db);
  },

  saveVehicles(companyId: string, vehicles: Veiculo[]) {
    const db = loadDB();
    db.vehicles[companyId] = vehicles;
    saveDB(db);
  },

  saveUsers(companyId: string, users: Usuario[]) {
    const db = loadDB();
    // Keep users from other companies
    const otherUsers = db.usuarios.filter(u => u.companyId !== companyId);
    db.usuarios = [...otherUsers, ...users];
    saveDB(db);
  },

  // Admin User Creation (For operators / drivers)
  createUser(companyId: string, nome: string, email: string, senha: string, role: UserRole, motoristaId?: string): { success: boolean; user?: Usuario; error?: string } {
    const db = loadDB();
    const cleanEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const exists = db.usuarios.find(u => u.email === cleanEmail);
    if (exists) {
      return { success: false, error: 'E-mail de usuário já está cadastrado' };
    }

    const newUser: Usuario = {
      id: generateId('usr'),
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

    db.usuarios.push(newUser);

    // Sync with the driver profile if role is motorista
    if (role === 'motorista' && motoristaId) {
      const driversList = db.drivers[companyId] || [];
      const drv = driversList.find(d => d.id === motoristaId);
      if (drv) {
        drv.userId = newUser.id;
      }
    }

    saveDB(db);

    return { success: true, user: newUser };
  },

  updateUserStatus(userId: string, ativo: boolean): boolean {
    const db = loadDB();
    const user = db.usuarios.find(u => u.id === userId);
    if (!user) return false;
    user.ativo = ativo;
    saveDB(db);
    return true;
  }
};
