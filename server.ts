import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// The server is the sole Firestore client.  Credentials must never be shipped to
// the browser; use Application Default Credentials or FIREBASE_SERVICE_ACCOUNT_JSON.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : undefined;
const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });
const firestoreDb = getFirestore(firebaseApp);

// Compatibility helpers keep the existing repository code explicit while using
// Firebase Admin (and therefore bypassing client Firestore rules on the server).
const collection = (db: FirebaseFirestore.Firestore, name: string) => db.collection(name);
const doc = (db: FirebaseFirestore.Firestore, name: string, id: string) => db.collection(name).doc(id);
const getDoc = async (ref: FirebaseFirestore.DocumentReference): Promise<any> => {
  const snapshot = await ref.get();
  // Preserve the former client-SDK `exists()` call shape while retaining the
  // Admin SDK as the actual database implementation.
  return { ref: snapshot.ref, exists: () => snapshot.exists, data: () => snapshot.data() };
};
const setDoc = (ref: FirebaseFirestore.DocumentReference, data: any, options?: FirebaseFirestore.SetOptions) => ref.set(data, options);
const updateDoc = (ref: FirebaseFirestore.DocumentReference, data: any) => ref.update(data);
const deleteDoc = (ref: FirebaseFirestore.DocumentReference) => ref.delete();
const getDocs = (ref: FirebaseFirestore.Query) => ref.get();
const where = (field: string, operator: FirebaseFirestore.WhereFilterOp, value: unknown) => ({ field, operator, value });
const query = (ref: FirebaseFirestore.Query, ...filters: ReturnType<typeof where>[]) =>
  filters.reduce((current, filter) => current.where(filter.field, filter.operator, filter.value), ref);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET é obrigatório e deve ter no mínimo 32 caracteres.');
}

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || '')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));
app.use(express.json({ limit: '1mb' }));

// Interface definitions
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

interface ApiUser {
  id: string;
  companyId: string;
  organizationId?: string;
  tenantId?: string;
  nome: string;
  email: string;
  senhaHash: string;
  telefone?: string;
  role: string;
  permissoesCustomizadas?: any;
  motoristaId?: string;
  ativo: boolean;
  criadoEm: string;
  ultimoLogin?: string;
}

interface ApiCompany {
  id: string;
  nome: string;
  criadoEm: string;
}

interface ApiDriver {
  id: string;
  userId?: string;
  companyId: string;
  nome: string;
  cpf: string;
  telefone: string;
  email?: string;
  cnh?: string;
  categoriaCNH?: string;
  validadeCNH?: string;
  ativo: boolean;
  criadoEm: string;
}

interface ApiVehicle {
  id: string;
  companyId: string;
  placa: string;
  modelo: string;
  tipo: string;
  ativo: boolean;
}

interface ApiDelivery {
  id: string;
  companyId: string;
  numeroNF: string;
  numeroPedido: string;
  cliente: {
    nome: string;
    telefone: string;
    whatsapp?: string;
    documento?: string;
    email?: string;
  };
  endereco: {
    ruaNumero: string;
    numero: string;
    bairro: string;
    cidade: string;
    cep: string;
    latitude?: number;
    longitude?: number;
  };
  volumes: number;
  valorVenda: number;
  formaPagamento: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'faturado';
  statusPagamento: 'pendente' | 'pago';
  status: string;
  motoristaId?: string;
  entregadorId?: string;
  entregadorNome?: string;
  dataEntregaPrevista: string;
  prioridade: 'baixa' | 'media' | 'alta';
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
  iniciadoEm?: string;
  origem: string;
  comprovante?: any;
  historico: any[];
}

// Legacy hashes are accepted once during login and immediately upgraded to bcrypt.
// This must only be used for migration; never for storing a new password.
function legacyHashPassword(pass: string): string {
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sec_hash_${hash.toString(16)}`;
}

function isLegacyHash(value: string): boolean {
  return value.startsWith('sec_hash_');
}

async function verifyAndMigratePassword(user: ApiUser, password: string): Promise<boolean> {
  const valid = isLegacyHash(user.senhaHash)
    ? user.senhaHash === legacyHashPassword(password)
    : await bcrypt.compare(password, user.senhaHash);
  if (valid && isLegacyHash(user.senhaHash)) {
    const senhaHash = await bcrypt.hash(password, 12);
    await updateDoc(doc(firestoreDb, 'usuarios', user.id), { senhaHash });
    user.senhaHash = senhaHash;
  }
  return valid;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Recursive sanitizer to strip `undefined` fields for Firestore compatibility
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Middleware: Authenticate JWT Token
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

const roleAliases: Record<string, string> = { entregador: 'motorista', driver: 'motorista' };
const rolePermissions: Record<string, ReadonlySet<string>> = {
  master: new Set(['*']),
  admin: new Set([
    'company:read', 'deliveries:read', 'deliveries:write', 'deliveries:delete',
    'drivers:read', 'drivers:write', 'vehicles:read', 'vehicles:write',
    'users:read', 'users:write', 'clients:read', 'clients:write', 'clients:delete',
    'audit:read', 'storage:read', 'locations:read', 'locations:write', 'routes:read', 'routes:write'
  ]),
  operador: new Set([
    'company:read', 'deliveries:read', 'deliveries:write', 'drivers:read',
    'vehicles:read', 'clients:read', 'clients:write', 'locations:read', 'routes:read'
  ]),
  motorista: new Set(['company:read', 'deliveries:read', 'deliveries:own-write', 'locations:write', 'routes:write'])
};

function canonicalRole(role: string): string {
  return roleAliases[role] || role;
}

function hasPermission(role: string, permission: string): boolean {
  const permissions = rolePermissions[canonicalRole(role)];
  return Boolean(permissions?.has('*') || permissions?.has(permission));
}

function canAssignRole(actorRole: string, targetRole: string): boolean {
  const actor = canonicalRole(actorRole);
  const target = canonicalRole(targetRole);
  if (actor === 'master') return ['master', 'admin', 'operador', 'motorista'].includes(target);
  return actor === 'admin' && ['admin', 'operador', 'motorista'].includes(target);
}

function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.map(canonicalRole).includes(canonicalRole(req.user.role))) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

function requireCompanyAccess(req: Request, res: Response, next: NextFunction) {
  const companyId = req.params.companyId;
  if (!req.user || !companyId) return res.status(401).json({ error: 'Não autorizado' });
  if (req.user.role !== 'master' && req.user.companyId !== companyId) {
    return res.status(403).json({ error: 'Acesso negado para esta empresa.' });
  }
  next();
}

async function hasDocumentCompanyAccess(req: Request, res: Response, collectionName: string, id: string): Promise<boolean> {
  const snapshot = await getDoc(doc(firestoreDb, collectionName, id));
  if (!snapshot.exists()) {
    res.status(404).json({ error: 'Registro não encontrado.' });
    return false;
  }
  const data = snapshot.data() as { companyId?: string };
  if (req.user?.role !== 'master' && data.companyId !== req.user?.companyId) {
    res.status(403).json({ error: 'Acesso negado para este registro.' });
    return false;
  }
  return true;
}

const tenantFields = new Set(['companyId', 'organizationId', 'tenantId']);
function withoutTenantFields(data: any): any {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !tenantFields.has(key)));
}

async function belongsToCompany(collectionName: string, id: string, companyId: string): Promise<boolean> {
  const snapshot = await getDoc(doc(firestoreDb, collectionName, id));
  return snapshot.exists() && snapshot.data()?.companyId === companyId;
}

async function validateCompanyReferences(res: Response, companyId: string, data: Record<string, unknown>): Promise<boolean> {
  const references: Array<[string, unknown, string]> = [
    ['drivers', data.motoristaId, 'motorista'],
    ['drivers', data.driverId, 'motorista'],
    ['usuarios', data.entregadorId, 'entregador'],
    ['usuarios', data.userId, 'usuário vinculado'],
    ['deliveries', data.deliveryId, 'entrega']
  ];
  for (const [collectionName, id, label] of references) {
    if (typeof id === 'string' && !(await belongsToCompany(collectionName, id, companyId))) {
      res.status(400).json({ error: `O ${label} informado não pertence a esta empresa.` });
      return false;
    }
  }
  return true;
}

async function canDriverAccessDelivery(userId: string, delivery: ApiDelivery): Promise<boolean> {
  const snapshot = await getDoc(doc(firestoreDb, 'usuarios', userId));
  if (!snapshot.exists()) return false;
  const user = snapshot.data() as ApiUser;
  return delivery.entregadorId === userId || delivery.motoristaId === user.motoristaId;
}

async function requireDeliveryWriteAccess(req: Request, res: Response, delivery: ApiDelivery): Promise<boolean> {
  if (canonicalRole(req.user?.role || '') !== 'motorista') return true;
  if (!(await canDriverAccessDelivery(req.user!.userId, delivery))) {
    res.status(403).json({ error: 'Entregadores só podem atualizar entregas atribuídas a si.' });
    return false;
  }
  return true;
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`;
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return next();
  }
  if (current.count >= 8) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  current.count += 1;
  next();
}

