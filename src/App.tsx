/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, hashPassword } from './lib/db';
import { Entrega, Motorista, Veiculo, Usuario, Empresa, Cliente, RegistroAuditoria, UserRole } from './types';
import OperatorPanel from './components/OperatorPanel';
import DriverPanel from './components/DriverPanel';
import MasterPanel from './components/MasterPanel';
import OfflineStatusBanner from './components/OfflineStatusBanner';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import FastGestaoLogo from './components/FastGestaoLogo';
import BrandLogo from './components/BrandLogo';
import SplashScreen from './components/SplashScreen';
import { DEFAULT_DELIVERY_FORM_CONFIG } from './components/DeliveryFormConfigPanel';
import { applyThemeMode, applyCompanyTheme, getStoredThemeMode, ThemeMode } from './lib/themeConfig';
import { 
  Users, Shield, HelpCircle, LogOut, Key, Mail, Lock, Building, 
  User, Phone, ChevronRight, CheckCircle, RefreshCw, AlertCircle, Eye, EyeOff, Sun, Moon
} from 'lucide-react';

export default function App() {
  // Authentication & Tenant States
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Empresa | null>(null);
  const [supportModeCompany, setSupportModeCompany] = useState<Empresa | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode());

  // Apply theme when company changes or mode changes
  useEffect(() => {
    if (currentCompany?.themeConfig) {
      applyCompanyTheme(currentCompany.themeConfig);
    } else {
      applyThemeMode(themeMode);
    }
  }, [currentCompany, themeMode]);
  
  // Isolated Data States
  const [deliveries, setDeliveries] = useState<Entrega[]>([]);
  const [drivers, setDrivers] = useState<Motorista[]>([]);
  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [auditLogs, setAuditLogs] = useState<RegistroAuditoria[]>([]);

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
      }
      loadCompanyData(session.companyId);
      Database.syncCompanyData(session.companyId);
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
          }
          loadCompanyData(session.companyId);
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const loadCompanyData = (companyId: string) => {
    const comp = Database.getCompany(companyId);
    if (comp) {
      setCurrentCompany({ ...comp });
    }
    setDeliveries([...Database.getDeliveries(companyId)]);
    setDrivers([...Database.getDrivers(companyId)]);
    setVehicles([...Database.getVehicles(companyId)]);
    setUsers([...Database.getUsers(companyId)]);
    setClients([...Database.getClients(companyId)]);
    setAuditLogs([...Database.getAuditLogs(companyId)]);
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
      }
      loadCompanyData(res.user.companyId);
      await Database.syncCompanyData(res.user.companyId);
      loadCompanyData(res.user.companyId);
      
      // Initialize profile state
      setProfileName(res.user.nome);
      setProfileEmail(res.user.email);
      setProfilePhone(res.user.telefone || '');
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
  const handleAddDelivery = async (newDel: Omit<Entrega, 'id' | 'companyId' | 'criadoPor' | 'criadoEm' | 'atualizadoEm' | 'origem' | 'historico'>) => {
    if (!currentUser || !currentCompany) return;
    
    // Resolve entregador information directly from DB
    const dbUsers = Database.getUsers(currentUser.companyId);
    const dbDrivers = Database.getDrivers(currentUser.companyId);
    const drvObj = newDel.motoristaId ? dbDrivers.find(drv => drv.id === newDel.motoristaId) : undefined;
    const assocUser = newDel.motoristaId 
      ? dbUsers.find(u => u.motoristaId === newDel.motoristaId || u.id === newDel.motoristaId || (drvObj?.email && u.email?.toLowerCase() === drvObj.email.toLowerCase()) || (drvObj?.nome && u.nome?.toLowerCase() === drvObj.nome.toLowerCase())) 
      : undefined;

    const entregadorId = newDel.entregadorId || assocUser?.id || drvObj?.id || newDel.motoristaId || undefined;
    const entregadorNome = newDel.entregadorNome || drvObj?.nome || assocUser?.nome || undefined;

    // If an entregador was selected, the delivery immediately becomes 'aguardando_motorista' so the driver can see and start it
    const status = newDel.motoristaId ? 'aguardando_motorista' : 'venda_realizada';

    const deliveryId = 'ent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
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
      formSnapshot: currentCompany.deliveryFormConfig || DEFAULT_DELIVERY_FORM_CONFIG,
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

    setDeliveries(prev => [fullDelivery, ...prev.filter(d => d.id !== fullDelivery.id)]);
    await Database.saveSingleDelivery(currentUser.companyId, fullDelivery);
  };

  const handleUpdateDelivery = (id: string, updates: Partial<Entrega>) => {
    if (!currentUser || !currentCompany) return;

    const updated = deliveries.map(d => {
      if (d.id === id) {
        let finalUpdates = { ...updates };
        
        // If driver assignment is being updated
        if ('motoristaId' in updates || 'entregadorId' in updates) {
          const selectedId = updates.motoristaId || updates.entregadorId;
          if (selectedId) {
            const dbUsers = Database.getUsers(currentUser.companyId);
            const dbDrivers = Database.getDrivers(currentUser.companyId);
            const drvObj = dbDrivers.find(drv => drv.id === selectedId);
            const assocUser = dbUsers.find(u => u.motoristaId === selectedId || u.id === selectedId || (drvObj?.email && u.email?.toLowerCase() === drvObj.email.toLowerCase()) || (drvObj?.nome && u.nome?.toLowerCase() === drvObj.nome.toLowerCase()));

            finalUpdates.motoristaId = selectedId;
            finalUpdates.entregadorId = updates.entregadorId || assocUser?.id || drvObj?.id || selectedId;
            finalUpdates.entregadorNome = updates.entregadorNome || drvObj?.nome || assocUser?.nome || 'Entregador';
            
            // Advance status immediately to 'aguardando_motorista' so the driver can see and start it
            if (d.status === 'venda_realizada' || d.status === 'nf_emitida' || d.status === 'separacao') {
              finalUpdates.status = 'aguardando_motorista';
            }
          } else {
            finalUpdates.motoristaId = undefined;
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

  const handleDeleteDelivery = async (id: string, options?: { deleteFiles?: boolean; motivo?: string }) => {
    if (!currentUser || !currentCompany) return;
    setDeliveries(prev => prev.filter(d => d.id !== id));
    await Database.deleteDelivery(currentUser.companyId, id, {
      ...options,
      usuarioNome: currentUser.nome || currentUser.email,
      usuarioId: currentUser.id
    });
    loadCompanyData(currentUser.companyId);
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

  const handleAddUser = async (
    nome: string, 
    email: string, 
    role: UserRole, 
    motoristaId?: string, 
    senhaInitial?: string,
    telefone?: string,
    ativo: boolean = true
  ) => {
    if (!currentUser || !currentCompany) return;
    const initialPass = senhaInitial || '123456';
    const res = await Database.createUser(
      currentUser.companyId, 
      nome, 
      email, 
      initialPass, 
      role, 
      motoristaId,
      telefone,
      ativo
    );
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

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser || !currentCompany) return;
    const res = await Database.deleteUser(currentUser.companyId, userId);
    if (res.success) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    } else {
      alert(res.error || 'Erro ao excluir usuário.');
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
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-800">
        {/* Ambient abstract visual layout */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl p-6 md:p-8 relative z-10">
          <div className="flex flex-col items-center text-center mb-6">
            <BrandLogo
              size={120}
              className="w-[110px] h-[110px] md:w-[140px] md:h-[140px] object-contain object-center block mx-auto mb-[18px] md:mb-[24px]"
            />
            <p className="text-xs text-slate-500 font-medium">
              {authMode === 'login' && 'Faça login para gerenciar sua frota e entregas'}
              {authMode === 'register_company' && 'Cadastre sua empresa e inicie do zero'}
              {authMode === 'recover' && 'Insira seu e-mail para recuperar seu acesso'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Senha</label>
                  <button
                    type="button"
                    onClick={() => setAuthMode('recover')}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                Entrar no Painel
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {authMode === 'recover' && (
            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Seu E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
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
                className="w-full text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors py-1 block text-center"
              >
                Voltar para o Login
              </button>
            </form>
          )}

          <div className="text-[11px] text-slate-400 text-center mt-6">
            © 2026 FastGestão Entregas S.A. Todos os direitos reservados.
          </div>
        </div>
      </div>
    );
  }

  // IF MASTER USER LOGGED IN AND NOT IN SUPPORT MODE, SHOW MASTER PANEL DIRECTLY
  if (currentUser.role === 'master' && !supportModeCompany) {
    return (
      <MasterPanel
        currentUser={currentUser}
        companies={Database.getCompanies()}
        users={Database.getAllUsers()}
        masterAuditLogs={Database.getMasterAuditLogs()}
        customRoles={Database.getCustomRoles()}
        onCreateCompany={async (data) => Database.createCompanyMaster(data)}
        onUpdateCompany={async (id, updates) => Database.updateCompanyMaster(id, updates)}
        onDeleteCompany={async (id) => Database.deleteCompanyMaster(id)}
        onSaveCustomRole={async (role) => Database.saveCustomRole(role)}
        onEnterSupportMode={(comp) => {
          setSupportModeCompany(comp);
          setCurrentCompany(comp);
          loadCompanyData(comp.id);
        }}
        onLogout={handleLogout}
      />
    );
  }

  // APP INTERFACE FOR AUTHENTICATED STORE USERS OR MASTER IN SUPPORT MODE
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-sans text-slate-800">
      
      {/* OFFLINE STATUS BANNER */}
      <OfflineStatusBanner />

      {/* SUPPORT MODE STICKY BANNER */}
      {supportModeCompany && (
        <div className="bg-amber-500 text-slate-950 px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-md z-50 sticky top-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>🛠️ MODO DE SUPORTE MASTER ATIVO — Visualizando Painel da Empresa: <strong>{supportModeCompany.nome}</strong></span>
          </div>
          <button 
            onClick={() => {
              setSupportModeCompany(null);
              if (currentUser?.companyId) {
                const comp = Database.getCompany(currentUser.companyId);
                if (comp) setCurrentCompany(comp);
              }
            }}
            className="px-3 py-1 bg-slate-950 text-amber-400 hover:bg-slate-900 rounded-lg text-xs font-bold transition-colors shadow"
          >
            ← Voltar ao Painel Master
          </button>
        </div>
      )}

      {/* MY PROFILE DRAWER / BLOCK */}
      {activeProfileTab && (
        <div className="bg-white border-b border-slate-200 px-4 py-6 md:px-8 shadow-sm animate-fade-in print:hidden text-slate-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Configurações da Conta & Segurança
              </h2>
              <button 
                onClick={() => setActiveProfileTab(false)} 
                className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium"
              >
                Fechar Painel
              </button>
            </div>

            {profileError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Fields */}
              <form onSubmit={handleUpdateProfile} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Dados do Perfil</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail de Acesso</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors shadow-xs"
                >
                  Salvar Perfil
                </button>
              </form>

              {/* Password Change */}
              <form onSubmit={handleChangePass} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Alterar Senha</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Atual</label>
                  <input
                    type="password"
                    required
                    value={passOld}
                    onChange={(e) => setPassOld(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={passNew}
                    onChange={(e) => setPassNew(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-lg transition-colors shadow-xs"
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
        {currentUser.role !== 'entregador' && currentUser.role !== 'driver' && currentUser.role !== 'motorista' ? (
          <OperatorPanel
            currentUser={currentUser}
            company={currentCompany}
            onUpdateCompany={(updated) => setCurrentCompany(updated)}
            deliveries={deliveries}
            drivers={drivers}
            vehicles={vehicles}
            users={users}
            clients={clients}
            auditLogs={auditLogs}
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
            onDeleteUser={handleDeleteUser}
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

      {/* PWA INSTALL PROMPT */}
      <PwaInstallPrompt />
    </div>
  );
}
