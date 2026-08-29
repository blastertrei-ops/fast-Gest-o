import React, { useState } from 'react';
import { Database } from '../lib/db';
import CepInput from './CepInput';
import BrandLogo from './BrandLogo';
import { CompanyStatusBadge } from './masterPanel/CompanyStatusBadge';
import { DEFAULT_LIMITS, DEFAULT_PERMISSIONS, formatCurrency, formatDate } from './masterPanel/helpers';
import { 
  Empresa, Usuario, MasterAuditLog, PerfilPermissoes, CompanyStatus, PlanoTipo, CompanyLimits, GranularPermissions, UserRole 
} from '../types';
import { 
  Building, Users, User, Shield, DollarSign, Activity, Lock, Unlock, AlertTriangle, 
  Plus, Edit3, Trash2, Search, Filter, Eye, LogOut, CheckCircle, XCircle, Clock, 
  TrendingUp, Calendar, FileText, ChevronRight, Zap, RefreshCw, Layers, Key
} from 'lucide-react';

interface MasterPanelProps {
  currentUser: Usuario;
  companies: Empresa[];
  users: Usuario[];
  masterAuditLogs: MasterAuditLog[];
  customRoles: PerfilPermissoes[];
  onCreateCompany: (companyData: any) => Promise<{ success: boolean; error?: string }>;
  onUpdateCompany: (companyId: string, updates: Partial<Empresa>) => Promise<{ success: boolean; error?: string }>;
  onDeleteCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>;
  onSaveCustomRole: (roleData: Partial<PerfilPermissoes>) => Promise<{ success: boolean; error?: string }>;
  onEnterSupportMode: (company: Empresa) => void;
  onLogout: () => void;
}