// ---------------- API ROUTES ----------------

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth API Routes (Central Firestore Authentication)
app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    
    // Query central Firestore usuarios collection
    const q = query(collection(firestoreDb, 'usuarios'), where('email', '==', cleanEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data() as ApiUser;

    if (!user.ativo) {
      return res.status(403).json({ error: 'Conta inativa. Contate o administrador.' });
    }

    if (!(await verifyAndMigratePassword(user, String(password)))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    // Check company status for non-master users
    if (user.role !== 'master' && user.companyId) {
      const companySnap = await getDoc(doc(firestoreDb, 'empresas', user.companyId));
      if (companySnap.exists()) {
        const compData = companySnap.data();
        const status = compData.status || 'ativa';
        const dataVenc = compData.dataVencimento;

        let isExpired = false;
        if (dataVenc) {
          const vencDate = new Date(dataVenc);
          const now = new Date();
          if (!isNaN(vencDate.getTime()) && vencDate < now) {
            isExpired = true;
          }
        }

        if (status === 'suspensa' || status === 'bloqueada' || status === 'cancelada' || isExpired) {
          return res.status(403).json({ 
            error: 'Seu acesso está temporariamente suspenso. Entre em contato com o administrador da plataforma.' 
          });
        }
      }
    }

    const ultimoLogin = new Date().toISOString();
    await updateDoc(doc(firestoreDb, 'usuarios', user.id), { ultimoLogin });
    user.ultimoLogin = ultimoLogin;

    // Create JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { senhaHash, ...userWithoutPassword } = user;
    return res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (err: any) {
    console.error('Erro no endpoint /api/auth/login:', err);
    return res.status(500).json({ error: 'Erro ao realizar login no banco central: ' + (err?.message || String(err)) });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Não autorizado' });

    const userSnap = await getDoc(doc(firestoreDb, 'usuarios', userId));
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userSnap.data() as ApiUser;
    const { senhaHash, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    console.error('Erro em /api/auth/me:', err);
    return res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

// Password recovery deliberately does not reset to a shared default password.
// Delivery of the generated one-time token belongs to the configured mail service.
app.post('/api/auth/recover-password', loginRateLimit, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email) {
    const users = await getDocs(query(collection(firestoreDb, 'usuarios'), where('email', '==', email)));
    if (!users.empty) {
      const token = await bcrypt.hash(`${crypto.randomUUID()}:${Date.now()}`, 12);
      await updateDoc(users.docs[0].ref, {
        passwordResetTokenHash: token,
        passwordResetExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString()
      });
      // Do not expose the token. A production mail provider consumes this record.
    }
  }
  return res.json({ success: true, message: 'Caso o e-mail exista em nossa base, uma mensagem de redefinição será enviada.' });
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 12) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 12 caracteres.' });
  }
  const userRef = doc(firestoreDb, 'usuarios', req.user!.userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const user = snapshot.data() as ApiUser;
  if (!(await verifyAndMigratePassword(user, currentPassword))) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }
  await updateDoc(userRef, { senhaHash: await hashPassword(newPassword) });
  return res.json({ success: true });
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { nome, email, telefone } = req.body || {};
  const updates: Record<string, string> = {};
  if (typeof nome === 'string') updates.nome = nome.trim();
  if (typeof telefone === 'string') updates.telefone = telefone.trim();
  if (typeof email === 'string') updates.email = email.trim().toLowerCase();
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nenhum dado válido foi informado.' });
  await updateDoc(doc(firestoreDb, 'usuarios', req.user!.userId), updates);
  return res.json({ success: true, user: { ...req.user, ...updates } });
});

app.post('/api/auth/register-company', async (req, res) => {
  try {
    const { companyName, adminName, adminEmail, adminPassword, adminPhone } = req.body;

    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    const cleanEmail = String(adminEmail).trim().toLowerCase();
    
    // Check if email already exists in central Firestore
    const q = query(collection(firestoreDb, 'usuarios'), where('email', '==', cleanEmail));
    const existing = await getDocs(q);
    if (!existing.empty) {
      return res.status(400).json({ error: 'E-mail já cadastrado no sistema.' });
    }

    const companyId = 'emp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newCompany: ApiCompany = {
      id: companyId,
      nome: companyName,
      criadoEm: new Date().toISOString()
    };

    const adminId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newAdmin: ApiUser = {
      id: adminId,
      companyId,
      nome: adminName,
      email: cleanEmail,
      senhaHash: await hashPassword(adminPassword),
      telefone: adminPhone || '',
      role: 'admin',
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    await setDoc(doc(firestoreDb, 'empresas', companyId), newCompany);
    await setDoc(doc(firestoreDb, 'usuarios', adminId), newAdmin);

    const token = jwt.sign(
      { userId: newAdmin.id, email: newAdmin.email, role: newAdmin.role, companyId: newAdmin.companyId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { senhaHash, ...userWithoutPassword } = newAdmin;
    return res.json({ success: true, token, user: userWithoutPassword });
  } catch (err) {
    console.error('Erro em /api/auth/register-company:', err);
    return res.status(500).json({ error: 'Erro ao registrar empresa e usuário administrador' });
  }
});

// MASTER PANEL (SUPER ADMIN) ROUTES
app.get('/api/master/companies', authenticateToken, requireRole('master'), async (req, res) => {
  try {
    const snap = await getDocs(collection(firestoreDb, 'empresas'));
    const companies = snap.docs.map(d => d.data());
    return res.json({ success: true, companies });
  } catch (err) {
    console.error('Erro ao buscar empresas:', err);
    return res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

app.post('/api/master/companies', authenticateToken, requireRole('master'), async (req, res) => {
  try {
    const { 
      nome, nomeFantasia, cnpj, responsavel, telefone, email, 
      planoContratado, valorPlano, dataInicio, dataVencimento, status, limites,
      adminName, adminEmail, adminPassword 
    } = req.body;

    if (!nome || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Nome da empresa e dados do administrador são obrigatórios.' });
    }

    const cleanEmail = String(adminEmail).trim().toLowerCase();
    const q = query(collection(firestoreDb, 'usuarios'), where('email', '==', cleanEmail));
    const existing = await getDocs(q);
    if (!existing.empty) {
      return res.status(400).json({ error: 'O e-mail informado para o administrador já está em uso.' });
    }

    const companyId = 'emp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newCompany = {
      id: companyId,
      nome,
      nomeFantasia: nomeFantasia || nome,
      cnpj: cnpj || '',
      responsavel: responsavel || adminName,
      telefone: telefone || '',
      email: email || cleanEmail,
      planoContratado: planoContratado || 'Profissional',
      valorPlano: Number(valorPlano) || 199,
      dataInicio: dataInicio || new Date().toISOString().split('T')[0],
      dataVencimento: dataVencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: status || 'ativa',
      limites: limites || {
        maxClientes: 1000,
        maxEntregasMes: 5000,
        maxUsuarios: 20,
        maxEntregadores: 10,
        maxOperadores: 10,
        maxArmazenamentoMB: 5000
      },
      criadoEm: new Date().toISOString()
    };

    const adminId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newAdmin = {
      id: adminId,
      companyId,
      nome: adminName,
      email: cleanEmail,
      senhaHash: await hashPassword(adminPassword),
      telefone: telefone || '',
      role: 'admin',
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    await setDoc(doc(firestoreDb, 'empresas', companyId), newCompany);
    await setDoc(doc(firestoreDb, 'usuarios', adminId), newAdmin);

    // Register Master Audit Log
    const auditId = 'm_aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const masterAudit = {
      id: auditId,
      usuarioId: req.user?.userId || 'master',
      usuarioNome: req.user?.email || 'Super Administrador',
      tipoAcao: 'criar_empresa',
      descricao: `Criou a empresa "${nome}" (Plano: ${newCompany.planoContratado})`,
      detalhes: { companyId, nome, planoContratado: newCompany.planoContratado, adminEmail: cleanEmail },
      dataHora: new Date().toISOString()
    };
    await setDoc(doc(firestoreDb, 'master_auditoria', auditId), masterAudit);

    return res.json({ success: true, company: newCompany, admin: newAdmin });
  } catch (err: any) {
    console.error('Erro ao cadastrar empresa pelo Master:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar empresa: ' + (err?.message || String(err)) });
  }
});

app.put('/api/master/companies/:id', authenticateToken, requireRole('master'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const compRef = doc(firestoreDb, 'empresas', id);
    const snap = await getDoc(compRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const updated = {
      ...snap.data(),
      ...updates,
      atualizadoEm: new Date().toISOString()
    };

    await setDoc(compRef, updated, { merge: true });

    // Audit log
    const auditId = 'm_aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const masterAudit = {
      id: auditId,
      usuarioId: req.user?.userId || 'master',
      usuarioNome: req.user?.email || 'Super Administrador',
      tipoAcao: updates.status ? (updates.status === 'bloqueada' ? 'bloquear_empresa' : updates.status === 'suspensa' ? 'suspender_empresa' : 'reativar_empresa') : 'editar_empresa',
      descricao: `Atualizou os dados da empresa "${updated.nome}"`,
      detalhes: { companyId: id, updates },
      dataHora: new Date().toISOString()
    };
    await setDoc(doc(firestoreDb, 'master_auditoria', auditId), masterAudit);

    return res.json({ success: true, company: updated });
  } catch (err) {
    console.error('Erro ao atualizar empresa:', err);
    return res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

app.delete('/api/master/companies/:id', authenticateToken, requireRole('master'), async (req, res) => {
  try {
    const { id } = req.params;
    const compRef = doc(firestoreDb, 'empresas', id);
    const snap = await getDoc(compRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const companyName = snap.data().nome;
    await deleteDoc(compRef);

    // Clean up linked orphan documents across collections
    const collectionsToClean = ['usuarios', 'drivers', 'vehicles', 'deliveries', 'clientes', 'auditoria'];
    for (const colName of collectionsToClean) {
      try {
        const q = query(collection(firestoreDb, colName), where('companyId', '==', id));
        const qSnap = await getDocs(q);
        for (const docItem of qSnap.docs) {
          await deleteDoc(docItem.ref);
        }
      } catch (colErr) {
        console.warn(`Aviso ao limpar coleção ${colName} para empresa ${id}:`, colErr);
      }
    }

    // Audit log
    const auditId = 'm_aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const masterAudit = {
      id: auditId,
      usuarioId: req.user?.userId || 'master',
      usuarioNome: req.user?.email || 'Super Administrador',
      tipoAcao: 'excluir_empresa',
      descricao: `Excluiu a empresa "${companyName}" (ID: ${id}) e limpou registros associados.`,
      detalhes: { companyId: id, companyName },
      dataHora: new Date().toISOString()
    };
    await setDoc(doc(firestoreDb, 'master_auditoria', auditId), masterAudit);

    return res.json({ success: true, message: `Empresa "${companyName}" e todos os registros associados foram removidos com sucesso.` });
  } catch (err) {
    console.error('Erro ao excluir empresa:', err);
    return res.status(500).json({ error: 'Erro ao excluir empresa' });
  }
});

app.get('/api/master/audit-logs', authenticateToken, requireRole('master'), async (req, res) => {
  try {
    const snap = await getDocs(collection(firestoreDb, 'master_auditoria'));
    const logs = snap.docs.map(d => d.data());
    return res.json({ success: true, logs });
  } catch (err) {
    console.error('Erro ao buscar auditoria master:', err);
    return res.status(500).json({ error: 'Erro ao buscar auditoria master' });
  }
});

app.get('/api/master/custom-roles', authenticateToken, requireRole('master'), async (req, res) => {
  try {
    const snap = await getDocs(collection(firestoreDb, 'custom_roles'));
    const roles = snap.docs.map(d => d.data());
    return res.json({ success: true, roles });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar perfis de acesso' });
  }
});

app.post('/api/master/custom-roles', authenticateToken, requireRole('master'), async (req, res) => {
  try {
    const roleData = req.body;
    const roleId = roleData.id || ('role_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const fullRole = {
      ...roleData,
      id: roleId,
      criadoEm: roleData.criadoEm || new Date().toISOString()
    };
    await setDoc(doc(firestoreDb, 'custom_roles', roleId), fullRole);
    return res.json({ success: true, role: fullRole });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar perfil de acesso' });
  }
});

app.delete('/api/master/custom-roles/:id', authenticateToken, requireRole('master'), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role !== 'master') {
      return res.status(403).json({ error: 'Apenas usuários Master podem excluir perfis de acesso.' });
    }
    const roleRef = doc(firestoreDb, 'custom_roles', id);
    const snap = await getDoc(roleRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Perfil de acesso não encontrado.' });
    }
    await deleteDoc(roleRef);
    return res.json({ success: true, message: 'Perfil de acesso excluído com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir perfil de acesso.' });
  }
});

// The URL company id is never trusted by itself: non-master sessions may only
// operate on the company embedded in their signed token.
app.use('/api/:resource/:companyId', authenticateToken, requireCompanyAccess);

// Multi-tenant Company, Users, Drivers, Vehicles & Deliveries REST Routes
app.get('/api/company/:companyId', authenticateToken, requirePermission('company:read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const snap = await getDoc(doc(firestoreDb, 'empresas', companyId));
    if (!snap.exists()) return res.status(404).json({ error: 'Empresa não encontrada' });
    return res.json(snap.data());
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar dados da empresa' });
  }
});

app.get('/api/deliveries/:companyId', authenticateToken, requirePermission('deliveries:read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = query(collection(firestoreDb, 'deliveries'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    let deliveries = snap.docs.map(d => d.data() as ApiDelivery);

    if (canonicalRole(req.user?.role || '') === 'motorista') {
      const userSnap = await getDoc(doc(firestoreDb, 'usuarios', req.user.userId));
      const userDoc = userSnap.exists() ? userSnap.data() as ApiUser : undefined;
      const driverIdFromUser = userDoc?.motoristaId;
      const driverName = userDoc?.nome?.toLowerCase();

      deliveries = deliveries.filter(d => 
        (d.entregadorId && d.entregadorId === req.user?.userId) || 
        (driverIdFromUser && d.motoristaId && d.motoristaId === driverIdFromUser) ||
        (d.motoristaId && d.motoristaId === req.user?.userId) ||
        (d.entregadorId && driverIdFromUser && d.entregadorId === driverIdFromUser) ||
        (driverName && d.entregadorNome && d.entregadorNome.toLowerCase() === driverName)
      );
    }

    return res.json(deliveries);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar entregas' });
  }
});

app.post('/api/deliveries/:companyId', authenticateToken, requirePermission('deliveries:write'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const newDeliveryData = req.body;
    if (!(await validateCompanyReferences(res, companyId, newDeliveryData))) return;

    const deliveryId = newDeliveryData.id || ('ent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const delivery: ApiDelivery = {
      ...withoutTenantFields(newDeliveryData),
      id: deliveryId,
      companyId,
      criadoEm: newDeliveryData.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    await setDoc(doc(firestoreDb, 'deliveries', deliveryId), delivery);
    return res.json({ success: true, delivery });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar entrega no banco central' });
  }
});

app.put('/api/deliveries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'deliveries', id))) return;
    const updates = withoutTenantFields(req.body);

    const delRef = doc(firestoreDb, 'deliveries', id);
    const delSnap = await getDoc(delRef);
    if (!delSnap.exists()) {
      return res.status(404).json({ error: 'Entrega não encontrada' });
    }
    const existing = delSnap.data() as ApiDelivery;
    if (!hasPermission(req.user!.role, 'deliveries:write') && !(await requireDeliveryWriteAccess(req, res, existing))) return;
    if (!hasPermission(req.user!.role, 'deliveries:write') && !hasPermission(req.user!.role, 'deliveries:own-write')) {
      return res.status(403).json({ error: 'Você não tem permissão para atualizar entregas.' });
    }
    if (canonicalRole(req.user!.role) === 'motorista') {
      const allowed = new Set(['status', 'comprovante', 'historico', 'atualizadoEm']);
      for (const key of Object.keys(updates)) if (!allowed.has(key)) delete updates[key];
    }
    if (!(await validateCompanyReferences(res, existing.companyId, updates))) return;

    const updated = {
      ...existing,
      ...updates,
      atualizadoEm: new Date().toISOString()
    };

    await setDoc(delRef, updated, { merge: true });
    return res.json({ success: true, delivery: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar entrega' });
  }
});

app.delete('/api/deliveries/:companyId/:deliveryId', authenticateToken, requirePermission('deliveries:delete'), async (req, res) => {
  try {
    const { companyId, deliveryId } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'deliveries', deliveryId))) return;
    const { deleteFiles, motivo } = req.body || {};

    // Only Admin and Operators can delete deliveries (drivers/motoristas cannot)
    if (canonicalRole(req.user?.role || '') === 'motorista') {
      return res.status(403).json({ error: 'Entregadores não têm permissão para excluir entregas.' });
    }

    const delRef = doc(firestoreDb, 'deliveries', deliveryId);
    const delSnap = await getDoc(delRef);
    if (!delSnap.exists()) {
      return res.status(404).json({ error: 'Entrega não encontrada.' });
    }

    const deliveryData = delSnap.data() as ApiDelivery;

    // Delete delivery document from Firestore
    await deleteDoc(delRef);

    // Register Audit Log
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const auditRecord = {
      id: auditId,
      companyId,
      tipoAcao: 'exclusao_entrega',
      descricao: `Exclusão da entrega NF ${deliveryData.numeroNF} (Cliente: ${deliveryData.cliente?.nome || 'N/A'})`,
      usuarioNome: req.user.email || 'Usuário',
      usuarioId: req.user.userId,
      detalhes: {
        entregaId: deliveryId,
        numeroNF: deliveryData.numeroNF,
        clienteNome: deliveryData.cliente?.nome,
        motivo: motivo || 'Sem motivo informado',
        deleteFiles: Boolean(deleteFiles)
      },
      dataHora: new Date().toISOString()
    };
    await setDoc(doc(firestoreDb, 'auditoria', auditId), auditRecord);

    return res.json({ success: true, message: `Entrega NF ${deliveryData.numeroNF} excluída com sucesso.` });
  } catch (err) {
    console.error('Erro na exclusão de entrega:', err);
    return res.status(500).json({ error: 'Erro ao excluir entrega do banco de dados.' });
  }
});

