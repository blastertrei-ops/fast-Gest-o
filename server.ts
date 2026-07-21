import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  updateDoc 
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

// Initialize Firebase App & Firestore Client for Central Database Persistence
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const firestoreDb = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fast_gestao_entregas_jwt_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
  nome: string;
  email: string;
  senhaHash: string;
  telefone?: string;
  role: string;
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

// Password Hash Function
function hashPassword(pass: string): string {
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sec_hash_${hash.toString(16)}`;
}

// Seed Initial Database in Firestore
async function seedInitialData() {
  try {
    const empSnap = await getDocs(collection(firestoreDb, 'empresas'));
    if (empSnap.empty) {
      const companyId = 'emp_teste_001';
      const company: ApiCompany = {
        id: companyId,
        nome: 'Empresa Teste Logística',
        criadoEm: new Date().toISOString()
      };

      const masterUser: ApiUser = {
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

      const adminUser: ApiUser = {
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
      const driverUser: ApiUser = {
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

      const driver: ApiDriver = {
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

      const vehicle: ApiVehicle = {
        id: 'vec_001',
        companyId,
        placa: 'ABC-1234',
        modelo: 'Fiorino 1.4 EVO',
        tipo: 'van',
        ativo: true
      };

      const delivery: ApiDelivery = {
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
      console.log('Seed inicial no Firestore concluído com sucesso.');
    }
  } catch (err) {
    console.error('Erro ao realizar seed no Firestore:', err);
  }
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/seed', async (req, res) => {
  await seedInitialData();
  res.json({ success: true, message: 'Dados de seed inicial verificados e carregados no Firestore.' });
});

// Auth API Routes (Central Firestore Authentication)
app.post('/api/auth/login', async (req, res) => {
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

    const hash = hashPassword(password);
    if (user.senhaHash !== hash) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
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
      senhaHash: hashPassword(adminPassword),
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

// Multi-tenant Company, Users, Drivers, Vehicles & Deliveries REST Routes
app.get('/api/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const snap = await getDoc(doc(firestoreDb, 'empresas', companyId));
    if (!snap.exists()) return res.status(404).json({ error: 'Empresa não encontrada' });
    return res.json(snap.data());
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar dados da empresa' });
  }
});

app.get('/api/deliveries/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = query(collection(firestoreDb, 'deliveries'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    let deliveries = snap.docs.map(d => d.data() as ApiDelivery);

    if (req.user?.role === 'motorista') {
      deliveries = deliveries.filter(d => d.entregadorId === req.user?.userId || d.motoristaId === req.user?.userId);
    }

    return res.json(deliveries);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar entregas' });
  }
});

app.post('/api/deliveries/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const newDeliveryData = req.body;

    const deliveryId = newDeliveryData.id || ('ent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const delivery: ApiDelivery = {
      ...newDeliveryData,
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
    const updates = req.body;

    const delRef = doc(firestoreDb, 'deliveries', id);
    const delSnap = await getDoc(delRef);
    if (!delSnap.exists()) {
      return res.status(404).json({ error: 'Entrega não encontrada' });
    }

    const updated = {
      ...delSnap.data(),
      ...updates,
      atualizadoEm: new Date().toISOString()
    };

    await setDoc(delRef, updated, { merge: true });
    return res.json({ success: true, delivery: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar entrega' });
  }
});

app.get('/api/drivers/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = query(collection(firestoreDb, 'drivers'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return res.json(snap.docs.map(d => d.data()));
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar motoristas' });
  }
});

app.post('/api/drivers/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const driverData = req.body;

    const driverId = driverData.id || ('drv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const driver: ApiDriver = {
      ...driverData,
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

app.get('/api/vehicles/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = query(collection(firestoreDb, 'vehicles'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return res.json(snap.docs.map(d => d.data()));
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar veículos' });
  }
});

app.post('/api/vehicles/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const vehicleData = req.body;

    const vehicleId = vehicleData.id || ('vec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const vehicle: ApiVehicle = {
      ...vehicleData,
      id: vehicleId,
      companyId
    };

    await setDoc(doc(firestoreDb, 'vehicles', vehicleId), vehicle);
    return res.json({ success: true, vehicle });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar veículo' });
  }
});

app.get('/api/users/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const q = query(collection(firestoreDb, 'usuarios'), where('companyId', '==', companyId));
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

app.post('/api/users/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { nome, email, senha, role, motoristaId } = req.body;

    if (!nome || !email || !senha || !role) {
      return res.status(400).json({ error: 'Preencha nome, e-mail, senha e perfil.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user already exists in Firestore
    const q = query(collection(firestoreDb, 'usuarios'), where('email', '==', cleanEmail));
    const existing = await getDocs(q);
    if (!existing.empty) {
      return res.status(400).json({ error: 'E-mail de usuário já cadastrado.' });
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
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

    await setDoc(doc(firestoreDb, 'usuarios', userId), newUser);

    if (role === 'motorista' && motoristaId) {
      await updateDoc(doc(firestoreDb, 'drivers', motoristaId), { userId });
    }

    const { senhaHash, ...userWithoutPassword } = newUser;
    return res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar usuário no banco central' });
  }
});

app.put('/api/users/:companyId/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const userRef = doc(firestoreDb, 'usuarios', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (updates.senha) {
      updates.senhaHash = hashPassword(updates.senha);
      delete updates.senha;
    }

    await updateDoc(userRef, updates);
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
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