export default function MasterPanel({
  currentUser,
  companies,
  users,
  masterAuditLogs,
  customRoles,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
  onSaveCustomRole,
  onEnterSupportMode,
  onLogout
}: MasterPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'users' | 'plans' | 'roles' | 'finance' | 'audit'>('overview');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // User Management State & Batch Selection
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<Usuario | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [newUserForm, setNewUserForm] = useState({
    companyId: '',
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmSenha: '',
    role: 'admin' as UserRole,
    ativo: true
  });

  // User Selection & Batch Action State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Usuario | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    nome: '',
    email: '',
    role: 'admin' as UserRole,
    companyId: '',
    ativo: true
  });
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [batchRoleValue, setBatchRoleValue] = useState<UserRole>('admin');
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showBatchPasswordModal, setShowBatchPasswordModal] = useState(false);
  const [batchPasswordValue, setBatchPasswordValue] = useState('');

  // Company Selection & Batch Action State
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [showCompanyBatchDeleteModal, setShowCompanyBatchDeleteModal] = useState(false);
  const [showCompanyBatchPasswordModal, setShowCompanyBatchPasswordModal] = useState(false);
  const [companyBatchPasswordValue, setCompanyBatchPasswordValue] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Empresa | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Loading & Alert state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Company Form State
  const [newComp, setNewComp] = useState({
    nome: '',
    nomeFantasia: '',
    cnpj: '',
    responsavel: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
    cidade: '',
    planoContratado: 'Profissional' as PlanoTipo,
    valorPlano: 199,
    dataInicio: new Date().toISOString().split('T')[0],
    dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ativa' as CompanyStatus,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    limites: { ...DEFAULT_LIMITS }
  });

  // Edit Company Form State
  const [editComp, setEditComp] = useState<Partial<Empresa>>({});

  // Custom Role Form State
  const [roleForm, setRoleForm] = useState<{
    id?: string;
    nome: string;
    descricao: string;
    companyId: string;
    permissoes: GranularPermissions;
  }>({
    nome: '',
    descricao: '',
    companyId: 'global',
    permissoes: { ...DEFAULT_PERMISSIONS }
  });

  // Filtered companies
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = (c.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.cnpj || '').includes(searchQuery) ||
                          (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesPlan = planFilter === 'all' || c.planoContratado === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const isAllCompaniesSelected = filteredCompanies.length > 0 && filteredCompanies.every(c => selectedCompanyIds.includes(c.id));

  const handleSelectAllCompanies = (checked: boolean) => {
    if (checked) {
      const allIds = filteredCompanies.map(c => c.id);
      setSelectedCompanyIds(Array.from(new Set([...selectedCompanyIds, ...allIds])));
    } else {
      const filteredIds = new Set(filteredCompanies.map(c => c.id));
      setSelectedCompanyIds(selectedCompanyIds.filter(id => !filteredIds.has(id)));
    }
  };

  const handleToggleCompanySelect = (companyId: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(companyId) ? prev.filter(id => id !== companyId) : [...prev, companyId]
    );
  };

  // SaaS KPIs
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'ativa').length;
  const suspendedCompanies = companies.filter(c => c.status === 'suspensa').length;
  const blockedCompanies = companies.filter(c => c.status === 'bloqueada').length;
  const canceledCompanies = companies.filter(c => c.status === 'cancelada').length;

  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const totalDrivers = users.filter(u => u.role === 'motorista').length;

  // Revenue Projections
  const mrr = companies
    .filter(c => c.status === 'ativa')
    .reduce((acc, c) => acc + (c.valorPlano || 199), 0);
  const arr = mrr * 12;

  // Handlers
  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const res = await onCreateCompany(newComp);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Empresa e Administrador cadastrados com sucesso!' });
      setShowCreateModal(false);
      setNewComp({
        nome: '',
        nomeFantasia: '',
        cnpj: '',
        responsavel: '',
        telefone: '',
        email: '',
        planoContratado: 'Profissional',
        valorPlano: 199,
        dataInicio: new Date().toISOString().split('T')[0],
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'ativa',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        limites: { ...DEFAULT_LIMITS }
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao cadastrar empresa.' });
    }
  };

  const handleEditCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setIsSubmitting(true);
    setFeedback(null);

    const res = await onUpdateCompany(selectedCompany.id, editComp);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: `Dados da empresa ${selectedCompany.nome} atualizados.` });
      setShowEditModal(false);
      setSelectedCompany(null);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao atualizar empresa.' });
    }
  };

  const handleToggleStatus = async (company: Empresa, newStatus: CompanyStatus) => {
    const res = await onUpdateCompany(company.id, { status: newStatus });
    if (res.success) {
      setFeedback({ type: 'success', message: `Status da empresa ${company.nome} alterado para "${newStatus.toUpperCase()}".` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar status.' });
    }
  };

  const handleDeleteCompanyClick = async (company: Empresa) => {
    if (!window.confirm(`ATENÇÃO MASTER: Deseja realmente excluir a empresa "${company.nome}"? Esta ação removerá os acessos e dados!`)) {
      return;
    }
    const res = await onDeleteCompany(company.id);
    if (res.success) {
      setFeedback({ type: 'success', message: `Empresa ${company.nome} removida do sistema.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao excluir empresa.' });
    }
  };

  const handleSaveRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await onSaveCustomRole(roleForm);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Perfil de permissões salvo com sucesso.' });
      setShowRoleModal(false);
      setRoleForm({
        nome: '',
        descricao: '',
        companyId: 'global',
        permissoes: { ...DEFAULT_PERMISSIONS }
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao salvar perfil.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 flex flex-col font-sans">
      
      {/* MASTER TOP HEADER */}
      <header className="bg-[#132238] border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between shadow-md text-white">
        <div className="flex items-center gap-4">
          <BrandLogo size={40} className="w-[40px] h-[40px] object-contain shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">FAST — PAINEL MASTER</h1>
              <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">Gestão Global Multiempresas, Licenciamento & Faturamento SaaS</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{currentUser.nome}</p>
            <p className="text-[11px] text-slate-300">{currentUser.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className={`px-6 py-3 border-b text-xs font-semibold flex items-center justify-between animate-fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-800">✕</button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'overview' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          Visão Geral SaaS
        </button>

        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'companies' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Gerenciar Lojas ({companies.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'users' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários Global ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'finance' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Painel Financeiro
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'roles' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          Perfis & Permissões
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'plans' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Planos & Licenças
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Auditoria Master ({masterAuditLogs.length})
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 page-content space-y-6 overflow-y-auto">

        {/* TAB 1: VISÃO GERAL SAAS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Lojas</span>
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 mb-1">{totalCompanies}</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                  <span className="text-emerald-700 font-bold">{activeCompanies} ativas</span> • 
                  <span className="text-amber-700 font-bold">{suspendedCompanies} suspensas</span> • 
                  <span className="text-rose-700 font-bold">{blockedCompanies} bloqueadas</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">MRR Projetado</span>
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-emerald-600 mb-1">{formatCurrency(mrr)}</div>
                <div className="text-[11px] text-slate-500 font-medium">
                  ARR Estimado: <strong className="text-slate-900">{formatCurrency(arr)}</strong>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usuários do Sistema</span>
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 mb-1">{totalUsers}</div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {totalAdmins} Admins • {totalDrivers} Entregadores
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status da Plataforma</span>
                  <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-emerald-600 mb-1">100% Online</div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Isolamento Multi-Tenant Ativo
                </div>
              </div>

            </div>

            {/* RECENT COMPANIES LIST BRIEF */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs text-slate-800">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-500" />
                  Últimas Lojas Cadastradas
                </h3>
                <button 
                  onClick={() => setActiveTab('companies')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Ver Todas ({companies.length})
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.slice(0, 6).map(comp => (
                  <div key={comp.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{comp.nome}</h4>
                        <p className="text-[11px] text-slate-500">{comp.nomeFantasia || comp.cnpj || 'Sem CNPJ'}</p>
                      </div>
                      <CompanyStatusBadge status={comp.status} />
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1 mb-3 pt-2 border-t border-slate-200">
                      <div>Plano: <strong className="text-slate-900">{comp.planoContratado || 'Profissional'}</strong> ({formatCurrency(comp.valorPlano || 199)})</div>
                      <div>Vencimento: <span className="text-slate-700">{formatDate(comp.dataVencimento)}</span></div>
                    </div>

                    <button
                      onClick={() => onEnterSupportMode(comp)}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      Acessar no Modo Suporte
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: GERENCIAR EMPRESAS (LOJAS) */}
        {activeTab === 'companies' && (
          <div className="space-y-6">

            {/* HEADER ACTIONS & FILTERS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex-1 w-full flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nome, CNPJ, e-mail..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="ativa">Ativas</option>
                  <option value="suspensa">Suspensas</option>
                  <option value="bloqueada">Bloqueadas</option>
                  <option value="cancelada">Canceladas</option>
                </select>

                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todos os Planos</option>
                  <option value="Profissional">Profissional</option>
                  <option value="Mensal">Mensal</option>
                  <option value="Anual">Anual</option>
                  <option value="Vitalicio">Vitalício</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full md:w-auto px-4 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Nova Empresa
              </button>

            </div>

            {/* SELECTION ACTION BAR FOR GERENCIAR LOJAS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={isAllCompaniesSelected}
                    onChange={(e) => handleSelectAllCompanies(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                  />
                  <span>Selecionar Todas</span>
                </label>

                <div className="text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-900/40 px-3 py-1.5 rounded-xl">
                  {selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'loja selecionada' : 'lojas selecionadas'}
                </div>

                {selectedCompanyIds.length > 0 && (
                  <button
                    onClick={() => setSelectedCompanyIds([])}
                    className="text-[11px] text-slate-400 hover:text-white underline font-semibold"
                  >
                    Desmarcar todas
                  </button>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={selectedCompanyIds.length !== 1}
                  onClick={() => {
                    if (selectedCompanyIds.length !== 1) return;
                    const comp = companies.find(c => c.id === selectedCompanyIds[0]);
                    if (comp) {
                      setSelectedCompany(comp);
                      setEditComp({ ...comp });
                      setShowEditModal(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    selectedCompanyIds.length === 1
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400 shadow-sm'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                  title={selectedCompanyIds.length > 1 ? 'Selecione apenas uma loja para editar.' : 'Editar Loja / Licença'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </button>

                <button
                  disabled={selectedCompanyIds.length === 0}
                  onClick={async () => {
                    if (selectedCompanyIds.length === 0) return;
                    setIsSubmitting(true);
                    await Database.updateCompaniesStatusBatchMaster(selectedCompanyIds, 'ativa');
                    setIsSubmitting(false);
                    setFeedback({ type: 'success', message: `${selectedCompanyIds.length} loja(s) reativada(s) com sucesso.` });
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    selectedCompanyIds.length > 0
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Ativar
                </button>

                <button
                  disabled={selectedCompanyIds.length === 0}
                  onClick={async () => {
                    if (selectedCompanyIds.length === 0) return;
                    setIsSubmitting(true);
                    await Database.updateCompaniesStatusBatchMaster(selectedCompanyIds, 'suspensa');
                    setIsSubmitting(false);
                    setFeedback({ type: 'success', message: `${selectedCompanyIds.length} loja(s) desativada(s) / suspensa(s) com sucesso.` });
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    selectedCompanyIds.length > 0
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Desativar
                </button>

                <button
                  disabled={selectedCompanyIds.length === 0}
                  onClick={async () => {
                    if (selectedCompanyIds.length === 0) return;
                    setIsSubmitting(true);
                    await Database.updateCompaniesStatusBatchMaster(selectedCompanyIds, 'bloqueada');
                    setIsSubmitting(false);
                    setFeedback({ type: 'success', message: `${selectedCompanyIds.length} loja(s) bloqueada(s) com sucesso.` });
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    selectedCompanyIds.length > 0
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800 hover:bg-amber-900/60'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Bloquear
                </button>

                <button
                  disabled={selectedCompanyIds.length === 0}
                  onClick={async () => {
                    if (selectedCompanyIds.length === 0) return;
                    setIsSubmitting(true);
                    await Database.updateCompaniesStatusBatchMaster(selectedCompanyIds, 'ativa');
                    setIsSubmitting(false);
                    setFeedback({ type: 'success', message: `${selectedCompanyIds.length} loja(s) desbloqueada(s) com sucesso.` });
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    selectedCompanyIds.length > 0
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Desbloquear
                </button>

                <button
                  disabled={selectedCompanyIds.length !== 1}
                  onClick={() => {
                    if (selectedCompanyIds.length !== 1) return;
                    const comp = companies.find(c => c.id === selectedCompanyIds[0]);
                    if (comp) {
                      onEnterSupportMode(comp);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    selectedCompanyIds.length === 1
                      ? 'bg-blue-950/60 text-blue-300 border-blue-800 hover:bg-blue-900/60'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                  title="Acessar painel da loja selecionada em Modo Suporte"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Modo Suporte
                </button>

                <button
                  disabled={selectedCompanyIds.length === 0}
                  onClick={() => {
                    if (selectedCompanyIds.length === 0) return;
                    setShowCompanyBatchPasswordModal(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    selectedCompanyIds.length > 0
                      ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  Resetar Senha
                </button>

                <button
                  disabled={selectedCompanyIds.length === 0}
                  onClick={() => {
                    if (selectedCompanyIds.length === 0) return;
                    setShowCompanyBatchDeleteModal(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                    selectedCompanyIds.length > 0
                      ? 'bg-red-950/60 text-red-400 border-red-800 hover:bg-red-900/60'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>

            {/* COMPANIES TABLE WITH SELECTION COLUMNS & NO ROW ACTION BUTTONS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllCompaniesSelected}
                          onChange={(e) => handleSelectAllCompanies(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Empresa / Razão</th>
                      <th className="px-4 py-3">Contato & Admin</th>
                      <th className="px-4 py-3">Plano & Valor</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Nenhuma loja encontrada com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map(comp => {
                        const isSelected = selectedCompanyIds.includes(comp.id);
                        return (
                          <tr 
                            key={comp.id} 
                            onClick={() => handleToggleCompanySelect(comp.id)}
                            className={`transition-colors cursor-pointer ${isSelected ? 'bg-amber-950/25 border-l-2 border-amber-500' : 'hover:bg-slate-800/40'}`}
                          >
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleCompanySelect(comp.id)}
                                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-bold text-white">{comp.nome}</div>
                              <div className="text-[11px] text-slate-400">{comp.nomeFantasia || comp.cnpj || 'Sem CNPJ informado'}</div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-200">{comp.responsavel || 'N/A'}</div>
                              <div className="text-[11px] text-slate-400">{comp.email} • {comp.telefone || 'Sem tel.'}</div>
                            </td>

                            <td className="px-4 py-3">
                              <span className="font-bold text-amber-400">{comp.planoContratado || 'Profissional'}</span>
                              <div className="text-[11px] text-slate-400">{formatCurrency(comp.valorPlano || 199)}</div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-300">{formatDate(comp.dataVencimento)}</div>
                            </td>

                            <td className="px-4 py-3">
                              <CompanyStatusBadge status={comp.status} dark />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB: GERENCIAR USUÁRIOS GLOBAL */}
        {activeTab === 'users' && (() => {
          const filteredUsersList = users.filter(u => {
            const q = userSearchQuery.toLowerCase();
            const matchQ = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
            const matchR = userRoleFilter === 'all' || u.role === userRoleFilter;
            return matchQ && matchR;
          });

          const isAllSelected = filteredUsersList.length > 0 && filteredUsersList.every(u => selectedUserIds.includes(u.id));

          const handleSelectAll = (checked: boolean) => {
            if (checked) {
              const allIds = filteredUsersList.map(u => u.id);
              setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...allIds])));
            } else {
              const filteredIds = new Set(filteredUsersList.map(u => u.id));
              setSelectedUserIds(selectedUserIds.filter(id => !filteredIds.has(id)));
            }
          };

          const handleToggleUserSelect = (userId: string) => {
            setSelectedUserIds(prev =>
              prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
            );
          };

          return (
            <div className="space-y-4">

              {/* HEADER ACTIONS & FILTERS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                
                <div className="flex-1 w-full flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Buscar por nome ou e-mail..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">Todos os Perfis</option>
                    <option value="master">Master</option>
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                    <option value="motorista">Entregador</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="w-full md:w-auto px-4 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Novo Usuário
                </button>

              </div>

              {/* ACTION BAR FOR SELECTED USERS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                    />
                    <span>Selecionar Todos</span>
                  </label>

                  <div className="text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-900/40 px-3 py-1.5 rounded-xl">
                    {selectedUserIds.length} {selectedUserIds.length === 1 ? 'usuário selecionado' : 'usuários selecionados'}
                  </div>

                  {selectedUserIds.length > 0 && (
                    <button
                      onClick={() => setSelectedUserIds([])}
                      className="text-[11px] text-slate-400 hover:text-white underline font-semibold"
                    >
                      Desmarcar todos
                    </button>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={selectedUserIds.length !== 1}
                    onClick={() => {
                      if (selectedUserIds.length !== 1) return;
                      const u = users.find(x => x.id === selectedUserIds[0]);
                      if (u) {
                        setUserToEdit(u);
                        setEditUserForm({
                          nome: u.nome,
                          email: u.email,
                          role: u.role,
                          companyId: u.companyId || 'global',
                          ativo: u.ativo
                        });
                        setShowEditUserModal(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length === 1
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400 shadow-sm'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    }`}
                    title={selectedUserIds.length > 1 ? 'Selecione apenas um usuário para editar.' : 'Editar Usuário'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>

                  <button
                    disabled={selectedUserIds.length === 0}
                    onClick={async () => {
                      if (selectedUserIds.length === 0) return;
                      setIsSubmitting(true);
                      await Database.updateUsersStatusBatch(selectedUserIds, true);
                      setIsSubmitting(false);
                      setFeedback({ type: 'success', message: `${selectedUserIds.length} usuário(s) ativado(s) com sucesso.` });
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length > 0
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Ativar
                  </button>

                  <button
                    disabled={selectedUserIds.length === 0}
                    onClick={async () => {
                      if (selectedUserIds.length === 0) return;
                      setIsSubmitting(true);
                      await Database.updateUsersStatusBatch(selectedUserIds, false);
                      setIsSubmitting(false);
                      setFeedback({ type: 'success', message: `${selectedUserIds.length} usuário(s) bloqueado(s) com sucesso.` });
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length > 0
                        ? 'bg-amber-950/60 text-amber-400 border-amber-800 hover:bg-amber-900/60'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Bloquear
                  </button>

                  <button
                    disabled={selectedUserIds.length === 0}
                    onClick={() => setShowChangeRoleModal(true)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length > 0
                        ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800 hover:bg-indigo-900/60'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Alterar Perfil
                  </button>

                  <button
                    disabled={selectedUserIds.length === 0}
                    onClick={() => {
                      if (selectedUserIds.length === 1) {
                        const u = users.find(x => x.id === selectedUserIds[0]);
                        if (u) {
                          setSelectedUserForPassword(u);
                          setNewPasswordValue('');
                          setShowResetPasswordModal(true);
                        }
                      } else {
                        setBatchPasswordValue('');
                        setShowBatchPasswordModal(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length > 0
                        ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    Resetar Senha
                  </button>

                  <button
                    disabled={selectedUserIds.length === 0}
                    onClick={() => setShowBatchDeleteModal(true)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length > 0
                        ? 'bg-red-950/60 text-red-400 border-red-800 hover:bg-red-900/60'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>

              {/* USERS TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">E-mail</th>
                        <th className="px-4 py-3">Perfil</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Empresa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {filteredUsersList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            Nenhum usuário encontrado com os filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        filteredUsersList.map(u => {
                          const comp = companies.find(c => c.id === u.companyId);
                          const isSelected = selectedUserIds.includes(u.id);
                          return (
                            <tr key={u.id} className={`transition-colors ${isSelected ? 'bg-amber-950/25 border-l-2 border-amber-500' : 'hover:bg-slate-800/40'}`}>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleUserSelect(u.id)}
                                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                                />
                              </td>

                              <td className="px-4 py-3 font-bold text-white">
                                {u.nome}
                              </td>

                              <td className="px-4 py-3 font-mono text-slate-300">
                                {u.email}
                              </td>

                              <td className="px-4 py-3">
                                <span className="font-bold uppercase text-amber-400 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded text-[10px]">
                                  {u.role}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border ${
                                  u.ativo ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-red-950/60 text-red-400 border-red-800'
                                }`}>
                                  {u.ativo ? 'ATIVO' : 'BLOQUEADO'}
                                </span>
                              </td>

                              <td className="px-4 py-3 font-semibold text-slate-300">
                                {u.companyId === 'global' || u.role === 'master' ? (
                                  <span className="text-amber-400 font-bold">Plataforma Global (SaaS)</span>
                                ) : (
                                  comp?.nome || u.companyId
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          );
        })()}

        {/* TAB 3: PAINEL FINANCEIRO & ASSINATURAS */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Receita Mensal Recorrente (MRR)</span>
                <div className="text-3xl font-black text-emerald-400 mb-1">{formatCurrency(mrr)}</div>
                <p className="text-xs text-slate-400">Total gerado mensalmente pelas empresas ativas na plataforma.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Receita Anual Estimada (ARR)</span>
                <div className="text-3xl font-black text-amber-400 mb-1">{formatCurrency(arr)}</div>
                <p className="text-xs text-slate-400">Projeção anual considerando a base de assinaturas ativas.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Ticket Médio por Loja</span>
                <div className="text-3xl font-black text-white mb-1">
                  {formatCurrency(activeCompanies > 0 ? mrr / activeCompanies : 0)}
                </div>
                <p className="text-xs text-slate-400">Valor médio contratado por empresa cliente.</p>
              </div>
            </div>

            {/* STATUS DISTRIBUTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Resumo da Carteira de Clientes SaaS
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-emerald-400 font-bold uppercase block mb-1">Ativas</span>
                  <div className="text-xl font-bold text-white">{activeCompanies}</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-amber-400 font-bold uppercase block mb-1">Suspensas</span>
                  <div className="text-xl font-bold text-white">{suspendedCompanies}</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-red-400 font-bold uppercase block mb-1">Bloqueadas</span>
                  <div className="text-xl font-bold text-white">{blockedCompanies}</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Canceladas</span>
                  <div className="text-xl font-bold text-white">{canceledCompanies}</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: PERFIS & PERMISSÕES */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Gerenciador de Perfis & Permissões Customizadas
                </h3>
                <p className="text-xs text-slate-400 mt-1">Crie papéis com permissões granulares (Financeiro, Operações, Expedição, Atendente, Gerente).</p>
              </div>

              <button
                onClick={() => setShowRoleModal(true)}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar Novo Perfil
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customRoles.length === 0 ? (
                <div className="col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-xs">
                  Nenhum perfil customizado cadastrado ainda. Clique em "Criar Novo Perfil" para definir regras granulares.
                </div>
              ) : (
                customRoles.map(role => (
                  <div key={role.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <h4 className="text-sm font-bold text-white">{role.nome}</h4>
                        <p className="text-xs text-slate-400">{role.descricao || 'Sem descrição'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-800 text-amber-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                          {role.companyId === 'global' ? 'Global' : 'Empresa'}
                        </span>
                        <button
                          onClick={async () => {
                            if (confirm(`Deseja excluir o perfil "${role.nome}"?`)) {
                              const res = await Database.deleteCustomRole(role.id);
                              if (res.success) {
                                setFeedback({ type: 'success', message: `Perfil "${role.nome}" excluído.` });
                              } else {
                                setFeedback({ type: 'error', message: res.error || 'Erro ao excluir perfil.' });
                              }
                            }
                          }}
                          className="p-1.5 bg-red-950/30 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-lg transition-colors"
                          title="Excluir Perfil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className={role.permissoes.criar_entregas ? "text-emerald-400" : "text-slate-600"}>●</span>
                        Criar Entregas
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={role.permissoes.excluir_entregas ? "text-emerald-400" : "text-slate-600"}>●</span>
                        Excluir Entregas
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={role.permissoes.ver_relatorios ? "text-emerald-400" : "text-slate-600"}>●</span>
                        Ver Relatórios
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={role.permissoes.financeiro ? "text-emerald-400" : "text-slate-600"}>●</span>
                        Acesso Financeiro
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* TAB 5: PLANOS & LICENÇAS PRESETS */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-white">Plano Mensal</h3>
                  <p className="text-xs text-slate-400">Flexibilidade para pequenas operações</p>
                </div>
                <span className="text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">R$ 199/mês</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                <li>✓ Até 1.000 clientes cadastrados</li>
                <li>✓ Até 5.000 entregas/mês</li>
                <li>✓ Até 10 entregadores e 10 operadores</li>
                <li>✓ 5 GB de armazenamento seguro</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 shadow-xl space-y-4 relative">
              <span className="absolute -top-3 right-4 bg-amber-500 text-slate-950 font-bold text-[10px] uppercase px-3 py-0.5 rounded-full">Mais Popular</span>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-white">Plano Anual</h3>
                  <p className="text-xs text-slate-400">Economia garantida com pagamento anual</p>
                </div>
                <span className="text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">R$ 1.990/ano</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                <li>✓ Clientes ilimitados</li>
                <li>✓ Até 20.000 entregas/mês</li>
                <li>✓ Até 30 entregadores</li>
                <li>✓ Suporte Prioritário Master</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-white">Enterprise / Vitalício</h3>
                  <p className="text-xs text-slate-400">Infraestrutura dedicada sem limites</p>
                </div>
                <span className="text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">Sob Consulta</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                <li>✓ Sem limite de usuários ou entregas</li>
                <li>✓ API de integração para ERPs</li>
                <li>✓ Domínio e custom branding dedicados</li>
              </ul>
            </div>

          </div>
        )}

        {/* TAB 6: AUDITORIA MASTER */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
              <FileText className="w-4 h-4 text-amber-500" />
              Logs de Auditoria Administrativa Master
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Data e Hora</th>
                    <th className="px-4 py-3">Executado Por</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Descrição Detalhada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {masterAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        Nenhum registro de auditoria master salvo até o momento.
                      </td>
                    </tr>
                  ) : (
                    masterAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {formatDate(log.dataHora)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-200">
                          {log.usuarioNome}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-amber-400 border border-slate-700 rounded-full font-bold uppercase">
                            {log.tipoAcao}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {log.descricao}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: CADASTRAR NOVA EMPRESA */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" />
                Cadastrar Nova Empresa (Cliente SaaS)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Razão Social / Nome da Empresa *</label>
                  <input
                    type="text"
                    required
                    value={newComp.nome}
                    onChange={(e) => setNewComp({ ...newComp, nome: e.target.value })}
                    placeholder="Ex: Mercado Central Logística Ltda"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={newComp.nomeFantasia}
                    onChange={(e) => setNewComp({ ...newComp, nomeFantasia: e.target.value })}
                    placeholder="Ex: Mercado Express"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={newComp.cnpj}
                    onChange={(e) => setNewComp({ ...newComp, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Responsável pela Conta</label>
                  <input
                    type="text"
                    value={newComp.responsavel}
                    onChange={(e) => setNewComp({ ...newComp, responsavel: e.target.value })}
                    placeholder="Ex: Carlos Andrade"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={newComp.telefone}
                    onChange={(e) => setNewComp({ ...newComp, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail de Contato da Loja</label>
                  <input
                    type="email"
                    value={newComp.email}
                    onChange={(e) => setNewComp({ ...newComp, email: e.target.value })}
                    placeholder="contato@empresa.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-800/60">
                  <CepInput
                    label="CEP da Empresa"
                    value={newComp.cep || ''}
                    onChange={(val) => setNewComp({ ...newComp, cep: val })}
                    targetNumeroInputId="companyAddressInput"
                    onAddressFound={(addr) => {
                      const fullAddr = addr.bairro ? `${addr.rua}, ${addr.bairro}` : addr.rua;
                      setNewComp(prev => ({
                        ...prev,
                        endereco: fullAddr,
                        cidade: addr.cidade ? `${addr.cidade} / ${addr.estado}` : prev.cidade
                      }));
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço (Rua e Nº)</label>
                  <input
                    id="companyAddressInput"
                    name="numero"
                    type="text"
                    value={newComp.endereco || ''}
                    onChange={(e) => setNewComp({ ...newComp, endereco: e.target.value })}
                    placeholder="Av. Paulista, 1000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cidade / Estado</label>
                  <input
                    type="text"
                    value={newComp.cidade || ''}
                    onChange={(e) => setNewComp({ ...newComp, cidade: e.target.value })}
                    placeholder="São Paulo / SP"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* PLAN & CONTRACT DETAILS */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">Plano Contratado *</label>
                  <select
                    value={newComp.planoContratado}
                    onChange={(e) => setNewComp({ ...newComp, planoContratado: e.target.value as PlanoTipo })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="Profissional">Profissional</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Anual">Anual</option>
                    <option value="Vitalicio">Vitalício</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    value={newComp.valorPlano}
                    onChange={(e) => setNewComp({ ...newComp, valorPlano: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={newComp.dataVencimento}
                    onChange={(e) => setNewComp({ ...newComp, dataVencimento: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* PRIMARY ADMIN ACCOUNT CREATION */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  Conta do Administrador Principal da Loja
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Admin *</label>
                    <input
                      type="text"
                      required
                      value={newComp.adminName}
                      onChange={(e) => setNewComp({ ...newComp, adminName: e.target.value })}
                      placeholder="Ex: João Silva"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail Admin *</label>
                    <input
                      type="email"
                      required
                      value={newComp.adminEmail}
                      onChange={(e) => setNewComp({ ...newComp, adminEmail: e.target.value })}
                      placeholder="admin@empresa.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Senha Inicial *</label>
                    <input
                      type="password"
                      required
                      value={newComp.adminPassword}
                      onChange={(e) => setNewComp({ ...newComp, adminPassword: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Criar Empresa & Admin'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EMPRESA & LICENÇA */}
      {showEditModal && selectedCompany && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Editar Licença — {selectedCompany.nome}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleEditCompanySubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status da Empresa</label>
                  <select
                    value={editComp.status || 'ativa'}
                    onChange={(e) => setEditComp({ ...editComp, status: e.target.value as CompanyStatus })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="ativa">Ativa</option>
                    <option value="suspensa">Suspensa</option>
                    <option value="bloqueada">Bloqueada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plano Contratado</label>
                  <select
                    value={editComp.planoContratado || 'Profissional'}
                    onChange={(e) => setEditComp({ ...editComp, planoContratado: e.target.value as PlanoTipo })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="Profissional">Profissional</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Anual">Anual</option>
                    <option value="Vitalicio">Vitalício</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor do Plano (R$)</label>
                  <input
                    type="number"
                    value={editComp.valorPlano || 0}
                    onChange={(e) => setEditComp({ ...editComp, valorPlano: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={editComp.dataVencimento || ''}
                    onChange={(e) => setEditComp({ ...editComp, dataVencimento: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors"
                >
                  {isSubmitting ? 'Salvando...' : 'Atualizar Dados'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR PERFIL DE ACESSO */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Criar Perfil de Acesso Customizado
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Perfil *</label>
                <input
                  type="text"
                  required
                  value={roleForm.nome}
                  onChange={(e) => setRoleForm({ ...roleForm, nome: e.target.value })}
                  placeholder="Ex: Financeiro, Expedição, Supervisor"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={roleForm.descricao}
                  onChange={(e) => setRoleForm({ ...roleForm, descricao: e.target.value })}
                  placeholder="Finalidade deste perfil de acesso"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-amber-400 block mb-1">Permissões Habilitadas:</span>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  {Object.entries(roleForm.permissoes).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setRoleForm({
                          ...roleForm,
                          permissoes: { ...roleForm.permissoes, [key]: e.target.checked }
                        })}
                        className="rounded accent-amber-500"
                      />
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors"
                >
                  Salvar Perfil
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: CREATE USER */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-lg p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] max-h-[90vh] overflow-y-auto text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-1 bg-amber-500/10 text-amber-600 rounded-lg">
                <User className="w-4 h-4 text-amber-600" />
              </div>
              Cadastrar Novo Usuário de Acesso
            </h3>

            {companies.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between gap-2">
                <span className="text-amber-800 text-xs font-semibold">
                  Nenhuma empresa cadastrada na plataforma. Deseja cadastrar uma empresa agora?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setShowCreateModal(true);
                  }}
                  className="px-3 py-1 bg-[#FF9800] text-[#111827] text-xs font-bold rounded-lg hover:bg-amber-500 shrink-0 cursor-pointer"
                >
                  + Criar Empresa
                </button>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newUserForm.companyId || !newUserForm.nome || !newUserForm.email || !newUserForm.senha) {
                setFeedback({ type: 'error', message: 'Preencha todos os campos obrigatórios (*).' });
                return;
              }
              if (newUserForm.senha !== newUserForm.confirmSenha) {
                setFeedback({ type: 'error', message: 'As senhas digitadas não coincidem.' });
                return;
              }
              setIsSubmitting(true);
              const res = await Database.createUser(
                newUserForm.companyId,
                newUserForm.nome,
                newUserForm.email,
                newUserForm.senha,
                newUserForm.role,
                undefined,
                newUserForm.telefone,
                newUserForm.ativo
              );
              setIsSubmitting(false);
              if (res.success) {
                setFeedback({ type: 'success', message: `Usuário ${newUserForm.nome} cadastrado com sucesso!` });
                setShowCreateUserModal(false);
                setNewUserForm({
                  companyId: '',
                  nome: '',
                  email: '',
                  telefone: '',
                  senha: '',
                  confirmSenha: '',
                  role: 'admin',
                  ativo: true
                });
              } else {
                setFeedback({ type: 'error', message: res.error || 'Erro ao criar usuário.' });
              }
            }} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[#475569] font-bold mb-1">Empresa Destino *</label>
                <select
                  required
                  value={newUserForm.companyId}
                  onChange={(e) => setNewUserForm({ ...newUserForm, companyId: e.target.value })}
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                >
                  <option value="">-- Selecione a Empresa Destino --</option>
                  <option value="global">Plataforma Global (Master)</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#475569] font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.nome}
                  onChange={(e) => setNewUserForm({ ...newUserForm, nome: e.target.value })}
                  placeholder="Nome do usuário"
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#475569] font-bold mb-1">E-mail de Login *</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="usuario@empresa.com"
                    className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-[#475569] font-bold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={newUserForm.telefone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#475569] font-bold mb-1">Senha *</label>
                  <input
                    type="password"
                    required
                    value={newUserForm.senha}
                    onChange={(e) => setNewUserForm({ ...newUserForm, senha: e.target.value })}
                    placeholder="Digite a senha"
                    className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-[#475569] font-bold mb-1">Confirmar Senha *</label>
                  <input
                    type="password"
                    required
                    value={newUserForm.confirmSenha}
                    onChange={(e) => setNewUserForm({ ...newUserForm, confirmSenha: e.target.value })}
                    placeholder="Repita a senha"
                    className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#475569] font-bold mb-1">Perfil de Acesso *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                    className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-bold rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="admin">Administrador da Empresa</option>
                    <option value="operador">Operador (Atendente / Logística)</option>
                    <option value="expedidor">Expedidor / Despachante</option>
                    <option value="motorista">Entregador / Motorista</option>
                    <option value="master">Super Administrador (Master)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#475569] font-bold mb-1">Status da Conta</label>
                  <select
                    value={newUserForm.ativo ? 'true' : 'false'}
                    onChange={(e) => setNewUserForm({ ...newUserForm, ativo: e.target.value === 'true' })}
                    className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-bold rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo / Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#FF9800] text-[#111827] font-bold rounded-xl hover:bg-amber-500 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {showResetPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-1 bg-amber-500/10 text-amber-600 rounded-lg">
                <Key className="w-4 h-4 text-amber-600" />
              </div>
              Alterar / Resetar Senha
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="text-slate-600 font-medium">Usuário: <strong className="text-[#0F172A]">{selectedUserForPassword.nome}</strong></div>
              <div className="text-slate-600 font-medium">E-mail: <span className="text-slate-800 font-mono font-semibold">{selectedUserForPassword.email}</span></div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newPasswordValue) return;
              setIsSubmitting(true);
              const res = await Database.updateUser(selectedUserForPassword.companyId, selectedUserForPassword.id, {
                senha: newPasswordValue
              });
              setIsSubmitting(false);
              if (res.success) {
                setFeedback({ type: 'success', message: `Senha do usuário ${selectedUserForPassword.nome} alterada com sucesso!` });
                setShowResetPasswordModal(false);
                setSelectedUserForPassword(null);
                setNewPasswordValue('');
              } else {
                setFeedback({ type: 'error', message: res.error || 'Erro ao alterar senha.' });
              }
            }} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#475569] font-bold mb-1">Nova Senha *</label>
                <input
                  type="password"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Digite a nova senha"
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#FF9800] text-[#111827] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-xs cursor-pointer"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER DETAILS (SINGLE SELECTION) */}
      {showEditUserModal && userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-1 bg-amber-500/10 text-amber-600 rounded-lg">
                <Edit3 className="w-4 h-4 text-amber-600" />
              </div>
              Editar Dados do Usuário
            </h3>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const res = await Database.updateUser(editUserForm.companyId, userToEdit.id, {
                nome: editUserForm.nome,
                email: editUserForm.email,
                role: editUserForm.role,
                companyId: editUserForm.companyId,
                ativo: editUserForm.ativo
              });
              setIsSubmitting(false);
              if (res.success) {
                setFeedback({ type: 'success', message: `Dados do usuário "${editUserForm.nome}" atualizados com sucesso!` });
                setShowEditUserModal(false);
                setUserToEdit(null);
              } else {
                setFeedback({ type: 'error', message: res.error || 'Erro ao atualizar usuário.' });
              }
            }} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#475569] font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editUserForm.nome}
                  onChange={(e) => setEditUserForm({ ...editUserForm, nome: e.target.value })}
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-bold mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-bold mb-1">Empresa Associada *</label>
                <select
                  value={editUserForm.companyId}
                  onChange={(e) => setEditUserForm({ ...editUserForm, companyId: e.target.value })}
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                >
                  <option value="global">Plataforma Global (Master)</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#475569] font-bold mb-1">Perfil de Acesso *</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as UserRole })}
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-bold rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                >
                  <option value="admin">Administrador da Empresa</option>
                  <option value="operador">Operador</option>
                  <option value="motorista">Entregador / Motorista</option>
                  <option value="master">Master</option>
                </select>
              </div>

              <div>
                <label className="block text-[#475569] font-bold mb-1">Status de Acesso</label>
                <select
                  value={editUserForm.ativo ? 'true' : 'false'}
                  onChange={(e) => setEditUserForm({ ...editUserForm, ativo: e.target.value === 'true' })}
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-bold rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                >
                  <option value="true">Ativo / Liberado</option>
                  <option value="false">Bloqueado / Suspenso</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#FF9800] text-[#111827] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-xs cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE ROLE (BATCH) */}
      {showChangeRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
              Alterar Perfil em Lote
            </h3>

            <p className="text-xs text-slate-600">
              Selecione o novo perfil de acesso que será aplicado a <strong>{selectedUserIds.length}</strong> usuário(s) selecionado(s):
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#475569] font-bold mb-1">Novo Perfil *</label>
                <select
                  value={batchRoleValue}
                  onChange={(e) => setBatchRoleValue(e.target.value as UserRole)}
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-bold rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                >
                  <option value="admin">Administrador</option>
                  <option value="operador">Operador</option>
                  <option value="motorista">Entregador / Motorista</option>
                  <option value="master">Master</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangeRoleModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    await Database.updateUsersRoleBatch(selectedUserIds, batchRoleValue);
                    setIsSubmitting(false);
                    setShowChangeRoleModal(false);
                    setFeedback({ type: 'success', message: `Perfil alterado para ${batchRoleValue} em ${selectedUserIds.length} usuário(s).` });
                  }}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
                >
                  Aplicar Novo Perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BATCH PASSWORD RESET */}
      {showBatchPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-1 bg-amber-500/10 text-amber-600 rounded-lg">
                <Key className="w-4 h-4 text-amber-600" />
              </div>
              Resetar Senhas em Lote
            </h3>

            <p className="text-xs text-slate-600">
              Defina a nova senha que será atribuída a todos os <strong>{selectedUserIds.length}</strong> usuários selecionados:
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!batchPasswordValue) return;
              setIsSubmitting(true);
              await Database.resetUsersPasswordBatch(selectedUserIds, batchPasswordValue);
              setIsSubmitting(false);
              setShowBatchPasswordModal(false);
              setBatchPasswordValue('');
              setFeedback({ type: 'success', message: `Senha redefinida com sucesso para ${selectedUserIds.length} usuário(s).` });
            }} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#475569] font-bold mb-1">Nova Senha em Lote *</label>
                <input
                  type="password"
                  required
                  value={batchPasswordValue}
                  onChange={(e) => setBatchPasswordValue(e.target.value)}
                  placeholder="Digite a nova senha comum"
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchPasswordModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#FF9800] text-[#111827] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-xs cursor-pointer"
                >
                  Redefinir Senhas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM BATCH DELETE USERS */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-rose-200 rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-rose-700 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-rose-100">
              <div className="p-1 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              Confirmar Exclusão em Lote
            </h3>

            <p className="text-xs text-slate-600">
              Tem certeza que deseja excluir permanentemente os <strong>{selectedUserIds.length}</strong> usuário(s) selecionados abaixo?
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-1 text-xs">
              {users.filter(u => selectedUserIds.includes(u.id)).map(u => (
                <div key={u.id} className="text-slate-800 font-semibold flex items-center justify-between border-b border-slate-200/60 pb-1">
                  <span>{u.nome}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{u.email}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-rose-600 font-semibold">
              ⚠️ Esta ação removerá os registros do banco de dados e não poderá ser desfeita.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  const selectedUsersList = users.filter(u => selectedUserIds.includes(u.id)).map(u => ({ id: u.id, companyId: u.companyId }));
                  const res = await Database.deleteUsersBatch(selectedUsersList);
                  setIsSubmitting(false);
                  setShowBatchDeleteModal(false);
                  if (res.success) {
                    setSelectedUserIds([]);
                    setFeedback({ type: 'success', message: `${res.count} usuário(s) excluído(s) permanentemente com sucesso.` });
                  } else {
                    setFeedback({ type: 'error', message: res.error || 'Erro ao excluir usuários.' });
                  }
                }}
                className="px-5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM BATCH DELETE COMPANIES */}
      {showCompanyBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-rose-200 rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-rose-700 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-rose-100">
              <div className="p-1 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              Confirmar Exclusão de Lojas
            </h3>

            <p className="text-xs text-slate-600">
              Tem certeza que deseja excluir permanentemente as <strong>{selectedCompanyIds.length}</strong> loja(s) selecionada(s) abaixo?
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-1 text-xs">
              {companies.filter(c => selectedCompanyIds.includes(c.id)).map(c => (
                <div key={c.id} className="text-slate-800 font-semibold flex items-center justify-between border-b border-slate-200/60 pb-1">
                  <span>{c.nome}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{c.email}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-rose-600 font-semibold">
              ⚠️ Todos os dados das lojas (usuários, entregas, frotas, motoristas) serão removidos permanentemente do banco de dados e da API.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCompanyBatchDeleteModal(false)}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  const res = await Database.deleteCompaniesBatchMaster(selectedCompanyIds);
                  setIsSubmitting(false);
                  setShowCompanyBatchDeleteModal(false);
                  if (res.success) {
                    setSelectedCompanyIds([]);
                    setFeedback({ type: 'success', message: `${res.count} loja(s) excluída(s) permanentemente com sucesso.` });
                  } else {
                    setFeedback({ type: 'error', message: res.error || 'Erro ao excluir empresas.' });
                  }
                }}
                className="px-5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BATCH RESET COMPANY ADMIN PASSWORD */}
      {showCompanyBatchPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-1 bg-amber-500/10 text-amber-600 rounded-lg">
                <Key className="w-4 h-4 text-amber-600" />
              </div>
              Resetar Senha de Administradores
            </h3>

            <p className="text-xs text-slate-600">
              Defina a nova senha que será atribuída aos administradores das <strong>{selectedCompanyIds.length}</strong> loja(s) selecionada(s):
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!companyBatchPasswordValue) return;
              setIsSubmitting(true);
              const res = await Database.resetCompanyAdminPasswordBatchMaster(selectedCompanyIds, companyBatchPasswordValue);
              setIsSubmitting(false);
              setShowCompanyBatchPasswordModal(false);
              setCompanyBatchPasswordValue('');
              setFeedback({ type: 'success', message: `Senha redefinida com sucesso para ${res.count} administrador(es).` });
            }} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#475569] font-bold mb-1">Nova Senha Admin *</label>
                <input
                  type="password"
                  required
                  value={companyBatchPasswordValue}
                  onChange={(e) => setCompanyBatchPasswordValue(e.target.value)}
                  placeholder="Digite a nova senha para o(s) admin(s)"
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompanyBatchPasswordModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#FF9800] text-[#111827] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-xs cursor-pointer"
                >
                  Redefinir Senhas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