app.get('/api/drivers/:companyId', authenticateToken, requirePermission('drivers:read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = query(collection(firestoreDb, 'drivers'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return res.json(snap.docs.map(d => d.data()));
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar motoristas' });
  }
});

app.post('/api/drivers/:companyId', authenticateToken, requirePermission('drivers:write'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const driverData = req.body;
    if (!(await validateCompanyReferences(res, companyId, driverData))) return;

    const driverId = driverData.id || ('drv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const driver: ApiDriver = {
      ...withoutTenantFields(driverData),
      id: driverId,
      companyId,
      criadoEm: driverData.criadoEm || new Date().toISOString()
    };

    await setDoc(doc(firestoreDb, 'drivers', driverId), driver);
    return res.json({ success: true, driver });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar motorista' });
  }
});

app.get('/api/vehicles/:companyId', authenticateToken, requirePermission('vehicles:read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = query(collection(firestoreDb, 'vehicles'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return res.json(snap.docs.map(d => d.data()));
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar veículos' });
  }
});

app.post('/api/vehicles/:companyId', authenticateToken, requirePermission('vehicles:write'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const vehicleData = req.body;

    const vehicleId = vehicleData.id || ('vec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const vehicle: ApiVehicle = {
      ...withoutTenantFields(vehicleData),
      id: vehicleId,
      companyId
    };

    await setDoc(doc(firestoreDb, 'vehicles', vehicleId), vehicle);
    return res.json({ success: true, vehicle });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar veículo' });
  }
});

