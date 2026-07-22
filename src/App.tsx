/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, hashPassword } from './lib/db';
import { Entrega, Motorista, Veiculo, Usuario, Empresa } from './types';
import OperatorPanel from './components/OperatorPanel';
import DriverPanel from './components/DriverPanel';
import { DiagnosticTestsModal } from './components/DiagnosticTests';
import { 
  Users, Shield, HelpCircle, LogOut, Key, Mail, Lock, Building, 
  User, Phone, ChevronRight, CheckCircle, RefreshCw, AlertCircle, Eye, EyeOff
} from 'lucide-react';

export default function App() {
  // Authentication & Tenant States
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Empresa | null>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  
  // Isolated Data States
  const [deliveries, setDeliveries] = useState<Entrega[]>([]);
  const [drivers, setDrivers] = useState<Motorista[]>([]);
  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);

  // Auth Screen Flow States
  const [authMode, setAuthMode] = useState<'login' | 'register_company' | 'recover'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register Company Form States
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Password Recovery Form States
  const [recoverEmail, setRecoverEmail] = useState('');

  // UI States
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState(false);

  // Profile Edit States
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [passOld, setPassOld] = useState('');
  const [passNew, setPassNew] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Load active session on mount
  useEffect(() => {
    const session = Database.getCurrentSession();
    if (session) {
      setCurrentUser(session);
      const comp = Database.getCompany(session.companyId);
      if (comp) {
        setCurrentCompany(comp);
        loadCompanyData(session.companyId);
      } else {
        // Fallback: company lost
        Database.setCurrentSession(null);
        setCurrentUser(null);
      }
    }
  }, []);

  // Listen to real-time database updates across devices and tabs
  useEffect(() => {
    const unsubscribe = Database.subscribe(() => {
      if (currentUser) {
        loadCompanyData(currentUser.companyId);
      } else {
        const session = Database.getCurrentSession();
        if (session) {
          setCurrentUser(session);
          const comp = Database.getCompany(session.companyId);
          if (comp) {
            setCurrentCompany(comp);
            loadCompanyData(session.companyId);
          }
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const loadCompanyData = (companyId: string) => {
    setDeliveries(Database.getDeliveries(companyId));
    setDrivers(Database.getDrivers(companyId));
    setVehicles(Database.getVehicles(companyId));
    setUsers(Database.getUsers(companyId));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!loginEmail || !loginPassword) {
      setAuthError('Por favor preencha todos os campos.');
      return;
    }

    const res = await Database.login(loginEmail, loginPassword);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      const comp = Database.getCompany(res.user.companyId);
      if (comp) {
        setCurrentCompany(comp);
        loadCompanyData(res.user.companyId);
        
        // Initialize profile state
        setProfileName(res.user.nome);
        setProfileEmail(res.user.email);
        setProfilePhone(res.user.telefone || '');
      }
    } else {
      setAuthError(res.error || 'Erro ao realizar login.');
    }
  };

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!regCompanyName || !regAdminName || !regEmail || !regPassword) {
      setAuthError('Por favor, preencha os campos obrigatórios (*).');
      return;
    }

    const res = await Database.registerCompany(
      regCompanyName,
      regAdminName,
      regEmail,
      regPassword,
      regPhone
    );

    if (res.success && res.user) {
      setAuthSuccess('Empresa cadastrada com sucesso!');
      setCurrentUser(res.user);
      const comp = Database.getCompany(res.user.companyId);
      if (comp) {
        setCurrentCompany(comp);
        loadCompanyData(res.user.companyId);
        
        setProfileName(res.user.nome);
        setProfileEmail(res.user.email);
        setProfilePhone(res.user.telefone || '');
      }
      setAuthMode('login');
    } else {
      setAuthError(res.error || 'Erro ao registrar empresa.');
    }
  };

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!recoverEmail) {
      setAuthError('Informe o e-mail cadastrado.');
      return;
    }

    const res = Database.recoverPassword(recoverEmail);
    if (res.success) {
      setAuthSuccess(res.message);
    } else {
      setAuthError(res.message);
    }
  };

  const handleLogout = () => {
    Database.setCurrentSession(null);
    setCurrentUser(null);
    setCurrentCompany(null);
    setDeliveries([]);
    setDrivers([]);
    setVehicles([]);
    setUsers([]);
    setActiveProfileTab(false);
    setLoginPassword('');
  };

  // State Updates Wrapper for Multi-tenant Local Sync
  const handleAddDelivery = (newDel: Omit<Entrega, 'id' | 'companyId' | 'criadoPor' | 'criadoEm' | 'atualizadoEm' | 'origem' | 'historico'>) => {
    if (!currentUser || !currentCompany) return;
    
    // Resolve entregador information directly from DB
    const dbUsers = Database.getUsers(currentUser.companyId);
    const dbDrivers = Database.getDrivers(currentUser.companyId);
    const drvObj = newDel.motoristaId ? dbDrivers.find(drv => drv.id === newDel.motoristaId) : undefined;
    const assocUser = newDel.motoristaId 
      ? dbUsers.find(u => u.motoristaId === newDel.motoristaId || (drvObj?.email && u.email?.toLowerCase() === drvObj.email.toLowerCase()) || (drvObj?.nome && u.nome?.toLowerCase() === drvObj.nome.toLowerCase())) 
      : undefined;

    const entregadorId = newDel.entregadorId || assocUser?.id || undefined;
    const entregadorNome = newDel.entregadorNome || drvObj?.nome || assocUser?.nome || undefined;

    // If an entregador was selected, the delivery immediately becomes 'aguardando_motorista' so the driver can see and start it
    const status = newDel.motoristaId ? 'aguardando_motorista' : 'venda_realizada';

    const deliveryId = 'ent_' + (1000 + deliveries.length + 1);
    const fullDelivery: Entrega = {
      ...newDel,
      id: deliveryId,
      companyId: currentUser.companyId,
      criadoPor: currentUser.nome,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      origem: 'manual',
      status,
      entregadorId,
      entregadorNome,
      historico: [
        {
          id: 'h_' + Date.now(),
          statusAnterior: 'venda_realizada',
          statusNovo: status,
          alteradoPor: currentUser.nome,
          alteradoEm: new Date().toISOString(),
          motivo: newDel.motoristaId 
            ? `Pedido cadastrado e atribuído diretamente ao entregador ${entregadorNome}.`
            : 'Pedido recebido e cadastrado no sistema da empresa.'
        }
      ]
    };

    // Console logs requested for delivery creation
    console.log("=== ENTREGA CRIADA ===");
    console.log("ID da entrega:", deliveryId);
    console.log("Nome do entregador selecionado:", entregadorNome || "Nenhum");
    console.log("ID do entregador selecionado (motoristaId):", newDel.motoristaId || "Nenhum");
    console.log("entregadorId salvo:", entregadorId || "Nenhum");
    console.log("entregadorNome salvo:", entregadorNome || "Nenhum");
    console.log("======================");

    const updated = [fullDelivery, ...deliveries];
    setDeliveries(updated);
    Database.saveDeliveries(currentUser.companyId, updated);
  };

  const handleUpdateDelivery = (id: string, updates: Partial<Entrega>) => {
    if (!currentUser || !currentCompany) return;

    const updated = deliveries.map(d => {
      if (d.id === id) {
        let finalUpdates = { ...updates };
        
        // If driver assignment is being updated
        if ('motoristaId' in updates) {
          const selectedId = updates.motoristaId;
          if (selectedId) {
            const dbUsers = Database.getUsers(currentUser.companyId);
            const dbDrivers = Database.getDrivers(currentUser.companyId);
            const drvObj = dbDrivers.find(drv => drv.id === selectedId);
            const assocUser = dbUsers.find(u => u.motoristaId === selectedId || (drvObj?.email && u.email?.toLowerCase() === drvObj.email.toLowerCase()) || (drvObj?.nome && u.nome?.toLowerCase() === drvObj.nome.toLowerCase()));

            finalUpdates.entregadorId = updates.entregadorId || assocUser?.id || undefined;
            finalUpdates.entregadorNome = updates.entregadorNome || drvObj?.nome || assocUser?.nome || undefined;
            
            // Advance status immediately to 'aguardando_motorista' so the driver can see and start it
            if (d.status === 'venda_realizada' || d.status === 'nf_emitida' || d.status === 'separacao') {
              finalUpdates.status = 'aguardando_motorista';
            }
          } else {
            finalUpdates.entregadorId = undefined;
            finalUpdates.entregadorNome = undefined;
          }
        }

        return {
          ...d,
          ...finalUpdates,
          atualizadoEm: new Date().toISOString()
        };
      }
      return d;
    });
    setDeliveries(updated);
    Database.saveDeliveries(currentUser.companyId, updated);
  };

  const handleDeleteDelivery = (id: string) => {
    if (!currentUser || !currentCompany) return;
    const updated = deliveries.filter(d => d.id !== id);
    setDeliveries(updated);
    Database.saveDeliveries(currentUser.companyId, updated);
  };

  const handleAddDriver = async (newDrv: Omit<Motorista, 'id' | 'companyId' | 'criadoEm'>) => {
    if (!currentUser || !currentCompany) return;

    await Database.createDriver(currentUser.companyId, newDrv);

    // Reload both from database to keep in-memory state perfectly updated and synchronized
    setDrivers(Database.getDrivers(currentUser.companyId));
    setUsers(Database.getUsers(currentUser.companyId));
  };

  const handleUpdateDriver = (id: string, updates: Partial<Motorista>) => {
    if (!currentUser || !currentCompany) return;
    const updated = drivers.map(d => d.id === id ? { ...d, ...updates } : d);
    setDrivers(updated);
    Database.saveDrivers(currentUser.companyId, updated);
  };

  const handleDeleteDriver = (id: string) => {
    if (!currentUser || !currentCompany) return;
    
    const updated = drivers.filter(d => d.id !== id);
    setDrivers(updated);
    Database.saveDrivers(currentUser.companyId, updated);

    // Deactivate linked user account
    const linkedUser = users.find(u => u.motoristaId === id);
    if (linkedUser) {
      Database.updateUserStatus(linkedUser.id, false);
      setUsers(Database.getUsers(currentUser.companyId));
    }
  };

  const handleAddVehicle = (newVei: Omit<Veiculo, 'id' | 'companyId'>) => {
    if (!currentUser || !currentCompany) return;

    const veiId = 'vei_' + (vehicles.length + 1);
    const fullVehicle: Veiculo = {
      ...newVei,
      id: veiId,
      companyId: currentUser.companyId
    };
    const updated = [...vehicles, fullVehicle];
    setVehicles(updated);
    Database.saveVehicles(currentUser.companyId, updated);
  };

  const handleUpdateVehicle = (id: string, updates: Partial<Veiculo>) => {
    if (!currentUser || !currentCompany) return;
    const updated = vehicles.map(v => v.id === id ? { ...v, ...updates } : v);
    setVehicles(updated);
    Database.saveVehicles(currentUser.companyId, updated);
  };

  const handleDeleteVehicle = (id: string) => {
    if (!currentUser || !currentCompany) return;
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
    Database.saveVehicles(currentUser.companyId, updated);
  };

  const handleAddUser = async (nome: string, email: string, role: 'operador' | 'motorista', motoristaId?: string) => {
    if (!currentUser || !currentCompany) return;
    const res = await Database.createUser(currentUser.companyId, nome, email, '123456', role, motoristaId);
    if (res.success) {
      setUsers(Database.getUsers(currentUser.companyId));
      setDrivers(Database.getDrivers(currentUser.companyId));
    } else {
      alert(res.error || 'Erro ao criar usuário.');
    }
  };

  const handleUpdateUserStatus = (userId: string, ativo: boolean) => {
    if (!currentUser || !currentCompany) return;
    const success = Database.updateUserStatus(userId, ativo);
    if (success) {
      setUsers(Database.getUsers(currentUser.companyId));
    }
  };

  // Profile Edit Submission
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    
    if (!currentUser) return;

    const res = Database.updateProfile(currentUser.id, profileName, profileEmail, profilePhone);
    if (res.success) {
      setProfileSuccess('Perfil atualizado com sucesso!');
      // Update local state
      const updatedSession = Database.getCurrentSession();
      if (updatedSession) setCurrentUser(updatedSession);
    } else {
      setProfileError(res.error || 'Erro ao atualizar perfil.');
    }
  };

  const handleChangePass = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!currentUser) return;
    if (!passOld || !passNew) {
      setProfileError('Informe a senha atual e a nova.');
      return;
    }

    const res = Database.changePassword(currentUser.id, passOld, passNew);
    if (res.success) {
      setProfileSuccess('Senha alterada com sucesso!');
      setPassOld('');
      setPassNew('');
    } else {
      setProfileError(res.error || 'Erro ao alterar senha.');
    }
  };

  // If NOT authenticated, show the modern, high-polished login/register portal
  if (!currentUser || !currentCompany) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Ambient abstract visual layout */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 relative z-10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 mb-3">
              F
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">FastGestão Entregas</h1>
            <p className="text-sm text-slate-400 mt-1">
              {authMode === 'login' && 'Faça login para gerenciar sua frota e entregas'}
              {authMode === 'register_company' && 'Cadastre sua empresa e inicie do zero'}
              {authMode === 'recover' && 'Insira seu e-mail para recuperar seu acesso'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Senha</label>
                  <button
                    type="button"
                    onClick={() => setAuthMode('recover')}
                    className="text-xs text-amber-500 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
              >
                Entrar no Painel
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="relative my-6 flex items-center">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="px-3 text-xs text-slate-500 uppercase tracking-widest bg-slate-900">Novo por aqui?</span>
                <div className="flex-1 border-t border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setAuthSuccess(null);
                  setAuthMode('register_company');
                }}
                className="w-full border border-slate-800 text-slate-300 hover:text-white py-2.5 rounded-xl font-bold text-sm bg-slate-950/40 hover:bg-slate-950 transition-colors flex items-center justify-center gap-1.5"
              >
                <Building className="w-4 h-4 text-slate-500" />
                Cadastrar Nova Empresa
              </button>

              <div className="relative my-6 flex items-center">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="px-3 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900">Auditoria</span>
                <div className="flex-1 border-t border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={() => setShowDiagnosticModal(true)}
                className="w-full border border-dashed border-amber-500/50 text-amber-400 hover:text-amber-300 py-2.5 rounded-xl font-bold text-xs bg-amber-950/20 hover:bg-amber-950/40 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                🔬 Executar Auditoria de Consistência (Ponto 9)
              </button>
            </form>
          )}

          {authMode === 'register_company' && (
            <form onSubmit={handleRegisterCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nome da Empresa *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    placeholder="Ex: Transportes Rapidez Ltda"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nome Completo do Admin *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regAdminName}
                    onChange={(e) => setRegAdminName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">E-mail do Administrador *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="admin@empresa.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Senha de Acesso *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Telefone/WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
              >
                Concluir Cadastro
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setAuthSuccess(null);
                  setAuthMode('login');
                }}
                className="w-full text-xs text-slate-400 hover:text-white transition-colors py-1 block text-center"
              >
                Voltar para o Login
              </button>
            </form>
          )}

          {authMode === 'recover' && (
            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Seu E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
              >
                Enviar Instruções
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setAuthSuccess(null);
                  setAuthMode('login');
                }}
                className="w-full text-xs text-slate-400 hover:text-white transition-colors py-1 block text-center"
              >
                Voltar para o Login
              </button>
            </form>
          )}

          <div className="text-[11px] text-slate-600 text-center mt-6">
            © 2026 FastGestão Entregas S.A. Todos os direitos reservados.
          </div>
        </div>
      </div>
    );
  }

  // APP INTERFACE FOR AUTHENTICATED USER
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      
      {/* PROFESSIONAL LOGGED-IN HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-black text-lg shadow-md shrink-0">
            F
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              {currentCompany.nome}
              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                Sessão Segura
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Ambiente Corporativo Isolado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User badge and action */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-white">{currentUser.nome}</span>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
              {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'operador' ? 'Operador' : 'Entregador'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveProfileTab(!activeProfileTab)}
              className={`p-2 rounded-xl text-slate-300 hover:text-white transition-all border ${activeProfileTab ? 'bg-slate-800 border-amber-500/50 text-amber-500' : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800'}`}
              title="Meu Perfil / Alterar Senha"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-950/20 text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/30 transition-all"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MY PROFILE DRAWER / BLOCK */}
      {activeProfileTab && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-6 md:px-8 shadow-inner animate-fade-in print:hidden">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Configurações da Conta & Segurança
              </h2>
              <button 
                onClick={() => setActiveProfileTab(false)} 
                className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg"
              >
                Fechar Painel
              </button>
            </div>

            {profileError && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Fields */}
              <form onSubmit={handleUpdateProfile} className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Dados do Perfil</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail de Acesso</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors"
                >
                  Salvar Perfil
                </button>
              </form>

              {/* Password Change */}
              <form onSubmit={handleChangePass} className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Alterar Senha</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Senha Atual</label>
                  <input
                    type="password"
                    required
                    value={passOld}
                    onChange={(e) => setPassOld(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={passNew}
                    onChange={(e) => setPassNew(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 font-bold text-xs rounded-lg border border-slate-700 transition-colors"
                >
                  Atualizar Senha
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE USER PANEL BASED ON ASSIGNED ROLE */}
      <div className="flex-1 overflow-hidden">
        {currentUser.role === 'admin' || currentUser.role === 'operador' ? (
          <OperatorPanel
            currentUser={currentUser}
            company={currentCompany}
            deliveries={deliveries}
            drivers={drivers}
            vehicles={vehicles}
            users={users}
            onAddDelivery={handleAddDelivery}
            onUpdateDelivery={handleUpdateDelivery}
            onDeleteDelivery={handleDeleteDelivery}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onDeleteDriver={handleDeleteDriver}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onAddUser={handleAddUser}
            onUpdateUserStatus={handleUpdateUserStatus}
            onLogout={handleLogout}
          />
        ) : (
          <div className="h-full bg-slate-950 overflow-y-auto">
            <DriverPanel
              currentUser={currentUser}
              deliveries={deliveries}
              drivers={drivers}
              vehicles={vehicles}
              onUpdateDelivery={handleUpdateDelivery}
              onLogout={handleLogout}
            />
          </div>
        )}
      </div>

      {showDiagnosticModal && (
        <DiagnosticTestsModal 
          onClose={() => setShowDiagnosticModal(false)}
          onRefreshAllData={() => {
            const sess = Database.getCurrentSession();
            if (sess) {
              loadCompanyData(sess.companyId);
            }
          }}
        />
      )}

    </div>
  );
}
