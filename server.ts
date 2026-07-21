import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fast_gestao_entregas_jwt_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Interface definitions for JWT payload and authenticated request
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

// In-Memory / Synced Store for fast API responses + persistence fallback
interface ApiUser {
  id: string;
  companyId: string;
  nome: string;
  email: string;
  senhaHash: string;
  telefone?: string;
  role: string; // 'admin' | 'operador' | 'motorista' | 'master'
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
  categoriaCnh?: string;
  validadeCnh?: string;
  ativo: boolean;
  criadoEm: string;
}

interface ApiVehicle {
  id: string;
  companyId: string;
  placa: string;
  modelo: string;
  cor: string;
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

// Global Memory DB (In-memory fallback + API REST cache)
const memoryDb = {
  companies: [] as ApiCompany[],
  users: [] as ApiUser[],
  drivers: [] as ApiDriver[],
  vehicles: [] as ApiVehicle[],
  deliveries: [] as ApiDelivery[],
};

// Simple Password Hash Helper
function hashPassword(pass: string): string {
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sec_hash_${hash.toString(16)}`;
}

// Seed Initial Database
function seedInitialData() {
  if (memoryDb.companies.length > 0) return;

  const companyId = 'emp_teste_001';
  const company: ApiCompany = {
    id: companyId,
    nome: 'Empresa Teste Logística',
    criadoEm: new Date().toISOString()
  };

  const masterUser: ApiUser = {
    id: 'usr_master_001',
    companyId: companyId,
    nome: 'Administrador Master',
    email: 'master@fastlog.com',
    senhaHash: hashPassword('123456'),
    role: 'master',
    ativo: true,
    criadoEm: new Date().toISOString()
  };

  const adminUser: ApiUser = {
    id: 'usr_admin_001',
    companyId: companyId,
    nome: 'Administrador Empresa',
    email: 'admin@empresa.com',
    senhaHash: hashPassword('123456'),
    role: 'admin',
    ativo: true,
    criadoEm: new Date().toISOString()
  };

  const driverId = 'drv_mateus_001';
  const driverUser: ApiUser = {
    id: 'usr_mateus_001',
    companyId: companyId,
    nome: 'Mateus Entregador',
    email: 'mateus@empresa.com',
    senhaHash: hashPassword('123456'),
    role: 'motorista',
    motoristaId: driverId,
    ativo: true,
    criadoEm: new Date().toISOString()
  };

  const driver: ApiDriver = {
    id: driverId,
    userId: driverUser.id,
    companyId: companyId,
    nome: 'Mateus Entregador',
    cpf: '123.456.789-00',
    telefone: '(11) 98888-7777',
    email: 'mateus@empresa.com',
    cnh: '12345678900',
    categoriaCnh: 'B',
    validadeCnh: '2028-12-31',
    ativo: true,
    criadoEm: new Date().toISOString()
  };

  const vehicle: ApiVehicle = {
    id: 'vec_001',
    companyId: companyId,
    placa: 'ABC-1234',
    modelo: 'Fiorino 1.4 EVO',
    cor: 'Branca',
    tipo: 'furgão',
    ativo: true
  };

  const delivery: ApiDelivery = {
    id: 'ent_001',
    companyId: companyId,
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

  memoryDb.companies.push(company);
  memoryDb.users.push(masterUser, adminUser, driverUser);
  memoryDb.drivers.push(driver);
  memoryDb.vehicles.push(vehicle);
  memoryDb.deliveries.push(delivery);
}

seedInitialData();

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

// ---------------- API ROUTES ----------------

// Healthcheck & Seed API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/seed', (req, res) => {
  seedInitialData();
  res.json({ success: true, message: 'Dados de seed inicial verificados e carregados.' });
});

// Auth API Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = memoryDb.users.find(u => u.email === cleanEmail);

  if (!user) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }

  if (!user.ativo) {
    return res.status(403).json({ error: 'Conta inativa. Contate o administrador.' });
  }

  const hash = hashPassword(password);
  if (user.senhaHash !== hash) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }

  user.ultimoLogin = new Date().toISOString();

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
  res.json({
    success: true,
    token,
    user: userWithoutPassword
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const userId = req.user?.userId;
  const user = memoryDb.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  const { senhaHash, ...userWithoutPassword } = user;
  res.json({ success: true, user: userWithoutPassword });
});

app.post('/api/auth/register-company', (req, res) => {
  const { companyName, adminName, adminEmail, adminPassword, adminPhone } = req.body;

  if (!companyName || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  const cleanEmail = String(adminEmail).trim().toLowerCase();
  const exists = memoryDb.users.find(u => u.email === cleanEmail);
  if (exists) {
    return res.status(400).json({ error: 'E-mail já cadastrado no sistema.' });
  }

  const companyId = 'emp_' + Date.now();
  const newCompany: ApiCompany = {
    id: companyId,
    nome: companyName,
    criadoEm: new Date().toISOString()
  };

  const adminId = 'usr_' + Date.now();
  const newAdmin: ApiUser = {
    id: adminId,
    companyId,
    nome: adminName,
    email: cleanEmail,
    senhaHash: hashPassword(adminPassword),
    telefone: adminPhone || '',
    role: 'admin',
    ativo: true,
    criadoEm: new Date().toISOString()
  };

  memoryDb.companies.push(newCompany);
  memoryDb.users.push(newAdmin);

  const token = jwt.sign(
    { userId: newAdmin.id, email: newAdmin.email, role: newAdmin.role, companyId: newAdmin.companyId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { senhaHash, ...userWithoutPassword } = newAdmin;
  res.json({ success: true, token, user: userWithoutPassword });
});

// Multi-tenant Company, Users, Drivers, Vehicles & Deliveries REST Routes
app.get('/api/company/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  const company = memoryDb.companies.find(c => c.id === companyId);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(company);
});

app.get('/api/deliveries/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  let deliveries = memoryDb.deliveries.filter(d => d.companyId === companyId);

  // Filter if motorista role
  if (req.user?.role === 'motorista') {
    deliveries = deliveries.filter(d => d.entregadorId === req.user?.userId);
  }

  res.json(deliveries);
});

app.post('/api/deliveries/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  const newDeliveryData = req.body;

  const deliveryId = newDeliveryData.id || ('ent_' + Date.now());
  const delivery: ApiDelivery = {
    ...newDeliveryData,
    id: deliveryId,
    companyId,
    criadoEm: newDeliveryData.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };

  const existingIndex = memoryDb.deliveries.findIndex(d => d.id === deliveryId);
  if (existingIndex >= 0) {
    memoryDb.deliveries[existingIndex] = delivery;
  } else {
    memoryDb.deliveries.unshift(delivery);
  }

  res.json({ success: true, delivery });
});

app.put('/api/deliveries/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const index = memoryDb.deliveries.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Entrega não encontrada' });
  }

  memoryDb.deliveries[index] = {
    ...memoryDb.deliveries[index],
    ...updates,
    atualizadoEm: new Date().toISOString()
  };

  res.json({ success: true, delivery: memoryDb.deliveries[index] });
});

app.get('/api/drivers/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  const drivers = memoryDb.drivers.filter(d => d.companyId === companyId);
  res.json(drivers);
});

app.post('/api/drivers/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  const driverData = req.body;

  const driverId = driverData.id || ('drv_' + Date.now());
  const driver: ApiDriver = {
    ...driverData,
    id: driverId,
    companyId,
    criadoEm: driverData.criadoEm || new Date().toISOString()
  };

  const idx = memoryDb.drivers.findIndex(d => d.id === driverId);
  if (idx >= 0) {
    memoryDb.drivers[idx] = driver;
  } else {
    memoryDb.drivers.push(driver);
  }

  res.json({ success: true, driver });
});

app.get('/api/vehicles/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  const vehicles = memoryDb.vehicles.filter(v => v.companyId === companyId);
  res.json(vehicles);
});

app.post('/api/vehicles/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  const vehicleData = req.body;

  const vehicleId = vehicleData.id || ('vec_' + Date.now());
  const vehicle: ApiVehicle = {
    ...vehicleData,
    id: vehicleId,
    companyId
  };

  const idx = memoryDb.vehicles.findIndex(v => v.id === vehicleId);
  if (idx >= 0) {
    memoryDb.vehicles[idx] = vehicle;
  } else {
    memoryDb.vehicles.push(vehicle);
  }

  res.json({ success: true, vehicle });
});

app.get('/api/users/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  const users = memoryDb.users.filter(u => u.companyId === companyId).map(({ senhaHash, ...u }) => u);
  res.json(users);
});

app.post('/api/users/:companyId', authenticateToken, (req, res) => {
  const { companyId } = req.params;
  const { nome, email, senha, role, motoristaId } = req.body;

  if (!nome || !email || !senha || !role) {
    return res.status(400).json({ error: 'Preencha nome, e-mail, senha e perfil.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const exists = memoryDb.users.find(u => u.email === cleanEmail);
  if (exists) {
    return res.status(400).json({ error: 'E-mail de usuário já cadastrado.' });
  }

  const userId = 'usr_' + Date.now();
  const newUser: ApiUser = {
    id: userId,
    companyId,
    nome,
    email: cleanEmail,
    senhaHash: hashPassword(senha),
    role,
    motoristaId,
    ativo: true,
    criadoEm: new Date().toISOString()
  };

  memoryDb.users.push(newUser);

  // Link driver if motorista role
  if (role === 'motorista' && motoristaId) {
    const drv = memoryDb.drivers.find(d => d.id === motoristaId);
    if (drv) {
      drv.userId = userId;
    }
  }

  const { senhaHash, ...userWithoutPassword } = newUser;
  res.json({ success: true, user: userWithoutPassword });
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