function getPermissionsForRole(role: string) {
  const isMasterOrAdmin = role === 'master' || role === 'admin';
  return {
    criar_clientes: true,
    editar_clientes: true,
    excluir_clientes: isMasterOrAdmin,
    criar_entregas: true,
    editar_entregas: true,
    excluir_entregas: isMasterOrAdmin,
    alterar_status_entregas: true,
    criar_usuarios: isMasterOrAdmin,
    excluir_usuarios: isMasterOrAdmin,
    ver_relatorios: true,
    exportar_dados: isMasterOrAdmin,
    configuracoes_empresa: isMasterOrAdmin,
    dashboard: true,
    financeiro: isMasterOrAdmin,
    logs: isMasterOrAdmin,
    backup: isMasterOrAdmin,
    ia: true
  };
}

app.get('/api/users/:companyId', authenticateToken, requirePermission('users:read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = companyId === 'global'
      ? query(collection(firestoreDb, 'usuarios'))
      : query(collection(firestoreDb, 'usuarios'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    const users = snap.docs.map(d => {
      const { senhaHash, ...u } = d.data() as ApiUser;
      return u;
    });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar usuários' });
  }
});

app.post('/api/users/:companyId', authenticateToken, requirePermission('users:write'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { nome, email, senha, role, motoristaId, telefone, ativo = true } = req.body;

    if (!nome || !email || !senha || !role) {
      return res.status(400).json({ error: 'Preencha nome, e-mail, senha e perfil.' });
    }
    if (!canAssignRole(req.user!.role, role)) {
      return res.status(403).json({ error: 'Você não pode atribuir este perfil.' });
    }
    if (motoristaId && !(await belongsToCompany('drivers', motoristaId, companyId))) {
      return res.status(400).json({ error: 'O motorista informado não pertence a esta empresa.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user already exists in Firestore by email
    const q = query(collection(firestoreDb, 'usuarios'), where('email', '==', cleanEmail));
    const existing = await getDocs(q);
    if (!existing.empty) {
      return res.status(400).json({ error: 'E-mail de usuário já cadastrado no banco central.' });
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const resolvedCompanyId = companyId || 'global';
    const resolvedOrgId = resolvedCompanyId;
    const resolvedTenantId = resolvedCompanyId;

    const defaultPerms = getPermissionsForRole(role);

    const newUser: ApiUser = {
      id: userId,
      companyId: resolvedCompanyId,
      organizationId: resolvedOrgId,
      tenantId: resolvedTenantId,
      nome: String(nome).trim(),
      email: cleanEmail,
      senhaHash: await hashPassword(senha),
      telefone: telefone ? String(telefone).trim() : '',
      role,
      permissoesCustomizadas: defaultPerms,
      motoristaId: motoristaId || undefined,
      ativo: ativo !== false,
      criadoEm: new Date().toISOString()
    };

    await setDoc(doc(firestoreDb, 'usuarios', userId), sanitizeForFirestore(newUser));

    // Link or create driver record if role is motorista / entregador
    if ((role === 'motorista' || role === 'entregador' || role === 'driver') && motoristaId) {
      const drvRef = doc(firestoreDb, 'drivers', motoristaId);
      const drvSnap = await getDoc(drvRef);
      if (drvSnap.exists()) {
        await updateDoc(drvRef, sanitizeForFirestore({ userId }));
      }
    } else if ((role === 'motorista' || role === 'entregador' || role === 'driver') && !motoristaId) {
      const newDriverId = 'drv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newDriver = {
        id: newDriverId,
        userId: userId,
        companyId: resolvedCompanyId,
        nome: String(nome).trim(),
        email: cleanEmail,
        telefone: telefone ? String(telefone).trim() : '',
        cpf: '',
        ativo: true,
        online: false,
        rotaAtual: null,
        ultimaLocalizacao: null,
        criadoEm: new Date().toISOString()
      };
      await setDoc(doc(firestoreDb, 'drivers', newDriverId), sanitizeForFirestore(newDriver));
      newUser.motoristaId = newDriverId;
      await updateDoc(doc(firestoreDb, 'usuarios', userId), sanitizeForFirestore({ motoristaId: newDriverId }));
    }

    // Audit Log Entry
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    await setDoc(doc(firestoreDb, 'auditoria', auditId), sanitizeForFirestore({
      id: auditId,
      companyId: resolvedCompanyId,
      usuarioId: userId,
      usuarioNome: (req.user as any)?.nome || 'Sistema',
      acao: 'Criação de Usuário',
      detalhes: `Usuário ${newUser.nome} (${cleanEmail}) cadastrado com perfil ${role}.`,
      ip: req.ip || '127.0.0.1',
      dataHora: new Date().toISOString()
    })).catch(() => {});

    const { senhaHash, ...userWithoutPassword } = newUser;
    return res.json({ success: true, user: userWithoutPassword });
  } catch (err: any) {
    console.error('Erro ao cadastrar usuário:', err);
    return res.status(500).json({ error: err?.message || 'Erro ao cadastrar usuário no banco central' });
  }
});

app.put('/api/users/:companyId/:userId', authenticateToken, requirePermission('users:write'), async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'usuarios', userId))) return;
    const updates = withoutTenantFields(req.body);
    if (updates.role && !canAssignRole(req.user!.role, updates.role)) {
      return res.status(403).json({ error: 'Você não pode atribuir este perfil.' });
    }
    delete updates.permissoesCustomizadas;
    delete updates.senhaHash;

    const userRef = doc(firestoreDb, 'usuarios', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    if (updates.motoristaId && !(await belongsToCompany('drivers', updates.motoristaId, companyId))) {
      return res.status(400).json({ error: 'O motorista informado não pertence a esta empresa.' });
    }

    if (updates.email) {
      const cleanEmail = String(updates.email).trim().toLowerCase();
      const q = query(collection(firestoreDb, 'usuarios'), where('email', '==', cleanEmail));
      const existing = await getDocs(q);
      const otherUser = existing.docs.find(d => d.id !== userId);
      if (otherUser) {
        return res.status(400).json({ error: 'E-mail de usuário já está em uso por outra conta.' });
      }
      updates.email = cleanEmail;
    }

    if (updates.senha) {
      updates.senhaHash = await hashPassword(updates.senha);
      delete updates.senha;
    }

    await updateDoc(userRef, sanitizeForFirestore(updates));

    // Audit Log Entry
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    await setDoc(doc(firestoreDb, 'auditoria', auditId), sanitizeForFirestore({
      id: auditId,
      companyId: companyId || 'global',
      usuarioId: userId,
      usuarioNome: (req.user as any)?.nome || 'Sistema',
      acao: 'Atualização de Usuário',
      detalhes: `Dados do usuário ${userId} atualizados.`,
      ip: req.ip || '127.0.0.1',
      dataHora: new Date().toISOString()
    })).catch(() => {});

    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/users/:companyId/:userId', authenticateToken, requirePermission('users:write'), async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'usuarios', userId))) return;
    const userRef = doc(firestoreDb, 'usuarios', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userData = userSnap.data() as ApiUser;

    await deleteDoc(userRef);

    // Audit Log Entry
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    await setDoc(doc(firestoreDb, 'auditoria', auditId), {
      id: auditId,
      companyId: companyId || 'global',
      usuarioId: userId,
      usuarioNome: (req.user as any)?.nome || 'Sistema',
      acao: 'Exclusão de Usuário',
      detalhes: `Usuário ${userData.nome} (${userData.email}) excluído do sistema.`,
      ip: req.ip || '127.0.0.1',
      dataHora: new Date().toISOString()
    }).catch(() => {});

    return res.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    return res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

app.put('/api/drivers/:companyId/:driverId', authenticateToken, requirePermission('drivers:write'), async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'drivers', driverId))) return;
    const updates = req.body;
    if (!(await validateCompanyReferences(res, req.params.companyId, updates))) return;

    const drvRef = doc(firestoreDb, 'drivers', driverId);
    const drvSnap = await getDoc(drvRef);
    if (!drvSnap.exists()) {
      return res.status(404).json({ error: 'Entregador não encontrado' });
    }

    await updateDoc(drvRef, sanitizeForFirestore(withoutTenantFields(updates)));
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar entregador:', err);
    return res.status(500).json({ error: 'Erro ao atualizar entregador' });
  }
});

app.delete('/api/drivers/:companyId/:driverId', authenticateToken, requirePermission('drivers:write'), async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'drivers', driverId))) return;
    const drvRef = doc(firestoreDb, 'drivers', driverId);
    const drvSnap = await getDoc(drvRef);
    if (!drvSnap.exists()) {
      return res.status(404).json({ error: 'Entregador não encontrado' });
    }

    await deleteDoc(drvRef);
    return res.json({ success: true, message: 'Entregador excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir entregador:', err);
    return res.status(500).json({ error: 'Erro ao excluir entregador' });
  }
});

app.put('/api/vehicles/:companyId/:vehicleId', authenticateToken, requirePermission('vehicles:write'), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'vehicles', vehicleId))) return;
    const updates = req.body;

    const vecRef = doc(firestoreDb, 'vehicles', vehicleId);
    const vecSnap = await getDoc(vecRef);
    if (!vecSnap.exists()) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    await updateDoc(vecRef, sanitizeForFirestore(withoutTenantFields(updates)));
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar veículo:', err);
    return res.status(500).json({ error: 'Erro ao atualizar veículo' });
  }
});

app.delete('/api/vehicles/:companyId/:vehicleId', authenticateToken, requirePermission('vehicles:write'), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'vehicles', vehicleId))) return;
    const vecRef = doc(firestoreDb, 'vehicles', vehicleId);
    const vecSnap = await getDoc(vecRef);
    if (!vecSnap.exists()) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    await deleteDoc(vecRef);
    return res.json({ success: true, message: 'Veículo excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir veículo:', err);
    return res.status(500).json({ error: 'Erro ao excluir veículo' });
  }
});

// CLIENTS REST ROUTES
app.get('/api/clients/:companyId', authenticateToken, requirePermission('clients:read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = query(collection(firestoreDb, 'clientes'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return res.json(snap.docs.map(d => d.data()));
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

app.post('/api/clients/:companyId', authenticateToken, requirePermission('clients:write'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const clientData = req.body;

    const clientId = clientData.id || ('cli_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const clientDoc = {
      ...clientData,
      id: clientId,
      companyId,
      ativo: clientData.ativo !== undefined ? clientData.ativo : true,
      criadoEm: clientData.criadoEm || new Date().toISOString()
    };

    await setDoc(doc(firestoreDb, 'clientes', clientId), clientDoc);
    return res.json({ success: true, client: clientDoc });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar cliente' });
  }
});

// SINGLE CLIENT DELETION WITH SECURITY & ACTIVE DELIVERIES BLOCKING
app.delete('/api/clients/:companyId/:clientId', authenticateToken, requirePermission('clients:delete'), async (req, res) => {
  try {
    const { companyId, clientId } = req.params;
    if (!(await hasDocumentCompanyAccess(req, res, 'clientes', clientId))) return;

    // 1. Security check: Only administrators can delete
    if (req.user?.role !== 'admin' && req.user?.role !== 'master') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir clientes.' });
    }

    // 2. Fetch client
    const clientRef = doc(firestoreDb, 'clientes', clientId);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const clientData = clientSnap.data();

    // 3. Check for pending or in-progress deliveries
    const qDel = query(collection(firestoreDb, 'deliveries'), where('companyId', '==', companyId));
    const delSnap = await getDocs(qDel);
    const deliveries = delSnap.docs.map(d => d.data() as ApiDelivery);

    const pendingStatuses = ['venda_realizada', 'nf_emitida', 'separacao', 'aguardando_motorista', 'em_rota'];

    const clientDeliveries = deliveries.filter(d => 
      (d.cliente && d.cliente.nome && clientData.nome && d.cliente.nome.trim().toLowerCase() === clientData.nome.trim().toLowerCase()) ||
      (d.cliente && d.cliente.documento && clientData.documento && d.cliente.documento === clientData.documento)
    );

    const activeDeliveries = clientDeliveries.filter(d => pendingStatuses.includes(d.status));

    if (activeDeliveries.length > 0) {
      const activeNFs = activeDeliveries.map(d => d.numeroNF).join(', ');
      return res.status(400).json({ 
        error: `Não é possível excluir o cliente "${clientData.nome}". Existem ${activeDeliveries.length} entregas pendentes ou em andamento (NF: ${activeNFs}). Finalize ou cancele as entregas antes de excluir.`,
        activeDeliveriesCount: activeDeliveries.length
      });
    }

    // 4. Safe deletion
    await deleteDoc(clientRef);

    // 5. Register in Audit Log
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const auditRecord = {
      id: auditId,
      companyId,
      tipoAcao: 'exclusao_cliente',
      descricao: `Exclusão do cliente ${clientData.nome} (Doc: ${clientData.documento || 'N/A'})`,
      usuarioNome: req.user.email || 'Administrador',
      usuarioId: req.user.userId,
      detalhes: {
        clienteNome: clientData.nome,
        clienteDocumento: clientData.documento || ''
      },
      dataHora: new Date().toISOString()
    };
    await setDoc(doc(firestoreDb, 'auditoria', auditId), auditRecord);

    return res.json({ success: true, message: `Cliente "${clientData.nome}" excluído com sucesso.` });
  } catch (err) {
    console.error('Erro na exclusão de cliente:', err);
    return res.status(500).json({ error: 'Erro ao excluir cliente do banco de dados.' });
  }
});

// BULK CLIENT CLEANUP FOR ADMINS
app.post('/api/admin/bulk-cleanup-clients/:companyId', authenticateToken, requirePermission('clients:delete'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate, mode } = req.body; // mode: 'only_without_deliveries' | 'all_with_history'

    if (req.user?.role !== 'admin' && req.user?.role !== 'master') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem executar a limpeza em massa do banco.' });
    }

    const qClients = query(collection(firestoreDb, 'clientes'), where('companyId', '==', companyId));
    const clientSnap = await getDocs(qClients);
    const allClients = clientSnap.docs.map(d => d.data());

    const qDeliveries = query(collection(firestoreDb, 'deliveries'), where('companyId', '==', companyId));
    const deliverySnap = await getDocs(qDeliveries);
    const allDeliveries = deliverySnap.docs.map(d => d.data() as ApiDelivery);

    // Filter target clients in period
    const targetClients = allClients.filter(c => {
      const created = c.criadoEm ? c.criadoEm.split('T')[0] : '';
      if (!created) return true;
      if (startDate && created < startDate) return false;
      if (endDate && created > endDate) return false;
      return true;
    });

    let clientsRemovedCount = 0;
    let deliveriesRemovedCount = 0;
    let freedBytes = 0;

    for (const client of targetClients) {
      const linkedDeliveries = allDeliveries.filter(d => 
        (d.cliente && d.cliente.nome && client.nome && d.cliente.nome.trim().toLowerCase() === client.nome.trim().toLowerCase()) ||
        (d.cliente && d.cliente.documento && client.documento && d.cliente.documento === client.documento)
      );

      if (mode === 'only_without_deliveries' && linkedDeliveries.length > 0) {
        continue; // Skip clients that have delivery history
      }

      // Calculate approximate bytes freed
      const clientStr = JSON.stringify(client);
      freedBytes += Buffer.byteLength(clientStr, 'utf8');

      // Delete client
      await deleteDoc(doc(firestoreDb, 'clientes', client.id));
      clientsRemovedCount++;

      // If mode is 'all_with_history', delete linked deliveries
      if (mode === 'all_with_history' && linkedDeliveries.length > 0) {
        for (const del of linkedDeliveries) {
          const delStr = JSON.stringify(del);
          freedBytes += Buffer.byteLength(delStr, 'utf8');
          await deleteDoc(doc(firestoreDb, 'deliveries', del.id));
          deliveriesRemovedCount++;
        }
      }
    }

    // Record Audit Trail
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const auditRecord = {
      id: auditId,
      companyId,
      tipoAcao: 'exclusao_massa_clientes',
      descricao: `Limpeza em massa do banco (${startDate || 'Início'} até ${endDate || 'Hoje'}): ${clientsRemovedCount} clientes e ${deliveriesRemovedCount} entregas removidas.`,
      usuarioNome: req.user.email || 'Administrador',
      usuarioId: req.user.userId,
      detalhes: {
        qtdClientesRemovidos: clientsRemovedCount,
        qtdEntregasRemovidas: deliveriesRemovedCount,
        espacoLiberadoBytes: freedBytes,
        periodoReferencia: `${startDate || 'Início'} a ${endDate || 'Hoje'}`
      },
      dataHora: new Date().toISOString()
    };
    await setDoc(doc(firestoreDb, 'auditoria', auditId), auditRecord);

    const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);

    return res.json({
      success: true,
      clientsRemovedCount,
      deliveriesRemovedCount,
      freedBytes,
      freedFormatted: freedMB === '0.00' ? `${(freedBytes / 1024).toFixed(1)} KB` : `${freedMB} MB`,
      message: `Limpeza concluída! ${clientsRemovedCount} clientes e ${deliveriesRemovedCount} entregas foram removidas.`
    });
  } catch (err) {
    console.error('Erro na limpeza em massa:', err);
    return res.status(500).json({ error: 'Erro ao executar limpeza em massa do banco.' });
  }
});

// GET AUDIT TRAIL
app.get('/api/audit/:companyId', authenticateToken, requirePermission('audit:read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    if (req.user?.role !== 'admin' && req.user?.role !== 'master') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    const q = query(collection(firestoreDb, 'auditoria'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => d.data());
    logs.sort((a: any, b: any) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar histórico de auditoria.' });
  }
});

// GET STORAGE MONITOR METRICS
app.get('/api/storage-metrics/:companyId', authenticateToken, requirePermission('storage:read'), async (req, res) => {
  try {
    const { companyId } = req.params;

    const [clientsSnap, delSnap, driversSnap, usersSnap, auditSnap] = await Promise.all([
      getDocs(query(collection(firestoreDb, 'clientes'), where('companyId', '==', companyId))),
      getDocs(query(collection(firestoreDb, 'deliveries'), where('companyId', '==', companyId))),
      getDocs(query(collection(firestoreDb, 'drivers'), where('companyId', '==', companyId))),
      getDocs(query(collection(firestoreDb, 'usuarios'), where('companyId', '==', companyId))),
      getDocs(query(collection(firestoreDb, 'auditoria'), where('companyId', '==', companyId)))
    ]);

    const clients = clientsSnap.docs.map(d => d.data());
    const deliveries = delSnap.docs.map(d => d.data() as ApiDelivery);
    const drivers = driversSnap.docs.map(d => d.data());
    const users = usersSnap.docs.map(d => d.data());
    const auditLogs = auditSnap.docs.map(d => d.data());

    const totalClientes = clients.length;
    const totalClientesAtivos = clients.filter((c: any) => c.ativo !== false).length;

    // Deleted clients count from audit logs
    const deletedLogs = auditLogs.filter((a: any) => a.tipoAcao === 'exclusao_cliente' || a.tipoAcao === 'exclusao_massa_clientes');
    let totalClientesExcluidos = 0;
    deletedLogs.forEach((a: any) => {
      if (a.tipoAcao === 'exclusao_cliente') totalClientesExcluidos += 1;
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

    drivers.forEach((drv: any) => {
      if (drv.fotoPerfilUrl) totalFotos++;
      if (drv.cnh) totalDocumentos++;
    });

    // Calculate total byte size of database payload
    let totalBytes = 0;
    const calcBytes = (obj: any) => Buffer.byteLength(JSON.stringify(obj), 'utf8');

    clients.forEach(c => totalBytes += calcBytes(c));
    deliveries.forEach(d => totalBytes += calcBytes(d));
    drivers.forEach(drv => totalBytes += calcBytes(drv));
    users.forEach(u => totalBytes += calcBytes(u));
    auditLogs.forEach(a => totalBytes += calcBytes(a));

    const totalMB = totalBytes / (1024 * 1024);
    let espacoUtilizadoFormatted = '';
    if (totalMB < 1) {
      espacoUtilizadoFormatted = `${(totalBytes / 1024).toFixed(1)} KB`;
    } else if (totalMB < 1024) {
      espacoUtilizadoFormatted = `${totalMB.toFixed(2)} MB`;
    } else {
      espacoUtilizadoFormatted = `${(totalMB / 1024).toFixed(2)} GB`;
    }

    // Standard baseline limit for visualization (e.g. 50 MB standard tier)
    const baselineMaxBytes = 50 * 1024 * 1024;
    const percentualUso = Math.min(100, Math.max(1, Math.round((totalBytes / baselineMaxBytes) * 100)));

    return res.json({
      totalClientes,
      totalClientesAtivos,
      totalClientesExcluidos,
      totalEntregas,
      totalComprovantes,
      totalFotos,
      totalDocumentos,
      espacoUtilizadoBytes: totalBytes,
      espacoUtilizadoFormatted,
      percentualUso
    });
  } catch (err) {
    console.error('Erro ao calcular métricas de armazenamento:', err);
    return res.status(500).json({ error: 'Erro ao calcular métricas de armazenamento' });
  }
});

// API-only data transport used by the browser.  The collection allow-list keeps
// arbitrary Firestore collections and cross-tenant reads out of the client.
const tenantCollections = new Set(['deliveries', 'drivers', 'vehicles', 'usuarios', 'clientes', 'auditoria', 'driver_locations', 'route_histories']);
const tenantWritableCollections = new Set(['deliveries', 'drivers', 'vehicles', 'clientes', 'driver_locations', 'route_histories']);
const collectionPermission: Record<string, { read: string; write?: string }> = {
  deliveries: { read: 'deliveries:read', write: 'deliveries:write' },
  drivers: { read: 'drivers:read', write: 'drivers:write' },
  vehicles: { read: 'vehicles:read', write: 'vehicles:write' },
  usuarios: { read: 'users:read' },
  clientes: { read: 'clients:read', write: 'clients:write' },
  auditoria: { read: 'audit:read' },
  driver_locations: { read: 'locations:read', write: 'locations:write' },
  route_histories: { read: 'routes:read', write: 'routes:write' }
};
function requireCollectionPermission(action: 'read' | 'write') {
  return (req: Request, res: Response, next: NextFunction) => {
    const permission = collectionPermission[req.params.collection]?.[action];
    if (!permission || !req.user || !hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Você não tem permissão para este recurso.' });
    }
    next();
  };
}
app.get('/api/data/:companyId/:collection', authenticateToken, requireCompanyAccess, requireCollectionPermission('read'), async (req, res) => {
  const { companyId, collection: collectionName } = req.params;
  if (!tenantCollections.has(collectionName)) return res.status(404).json({ error: 'Recurso não encontrado.' });
  const snapshot = await getDocs(query(collection(firestoreDb, collectionName), where('companyId', '==', companyId)));
  const records = snapshot.docs.map(item => item.data());
  return res.json(collectionName === 'usuarios' ? records.map(({ senhaHash, ...user }: any) => user) : records);
});
app.put('/api/data/:companyId/:collection/:id', authenticateToken, requireCompanyAccess, requireCollectionPermission('write'), async (req, res) => {
  const { companyId, collection: collectionName, id } = req.params;
  if (!tenantWritableCollections.has(collectionName) || !(await hasDocumentCompanyAccess(req, res, collectionName, id))) return;
  if (!(await validateCompanyReferences(res, companyId, req.body))) return;
  const payload = { ...req.body, companyId, atualizadoEm: new Date().toISOString() };
  delete payload.senhaHash;
  await setDoc(doc(firestoreDb, collectionName, id), sanitizeForFirestore(payload), { merge: true });
  return res.json({ success: true });
});
app.post('/api/data/:companyId/:collection', authenticateToken, requireCompanyAccess, requireCollectionPermission('write'), async (req, res) => {
  const { companyId, collection: collectionName } = req.params;
  if (!tenantWritableCollections.has(collectionName)) return res.status(404).json({ error: 'Recurso não encontrado.' });
  if (!(await validateCompanyReferences(res, companyId, req.body))) return;
  const id = String(req.body?.id || `${collectionName.slice(0, 3)}_${crypto.randomUUID()}`);
  const payload = { ...req.body, id, companyId, criadoEm: req.body?.criadoEm || new Date().toISOString() };
  delete payload.senhaHash;
  await setDoc(doc(firestoreDb, collectionName, id), sanitizeForFirestore(payload), { merge: true });
  return res.json({ success: true, data: payload });
});
app.delete('/api/data/:companyId/:collection/:id', authenticateToken, requireCompanyAccess, requireCollectionPermission('write'), async (req, res) => {
  const { collection: collectionName, id } = req.params;
  if (!tenantWritableCollections.has(collectionName) || !(await hasDocumentCompanyAccess(req, res, collectionName, id))) return;
  await deleteDoc(doc(firestoreDb, collectionName, id));
  return res.json({ success: true });
});

// START EXPRESS & VITE SERVER
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Express rodando com sucesso na porta ${PORT}`);
  });
}

startServer();
