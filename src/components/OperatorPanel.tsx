/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Calendar, Users, Truck, DollarSign, Package, 
  MapPin, CheckCircle2, AlertTriangle, Clock, XCircle, FileText, Phone, X,
  FileCheck, Shield, ChevronRight, UserPlus, Trash, Trash2, Printer, FileDown, Eye, Check, RefreshCw, Loader2,
  Edit3, Unlock, Lock, Key, Sliders, History, Navigation, Palette, Building, LogOut,
  Bell, ChevronDown, List, MoreHorizontal
} from 'lucide-react';
import { 
  Entrega, Motorista, Veiculo, Usuario, Empresa, EntregaStatus, 
  FormaPagamento, StatusPagamento, EnderecoInfo, ClienteInfo, HistoricoStatus,
  Cliente, RegistroAuditoria, UserRole, DeliveryFormConfig, CustomFieldType
} from '../types';
import { Database } from '../lib/db';
import DynamicDeliveryDetails from './DynamicDeliveryDetails';
import { generateA4ReceiptHtml } from '../utils/pdfGenerator';
import ReportPanel from './ReportPanel';
import DeliveryHistoryPanel from './DeliveryHistoryPanel';
import DeliveryFormConfigPanel, { DEFAULT_DELIVERY_FORM_CONFIG } from './DeliveryFormConfigPanel';
import DeliveryForm, { DeliveryFormValues } from './DeliveryForm';
import CepInput from './CepInput';
import GpsTrackingPanel from './GpsTrackingPanel';
import ThemeConfigModal from './ThemeConfigModal';
import Sidebar from './Sidebar';
import FastGestaoLogo from './FastGestaoLogo';
import NotificationsPanel from './NotificationsPanel';

interface OperatorPanelProps {
  currentUser: Usuario;
  company: Empresa;
  deliveries: Entrega[];
  drivers: Motorista[];
  vehicles: Veiculo[];
  users: Usuario[];
  clients?: Cliente[];
  auditLogs?: RegistroAuditoria[];
  onUpdateCompany?: (updated: Empresa) => void;
  onAddDelivery: (delivery: Omit<Entrega, 'id' | 'companyId' | 'criadoPor' | 'criadoEm' | 'atualizadoEm' | 'origem' | 'historico'>) => Promise<void> | void;
  onUpdateDelivery: (id: string, updates: Partial<Entrega>) => void;
  onDeleteDelivery: (id: string, options?: { deleteFiles?: boolean; motivo?: string }) => void | Promise<void>;
  onAddDriver: (driver: Omit<Motorista, 'id' | 'companyId' | 'criadoEm'>) => void;
  onUpdateDriver: (id: string, updates: Partial<Motorista>) => void;
  onDeleteDriver: (id: string) => void;
  onAddVehicle: (vehicle: Omit<Veiculo, 'id' | 'companyId'>) => void;
  onUpdateVehicle: (id: string, updates: Partial<Veiculo>) => void;
  onDeleteVehicle: (id: string) => void;
  onAddUser: (nome: string, email: string, role: UserRole, motoristaId?: string, senhaInitial?: string, telefone?: string, ativo?: boolean) => void;
  onUpdateUserStatus: (userId: string, ativo: boolean) => void;
  onDeleteUser?: (userId: string) => void;
  onLogout: () => void;
}

export default function OperatorPanel({
  currentUser,
  company,
  deliveries,
  drivers,
  vehicles,
  users,
  clients = [],
  auditLogs = [],
  onUpdateCompany,
  onAddDelivery,
  onUpdateDelivery,
  onDeleteDelivery,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onAddUser,
  onUpdateUserStatus,
  onDeleteUser,
  onLogout
}: OperatorPanelProps) {
  // Navigation / Tab States
  const [activeTab, setActiveTab] = useState<'entregas' | 'historico' | 'colaboradores' | 'formConfig' | 'relatorios' | 'clientes' | 'motoristas' | 'veiculos' | 'rastreamentoGps' | 'configuracoes' | 'notificacoes'>('entregas');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [gpsTargetDeliveryId, setGpsTargetDeliveryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [driverFilter, setDriverFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateViewMode, setDateViewMode] = useState<'hoje' | 'data_selecionada' | 'agendadas' | 'todas'>('hoje');

  // Real-time monitoring hook: subscribe to Database changes to ensure immediate dashboard update without F5 refresh
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const unsubscribe = Database.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  // Sync selectedDelivery details with fresh delivery object whenever deliveries prop updates
  React.useEffect(() => {
    if (selectedDelivery) {
      const fresh = deliveries.find(d => d.id === selectedDelivery.id);
      if (fresh) {
        setSelectedDelivery(fresh);
      }
    }
  }, [deliveries]);

  // Form Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Entrega | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMotive, setCancelMotive] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Edit Delivery Form States
  const [showEditDeliveryModal, setShowEditDeliveryModal] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<Entrega | null>(null);

  // Selection & Batch Action State for OperatorPanel Colaboradores
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Usuario | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    nome: '',
    email: '',
    role: 'operador' as UserRole,
    ativo: true
  });
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [batchRoleValue, setBatchRoleValue] = useState<UserRole>('operador');
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showBatchPasswordModal, setShowBatchPasswordModal] = useState(false);
  const [batchPasswordValue, setBatchPasswordValue] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Client Management States
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClientToDelete, setSelectedClientToDelete] = useState<Cliente | null>(null);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [clientDeleteError, setClientDeleteError] = useState<string | null>(null);
  const [clientDeleteActiveNFs, setClientDeleteActiveNFs] = useState<string[]>([]);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  // Delete Delivery Modal States
  const [showDeleteDeliveryModal, setShowDeleteDeliveryModal] = useState(false);
  const [deliveryToDelete, setDeliveryToDelete] = useState<Entrega | null>(null);
  const [deleteFilesOption, setDeleteFilesOption] = useState<'only_delivery' | 'delivery_and_files'>('only_delivery');
  const [deleteDeliveryMotivo, setDeleteDeliveryMotivo] = useState('');
  const [isDeletingDelivery, setIsDeletingDelivery] = useState(false);

  const handleOpenDeleteDeliveryModal = (delivery: Entrega) => {
    setDeliveryToDelete(delivery);
    setDeleteFilesOption('only_delivery');
    setDeleteDeliveryMotivo('');
    setShowDeleteDeliveryModal(true);
  };

  const handleConfirmDeleteDelivery = async () => {
    if (!deliveryToDelete) return;
    setIsDeletingDelivery(true);
    try {
      const hasFiles = Boolean(
        deliveryToDelete.comprovante?.assinaturaUrl ||
        deliveryToDelete.comprovante?.fotoProdutoUrl ||
        deliveryToDelete.comprovante?.fotoFachadaUrl
      );

      const deleteFiles = hasFiles ? deleteFilesOption === 'delivery_and_files' : false;

      await onDeleteDelivery(deliveryToDelete.id, {
        deleteFiles,
        motivo: deleteDeliveryMotivo.trim() || undefined
      });

      setShowDeleteDeliveryModal(false);
      if (selectedDelivery?.id === deliveryToDelete.id) {
        setSelectedDelivery(null);
      }
      setDeliveryToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir a entrega.');
    } finally {
      setIsDeletingDelivery(false);
    }
  };
  
  // Add Client Form States
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [cNome, setCNome] = useState('');
  const [cTelefone, setCTelefone] = useState('');
  const [cWhatsapp, setCWhatsapp] = useState('');
  const [cDocumento, setCDocumento] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cEndereco, setCEndereco] = useState('');
  const [cBairro, setCBairro] = useState('');
  const [cCidade, setCCidade] = useState('');
  const [cCEP, setCCEP] = useState('');

  // New Driver Form States
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverCPF, setNewDriverCPF] = useState('');
  const [newDriverRG, setNewDriverRG] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverWhatsapp, setNewDriverWhatsapp] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverEndereco, setNewDriverEndereco] = useState('');
  const [newDriverCidade, setNewDriverCidade] = useState('');
  const [newDriverEstado, setNewDriverEstado] = useState('SP');
  const [newDriverCEP, setNewDriverCEP] = useState('');
  const [newDriverCNH, setNewDriverCNH] = useState('');
  const [newDriverCNHCat, setNewDriverCNHCat] = useState('');
  const [newDriverCNHVal, setNewDriverCNHVal] = useState('');
  const [newDriverObs, setNewDriverObs] = useState('');
  // Vehicle (Optional)
  const [hasVehicleInfo, setHasVehicleInfo] = useState(false);
  const [newDriverVeiTipo, setNewDriverVeiTipo] = useState('Moto');
  const [newDriverVeiMarca, setNewDriverVeiMarca] = useState('');
  const [newDriverVeiModelo, setNewDriverVeiModelo] = useState('');
  const [newDriverVeiCor, setNewDriverVeiCor] = useState('');
  const [newDriverVeiPlaca, setNewDriverVeiPlaca] = useState('');

  // New Vehicle Form States
  const [newPlaca, setNewPlaca] = useState('');
  const [newModelo, setNewModelo] = useState('');
  const [newTipo, setNewTipo] = useState<'moto' | 'carro' | 'van' | 'outro'>('moto');

  // New Collaborator Form States
  const [newCollabNome, setNewCollabNome] = useState('');
  const [newCollabEmail, setNewCollabEmail] = useState('');
  const [newCollabTelefone, setNewCollabTelefone] = useState('');
  const [newCollabSenha, setNewCollabSenha] = useState('');
  const [newCollabConfirmSenha, setNewCollabConfirmSenha] = useState('');
  const [newCollabRole, setNewCollabRole] = useState<UserRole>('operador');
  const [newCollabAtivo, setNewCollabAtivo] = useState(true);
  const [newCollabDriverId, setNewCollabDriverId] = useState('');

  // Helpers
  const formatCurrency = (val?: number | null) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR');
  };

  const statusMap: Record<EntregaStatus, { label: string; color: string; bg: string }> = {
    venda_realizada: { label: 'Venda Realizada', color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50' },
    nf_emitida: { label: 'NF Emitida', color: 'text-indigo-400', bg: 'bg-indigo-950/40 border-indigo-800/50' },
    separacao: { label: 'Separação', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50' },
    aguardando_motorista: { label: 'Aguardando Motorista', color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50' },
    em_rota: { label: 'Em Rota', color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-800/50' },
    entregue: { label: 'Entregue', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50' },
    nao_entregue: { label: 'Não Entregue', color: 'text-red-400', bg: 'bg-red-950/40 border-red-800/50' },
    cancelada: { label: 'Cancelada', color: 'text-slate-400', bg: 'bg-slate-900 border-slate-800' }
  };

  // Unified Available Drivers List (combines Motoristas registry + Usuarios with motorista role)
  const availableDrivers = useMemo(() => {
    const list: { id: string; nome: string; telefone?: string; email?: string }[] = [];

    // 1. Add registered drivers
    drivers.forEach(drv => {
      if (drv.ativo !== false) {
        list.push({
          id: drv.id,
          nome: drv.nome,
          telefone: drv.telefone,
          email: drv.email
        });
      }
    });

    // 2. Add collaborator users with motorista role not already in list
    users.forEach(usr => {
      if (usr.role === 'motorista' && usr.ativo !== false) {
        const alreadyExists = list.some(d => 
          d.id === usr.motoristaId || 
          d.id === usr.id ||
          (usr.email && d.email && d.email.toLowerCase() === usr.email.toLowerCase()) ||
          (d.nome.toLowerCase() === usr.nome.toLowerCase())
        );
        if (!alreadyExists) {
          list.push({
            id: usr.motoristaId || usr.id,
            nome: usr.nome,
            telefone: usr.telefone,
            email: usr.email
          });
        }
      }
    });

    return list;
  }, [drivers, users]);

  // Dashboard Statistics calculation
  const stats = useMemo(() => {
    const todayDeliveries = deliveries.filter(d => d.dataEntregaPrevista === dateFilter);
    const total = todayDeliveries.length;
    const inRoute = todayDeliveries.filter(d => d.status === 'em_rota').length;
    const awaiting = todayDeliveries.filter(d => 
      d.status === 'venda_realizada' || 
      d.status === 'nf_emitida' || 
      d.status === 'separacao' || 
      d.status === 'aguardando_motorista'
    ).length;
    const delivered = todayDeliveries.filter(d => d.status === 'entregue').length;
    const failed = todayDeliveries.filter(d => d.status === 'nao_entregue').length;
    const canceled = todayDeliveries.filter(d => d.status === 'cancelada').length;

    // Financial sums (Received on delivery)
    let cash = 0;
    let card = 0;
    let pix = 0;
    let totalCollected = 0;

    todayDeliveries.forEach(d => {
      if (d.status === 'entregue') {
        if (d.formaPagamento === 'dinheiro') cash += d.valorVenda;
        else if (d.formaPagamento === 'cartao_credito' || d.formaPagamento === 'cartao_debito') card += d.valorVenda;
        else if (d.formaPagamento === 'pix') pix += d.valorVenda;
        totalCollected += d.valorVenda;
      }
    });

    // Overdue deliveries
    const today = new Date().toISOString().split('T')[0];
    const delayed = deliveries.filter(d => {
      const isNotDone = d.status !== 'entregue' && d.status !== 'cancelada';
      const isPast = d.dataEntregaPrevista < today;
      return isNotDone && isPast;
    }).length;

    return {
      total, inRoute, awaiting, delivered, failed, canceled,
      cash, card, pix, totalCollected, delayed
    };
  }, [deliveries, dateFilter]);

  // Unified Delivery Form Handlers
  const handleDeliveryFormSubmit = async (values: DeliveryFormValues) => {
    if (isSubmittingDelivery) return;
    setIsSubmittingDelivery(true);

    try {
      const baseLat = -23.5505;
      const baseLng = -46.6333;
      const randomLat = baseLat + (Math.random() - 0.5) * 0.08;
      const randomLng = baseLng + (Math.random() - 0.5) * 0.08;

      const selectedDriverObj = values.motoristaId ? availableDrivers.find(drv => drv.id === values.motoristaId) : undefined;
      const matchingUser = values.motoristaId 
        ? users.find(u => u.motoristaId === values.motoristaId || u.id === values.motoristaId || (selectedDriverObj?.email && u.email?.toLowerCase() === selectedDriverObj.email.toLowerCase())) 
        : undefined;

      await onAddDelivery({
        numeroNF: values.numeroNF,
        numeroPedido: values.numeroPedido,
        cliente: values.cliente,
        endereco: {
          ...values.endereco,
          latitude: randomLat,
          longitude: randomLng,
        },
        volumes: values.volumes,
        valorVenda: values.valorVenda,
        valorFrete: values.valorFrete,
        formaPagamento: values.formaPagamento,
        statusPagamento: values.statusPagamento,
        status: values.motoristaId ? 'aguardando_motorista' : 'venda_realizada',
        motoristaId: values.motoristaId,
        entregadorId: matchingUser?.id || selectedDriverObj?.id || values.motoristaId,
        entregadorNome: selectedDriverObj?.nome || matchingUser?.nome,
        dataEntregaPrevista: values.dataEntregaPrevista,
        horaEntregaPrevista: values.horaEntregaPrevista,
        isAgendada: values.isAgendada,
        observacoes: values.observacoes,
        prioridade: values.prioridade,
        customValues: values.customValues,
      });

      setShowAddModal(false);
      setFeedback({ type: 'success', message: 'Entrega cadastrada com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Erro ao cadastrar entrega:', err);
      alert(err?.message || 'Erro ao cadastrar entrega. Tente novamente.');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const handleOpenEditDeliveryModal = (d: Entrega) => {
    setEditingDeliveryId(d.id);
    setEditingDelivery(d);
    setShowEditDeliveryModal(true);
  };

  const handleSaveEditDeliverySubmit = async (values: DeliveryFormValues) => {
    if (!editingDeliveryId) return;

    const drvObj = values.motoristaId ? availableDrivers.find(drv => drv.id === values.motoristaId) : undefined;
    const assocUser = values.motoristaId ? users.find(u => u.motoristaId === values.motoristaId || u.id === values.motoristaId || (drvObj?.email && u.email?.toLowerCase() === drvObj.email.toLowerCase())) : undefined;

    const updates: Partial<Entrega> = {
      numeroNF: values.numeroNF,
      numeroPedido: values.numeroPedido,
      cliente: values.cliente,
      endereco: {
        ...values.endereco,
        latitude: -23.55052,
        longitude: -46.633308,
      },
      volumes: values.volumes,
      valorVenda: values.valorVenda,
      valorFrete: values.valorFrete,
      formaPagamento: values.formaPagamento,
      statusPagamento: values.statusPagamento,
      motoristaId: values.motoristaId || undefined,
      entregadorId: assocUser?.id || drvObj?.id || values.motoristaId || undefined,
      entregadorNome: drvObj?.nome || assocUser?.nome || undefined,
      prioridade: values.prioridade,
      horaEntregaPrevista: values.horaEntregaPrevista,
      dataEntregaPrevista: values.dataEntregaPrevista,
      isAgendada: values.isAgendada,
      observacoes: values.observacoes,
      customValues: values.customValues,
    };

    onUpdateDelivery(editingDeliveryId, updates);
    if (selectedDelivery?.id === editingDeliveryId) {
      setSelectedDelivery(prev => prev ? { ...prev, ...updates } : null);
    }
    setShowEditDeliveryModal(false);
    setEditingDelivery(null);
    setFeedback({ type: 'success', message: 'Entrega atualizada com sucesso!' });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Handle Create Driver
  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverCPF || !newDriverPhone) {
      alert('Preencha Nome, CPF e Telefone do entregador.');
      return;
    }

    onAddDriver({
      nome: newDriverName,
      cpf: newDriverCPF,
      rg: newDriverRG || undefined,
      telefone: newDriverPhone,
      whatsapp: newDriverWhatsapp || undefined,
      email: newDriverEmail || undefined,
      endereco: newDriverEndereco || undefined,
      cidade: newDriverCidade || undefined,
      estado: newDriverEstado || undefined,
      cep: newDriverCEP || undefined,
      cnh: newDriverCNH || undefined,
      categoriaCNH: newDriverCNHCat || undefined,
      validadeCNH: newDriverCNHVal || undefined,
      observacoes: newDriverObs || undefined,
      ativo: true,
      // Vehicle optionally included directly
      veiculoTipo: hasVehicleInfo ? newDriverVeiTipo : undefined,
      veiculoMarca: hasVehicleInfo ? newDriverVeiMarca : undefined,
      veiculoModelo: hasVehicleInfo ? newDriverVeiModelo : undefined,
      veiculoCor: hasVehicleInfo ? newDriverVeiCor : undefined,
      veiculoPlaca: hasVehicleInfo ? newDriverVeiPlaca.toUpperCase() : undefined
    });

    // Reset Form
    setNewDriverName('');
    setNewDriverCPF('');
    setNewDriverRG('');
    setNewDriverPhone('');
    setNewDriverWhatsapp('');
    setNewDriverEmail('');
    setNewDriverEndereco('');
    setNewDriverCidade('');
    setNewDriverCEP('');
    setNewDriverCNH('');
    setNewDriverCNHCat('');
    setNewDriverCNHVal('');
    setNewDriverObs('');
    setHasVehicleInfo(false);
    setShowDriverModal(false);
  };

  // Handle Create Vehicle
  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaca || !newModelo) {
      alert('Placa e Modelo são obrigatórios.');
      return;
    }

    onAddVehicle({
      placa: newPlaca.toUpperCase(),
      modelo: newModelo,
      tipo: newTipo,
      ativo: true
    });

    setNewPlaca('');
    setNewModelo('');
    setShowVehicleModal(false);
  };

  // Handle Create Collaborator User
  const handleCreateCollab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollabNome || !newCollabEmail) {
      alert('Informe Nome e E-mail.');
      return;
    }
    if (newCollabSenha && newCollabSenha !== newCollabConfirmSenha) {
      alert('As senhas digitadas não coincidem.');
      return;
    }
    onAddUser(
      newCollabNome,
      newCollabEmail,
      newCollabRole,
      newCollabRole === 'motorista' ? newCollabDriverId : undefined,
      newCollabSenha || '123456',
      newCollabTelefone,
      newCollabAtivo
    );
    setNewCollabNome('');
    setNewCollabEmail('');
    setNewCollabTelefone('');
    setNewCollabSenha('');
    setNewCollabConfirmSenha('');
    setNewCollabRole('operador');
    setNewCollabAtivo(true);
    setNewCollabDriverId('');
    setShowUserModal(false);
  };

  // Status Step Navigator
  const handleAdvanceStatus = (nextStatus: EntregaStatus) => {
    if (!selectedDelivery) return;
    
    const historyItem: HistoricoStatus = {
      id: 'h_' + Date.now(),
      statusAnterior: selectedDelivery.status,
      statusNovo: nextStatus,
      alteradoPor: currentUser.nome,
      alteradoEm: new Date().toISOString()
    };

    const updates: Partial<Entrega> = {
      status: nextStatus,
      historico: [...(selectedDelivery.historico || []), historyItem]
    };

    onUpdateDelivery(selectedDelivery.id, updates);
    setSelectedDelivery(prev => prev ? { ...prev, ...updates } : null);
  };

  // Handle Canceling delivery
  const handleCancelDeliverySubmit = () => {
    if (!selectedDelivery || !cancelMotive) return;
    
    const historyItem: HistoricoStatus = {
      id: 'h_' + Date.now(),
      statusAnterior: selectedDelivery.status,
      statusNovo: 'cancelada',
      alteradoPor: currentUser.nome,
      alteradoEm: new Date().toISOString(),
      motivo: cancelMotive
    };

    onUpdateDelivery(selectedDelivery.id, {
      status: 'cancelada',
      motivoNaoEntregue: cancelMotive,
      historico: [...(selectedDelivery.historico || []), historyItem]
    });

    setSelectedDelivery(prev => prev ? { 
      ...prev, 
      status: 'cancelada', 
      motivoNaoEntregue: cancelMotive, 
      historico: [...(prev.historico || []), historyItem] 
    } : null);

    setShowCancelModal(false);
    setCancelMotive('');
  };

  // Filter & Search deliveries
  const filteredDeliveries = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return deliveries.filter(d => {
      // Date Check according to dateViewMode
      if (dateViewMode === 'hoje') {
        if (d.dataEntregaPrevista !== todayStr) return false;
      } else if (dateViewMode === 'data_selecionada') {
        if (d.dataEntregaPrevista !== dateFilter) return false;
      } else if (dateViewMode === 'agendadas') {
        if (!d.isAgendada && d.dataEntregaPrevista <= todayStr) return false;
      } // 'todas' shows all dates

      // Status Check
      if (statusFilter !== 'todas' && d.status !== statusFilter) return false;

      // Driver Check
      if (driverFilter !== 'todos' && d.motoristaId !== driverFilter && d.entregadorId !== driverFilter) return false;

      // Search queries (NF, Pedido, Cliente, Telefone, Endereço, Entregador)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const nfMatch = d.numeroNF.toLowerCase().includes(query);
        const orderMatch = d.numeroPedido?.toLowerCase().includes(query) || false;
        const clientMatch = d.cliente.nome.toLowerCase().includes(query);
        const phoneMatch = d.cliente.telefone.includes(query) || d.cliente.whatsapp?.includes(query);
        const addressMatch = d.endereco.ruaNumero.toLowerCase().includes(query) || d.endereco.bairro.toLowerCase().includes(query);
        
        const driverName = availableDrivers.find(drv => drv.id === d.motoristaId || drv.id === d.entregadorId)?.nome.toLowerCase() || d.entregadorNome?.toLowerCase() || '';
        const driverMatch = driverName.includes(query);

        return nfMatch || orderMatch || clientMatch || phoneMatch || addressMatch || driverMatch;
      }

      return true;
    });
  }, [deliveries, dateFilter, dateViewMode, statusFilter, driverFilter, searchQuery, availableDrivers]);

  // CLIENT MANAGEMENT HANDLERS
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cNome || !cTelefone) {
      alert('Nome e Telefone são campos obrigatórios.');
      return;
    }

    try {
      await Database.saveClient(company.id, {
        nome: cNome,
        telefone: cTelefone,
        whatsapp: cWhatsapp || undefined,
        documento: cDocumento || undefined,
        email: cEmail || undefined,
        endereco: cEndereco || undefined,
        bairro: cBairro || undefined,
        cidade: cCidade || 'São Paulo',
        cep: cCEP || undefined,
        ativo: true
      });

      setCNome('');
      setCTelefone('');
      setCWhatsapp('');
      setCDocumento('');
      setCEmail('');
      setCEndereco('');
      setCBairro('');
      setCCidade('');
      setCCEP('');
      setShowAddClientModal(false);
    } catch (err: any) {
      alert(err?.message || 'Erro ao cadastrar cliente.');
    }
  };

  const confirmDeleteClient = (client: Cliente) => {
    setSelectedClientToDelete(client);
    setClientDeleteError(null);
    setClientDeleteActiveNFs([]);
    setShowDeleteClientModal(true);
  };

  const handleExecuteDeleteClient = async () => {
    if (!selectedClientToDelete) return;
    setIsDeletingClient(true);
    setClientDeleteError(null);
    setClientDeleteActiveNFs([]);

    try {
      const res = await Database.deleteClient(
        company.id,
        selectedClientToDelete.id
      );

      if (res.success) {
        setShowDeleteClientModal(false);
        setSelectedClientToDelete(null);
      } else {
        setClientDeleteError(res.error || 'Não foi possível excluir o cliente.');
        if (res.activeDeliveries) {
          setClientDeleteActiveNFs(res.activeDeliveries);
        }
      }
    } catch (err: any) {
      setClientDeleteError(err?.message || 'Erro ao processar a exclusão.');
    } finally {
      setIsDeletingClient(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c => 
      c.nome.toLowerCase().includes(q) ||
      c.telefone.includes(q) ||
      (c.documento && c.documento.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.bairro && c.bairro.toLowerCase().includes(q))
    );
  }, [clients, clientSearchQuery]);

  // PRINT RECEIPT LAYOUT (A4 PDF Receipt Generation using Form Snapshot or Form Config)
  const printOfficialReceipt = () => {
    if (!selectedDelivery) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const driverObj = drivers.find(drv => drv.id === selectedDelivery.motoristaId);
    const html = generateA4ReceiptHtml(selectedDelivery, company, driverObj?.nome);

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="h-full flex bg-[#F5F7FA] font-sans text-slate-800 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser.role}
        enabledModules={company.enabledModules || {}}
        companyName={company.nome}
        userName={currentUser.nome}
        userRoleName={currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'master' ? 'Super Admin' : 'Operador'}
        unreadNotificationsCount={Database.getNotifications(company.id).filter((notification: any) => !notification.readBy.includes(currentUser.id)).length}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F5F7FA]">
        
        {/* CLEAN UNIFIED HEADER */}
        <header className="bg-white border-b border-slate-200/80 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 select-none print:hidden shadow-xs text-slate-800">
          {/* NOME DA EMPRESA LOGADA */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
              <Building className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 cursor-pointer">
              <h1 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-none">
                {company.nome}
              </h1>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* RIGHT CONTROLS: USUÁRIO LOGADO, ESCANEAR QR CODE, NOTIFICAÇÕES, SAIR */}
          <div className="flex items-center gap-2.5 md:gap-3">
            {/* USUÁRIO LOGADO */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">{currentUser.nome}</span>
              <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">
                {currentUser.role === 'admin' ? 'ADMINISTRADOR' : currentUser.role === 'master' ? 'SUPER ADMIN' : 'OPERADOR'}
              </span>
            </div>

            {/* NOTIFICAÇÕES BELL */}
            <button
              onClick={() => setActiveTab('entregas')}
              className="relative p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 rounded-xl transition-all shadow-xs"
              title="Notificações"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] rounded-full flex items-center justify-center border-2 border-white">
                5
              </span>
            </button>

            {/* BOTÃO SAIR */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-all rounded-xl text-xs font-bold shadow-xs"
              title="Sair do Sistema"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

      {/* CORE WORKSPACE PANEL */}
      <div className="flex-1 overflow-y-auto page-content">
        
        {/* TAB 1: ENTREGAS WORKSPACE */}
        {activeTab === 'entregas' && (
          <div className="space-y-6">
            
            {/* 1. BENTO STATISTICS GRID FOR THE CURRENT FILTER DATE */}
            <div className="kpi-grid">
              {/* Card 1: Entregas do Dia */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden border-t-4 border-t-blue-600 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ENTREGAS DO DIA</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.total}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">No período selecionado</div>
              </div>

              {/* Card 2: Em Separação / Aguardando */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden border-t-4 border-t-purple-600 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">EM SEPARAÇÃO</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.awaiting}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">Aguardando motorista</div>
              </div>

              {/* Card 3: Em Rota */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden border-t-4 border-t-cyan-500 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">EM ROTA</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.inRoute}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">Em trânsito urbano</div>
              </div>

              {/* Card 4: Entregues */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden border-t-4 border-t-emerald-500 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ENTREGUES</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.delivered}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">Comprovante anexado</div>
              </div>

              {/* Card 5: Falhas / Canceladas */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden border-t-4 border-t-rose-500 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">FALHAS / CANCELADAS</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.failed + stats.canceled}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">Devolvidas à loja</div>
              </div>

              {/* Card 6: Entregas Atrasadas */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden border-t-4 border-t-amber-500 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ATRASADAS</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.delayed}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">Agendamento vencido</div>
              </div>
            </div>

            {/* FINANCIAL STATS */}
            <div className="financial-grid shadow-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TOTAL RECEBIDO HOJE (EM CAMPO)</span>
                <span className="text-xl font-extrabold text-amber-600 mt-1.5">{formatCurrency(stats.totalCollected)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ESPÉCIE (DINHEIRO)</span>
                <span className="text-base font-bold text-slate-800 mt-1.5">{formatCurrency(stats.cash)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">PIX INSTANTÂNEO</span>
                <span className="text-base font-bold text-slate-800 mt-1.5">{formatCurrency(stats.pix)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">MAQUININHA (CARTÕES)</span>
                <span className="text-base font-bold text-slate-800 mt-1.5">{formatCurrency(stats.card)}</span>
              </div>
            </div>

            {/* FILTERS AND CONTROLS PANEL */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs filters-grid">
              {/* Date View Mode */}
              <div className="flex flex-col w-full">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">VISUALIZAÇÃO</span>
                <select
                  value={dateViewMode}
                  onChange={(e) => setDateViewMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="hoje">Entregas de Hoje</option>
                  <option value="data_selecionada">Data Específica</option>
                  <option value="agendadas">Agendadas / Futuras</option>
                  <option value="todas">Todas as Datas</option>
                </select>
              </div>

              {/* Date select */}
              {dateViewMode === 'data_selecionada' ? (
                <div className="flex flex-col w-full">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">DATA ESPECÍFICA</span>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                /* Status select */
                <div className="flex flex-col w-full">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">STATUS</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="todas">Todos os Status</option>
                    <option value="venda_realizada">Venda Realizada</option>
                    <option value="nf_emitida">NF Emitida</option>
                    <option value="separacao">Separação</option>
                    <option value="aguardando_motorista">Aguardando Motorista</option>
                    <option value="em_rota">Em Rota</option>
                    <option value="entregue">Entregues</option>
                    <option value="nao_entregue">Falhas (Não Entregues)</option>
                    <option value="cancelada">Canceladas</option>
                  </select>
                </div>
              )}

              {/* Driver filter */}
              <div className="flex flex-col w-full">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ENTREGADOR</span>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="todos">Todos ({availableDrivers.length})</option>
                  {availableDrivers.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>

              {/* SEARCH BOX */}
              <div className="filters-search w-full">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">PESQUISA RÁPIDA</span>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar NF, Pedido, Cliente..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* ADD BUTTON */}
              <div className="new-delivery-button">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all shrink-0 active:scale-98 cursor-pointer h-[38px]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span className="whitespace-nowrap">Nova Entrega</span>
                </button>
              </div>
            </div>

            {/* SPLIT VIEW LIST AND DETAILS PANEL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Deliveries list container */}
              <div className={selectedDelivery ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">ENTREGAS RECENTES</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{filteredDeliveries.length} registros</span>
                  </div>

                  {filteredDeliveries.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="font-bold text-slate-800 text-sm mb-1">Nenhuma entrega cadastrada</h3>
                      <p className="text-xs max-w-sm mx-auto text-slate-500">Não há entregas correspondentes para a data e filtros selecionados.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-3 w-8 text-center">
                              <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer" />
                            </th>
                            <th className="p-3">ENTREGA</th>
                            <th className="p-3">CLIENTE</th>
                            <th className="p-3">ENTREGADOR</th>
                            <th className="p-3">STATUS</th>
                            <th className="p-3">PREVISÃO</th>
                            <th className="p-3 text-right">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDeliveries.map(delivery => {
                            const mappedStatus = statusMap[delivery.status];
                            const driverObj = drivers.find(drv => drv.id === delivery.motoristaId);
                            
                            return (
                              <tr
                                key={delivery.id}
                                onClick={() => setSelectedDelivery(delivery)}
                                className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedDelivery?.id === delivery.id ? 'bg-amber-50/50' : ''}`}
                              >
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer" />
                                </td>
                                <td className="p-3">
                                  <div className="font-extrabold text-blue-600">#{delivery.id.slice(-5)}</div>
                                  <div className="text-[10px] text-slate-500 font-medium">NF {delivery.numeroNF}</div>
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900">{delivery.cliente.nome}</div>
                                  <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                    Ped: {delivery.numeroPedido || 'N/A'}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                      {delivery.entregadorNome?.charAt(0) || 'M'}
                                    </div>
                                    <span className="font-semibold text-slate-800 text-xs truncate max-w-[100px]">
                                      {delivery.entregadorNome || 'Não atribuído'}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                                    delivery.status === 'em_rota' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    delivery.status === 'entregue' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    delivery.status === 'separacao' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    delivery.status === 'cancelada' || delivery.status === 'nao_entregue' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                    {mappedStatus.label}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 font-medium text-[11px]">
                                  <div>{formatDate(delivery.dataAgendada || delivery.dataCriacao)}</div>
                                </td>
                                <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setSelectedDelivery(delivery)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                    <button
                      onClick={() => setActiveTab('relatorios')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      Ver todas as entregas <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTIVE DELIVERY DETAILS SIDEBAR */}
              {selectedDelivery && (
                <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-[18px] overflow-hidden shadow-xs h-fit sticky top-4 text-[#0F172A]">
                  <div className="flex flex-col">
                    <div className="bg-[#F8FAFC] border-b border-slate-200 p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">DETALHES DA ENTREGA</span>
                        <h2 className="text-sm font-extrabold text-[#0F172A]">NF {selectedDelivery.numeroNF}</h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setGpsTargetDeliveryId(selectedDelivery.id);
                            setActiveTab('rastreamentoGps');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          title="Abrir no GPS em tempo real"
                        >
                          <Navigation className="w-3.5 h-3.5 text-amber-600" />
                          Mapa
                        </button>
                        <button
                          onClick={() => handleOpenEditDeliveryModal(selectedDelivery)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        {(currentUser.role === 'admin' || currentUser.role === 'master' || currentUser.role === 'operador') && (
                          <button
                            onClick={() => handleOpenDeleteDeliveryModal(selectedDelivery)}
                            className="flex items-center gap-1 px-2 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            id="btn-delete-delivery"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedDelivery(null)}
                          className="text-xs text-slate-500 hover:text-slate-800 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                          title="Fechar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      <DynamicDeliveryDetails
                        delivery={selectedDelivery}
                        company={company}
                        drivers={availableDrivers}
                        onUpdateDelivery={(id, updates) => {
                          onUpdateDelivery(id, updates);
                          setSelectedDelivery(prev => prev ? { ...prev, ...updates } : null);
                        }}
                        onClose={() => setSelectedDelivery(null)}
                        onAdvanceStatus={handleAdvanceStatus}
                        onShowCancelModal={() => setShowCancelModal(true)}
                      />

                      {/* Audit Trail */}
                      {selectedDelivery.historico && selectedDelivery.historico.length > 0 && (
                        <div className="border-t border-slate-200/80 pt-3">
                          <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1 tracking-wider">Linha do Tempo</span>
                          <div className="space-y-2">
                            {selectedDelivery.historico.map(h => (
                              <div key={h.id} className="border-l-2 border-slate-300 pl-2 text-[10px] text-slate-500">
                                <span className="font-bold text-slate-800">{h.statusNovo.toUpperCase()}</span>
                                <span className="block text-slate-500">Por {h.alteradoPor} às {h.alteradoEm && !isNaN(new Date(h.alteradoEm).getTime()) ? new Date(h.alteradoEm).toLocaleTimeString('pt-BR') : '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Excluir Entrega Action Button */}
                      {(currentUser.role === 'admin' || currentUser.role === 'master' || currentUser.role === 'operador') && (
                        <div className="border-t border-slate-200 pt-3">
                          <button
                            onClick={() => handleOpenDeleteDeliveryModal(selectedDelivery)}
                            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                            Excluir Entrega do Sistema
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 1.5: CLIENTES MANAGEMENT */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Gestão de Clientes
                </h2>
                <p className="text-xs text-slate-400">Base unificada de clientes com verificação de integridade e auditoria</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Buscar nome, CPF/CNPJ, tel..."
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={() => setShowAddClientModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Novo Cliente
                </button>
              </div>
            </div>

            {filteredClients.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="font-bold text-white text-sm mb-1">Nenhum cliente encontrado</h3>
                <p className="text-xs max-w-sm mx-auto">Os clientes são salvos automaticamente ao gravar entregas ou podem ser cadastrados manualmente.</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Contato / WhatsApp</th>
                        <th className="p-3">CPF / CNPJ</th>
                        <th className="p-3">Endereço Principal</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map(client => (
                        <tr key={client.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20">
                          <td className="p-3">
                            <div className="font-bold text-white text-sm">{client.nome}</div>
                            {client.email && <div className="text-[10px] text-slate-500">{client.email}</div>}
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-slate-300">{client.telefone}</div>
                            {client.whatsapp && <div className="text-[10px] text-emerald-400 font-mono">WA: {client.whatsapp}</div>}
                          </td>
                          <td className="p-3 font-mono text-slate-400">
                            {client.documento || '-'}
                          </td>
                          <td className="p-3 text-slate-300 max-w-xs truncate">
                            {client.endereco ? `${client.endereco}, ${client.bairro || ''} - ${client.cidade || ''}` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${client.ativo ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-red-950 border border-red-900 text-red-400'}`}>
                              {client.ativo ? 'ATIVO' : 'INATIVO'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => confirmDeleteClient(client)}
                              className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/50 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <Trash className="w-3.5 h-3.5" />
                              Excluir Cliente
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MOTORISTAS REGISTER */}
        {activeTab === 'motoristas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Cadastro de Entregadores</h2>
                <p className="text-xs text-slate-400">Gerencie seus entregadores urbanos de bicicleta, moto, carro ou caminhão</p>
              </div>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setShowDriverModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors font-bold text-xs rounded-lg shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Entregador
                </button>
              )}
            </div>

            {drivers.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="font-bold text-white text-sm mb-1">Nenhum entregador cadastrado</h3>
                <p className="text-xs max-w-sm mx-auto">Adicione seu primeiro motorista ou entregador para poder escalá-los nas entregas da frota.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map(drv => (
                  <div key={drv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-amber-500 font-bold uppercase">
                          {drv.nome.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-white truncate">{drv.nome}</h3>
                          <span className={`text-[9px] font-bold px-2 py-0.2 rounded ${drv.ativo ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                            {drv.ativo ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                        <p><span className="text-slate-500 font-sans">CPF:</span> {drv.cpf}</p>
                        {drv.rg && <p><span className="text-slate-500 font-sans">RG:</span> {drv.rg}</p>}
                        <p><span className="text-slate-500 font-sans">Fone:</span> {drv.telefone}</p>
                        {drv.email && <p><span className="text-slate-500 font-sans">E-mail:</span> {drv.email}</p>}
                        {drv.cnh && <p><span className="text-slate-500 font-sans">CNH:</span> {drv.cnh} (Cat {drv.categoriaCNH || 'B'})</p>}
                      </div>

                      {/* Optional Vehicle Details inside Driver object */}
                      {drv.veiculoTipo ? (
                        <div className="mt-3 bg-slate-950/40 p-2 border border-slate-850 rounded-lg text-xs space-y-0.5">
                          <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider block">Veículo Designado</span>
                          <p className="font-bold text-slate-300">{drv.veiculoMarca} {drv.veiculoModelo}</p>
                          <p className="text-slate-400">{drv.veiculoTipo} | Placa: <span className="font-mono text-white bg-slate-900 px-1 py-0.2 rounded font-bold">{drv.veiculoPlaca || 'SEM PLACA'}</span></p>
                        </div>
                      ) : (
                        <div className="mt-3 text-[11px] text-slate-500 italic bg-slate-950/20 p-2 rounded text-center border border-slate-850/40">
                          Nenhum veículo próprio informado (Pedestre / Rented)
                        </div>
                      )}
                    </div>

                    {currentUser.role === 'admin' && (
                      <div className="mt-4 border-t border-slate-800 pt-3 flex justify-end">
                        <button
                          onClick={() => onDeleteDriver(drv.id)}
                          className="p-1.5 bg-red-950/30 text-red-400 hover:text-red-300 border border-red-900/40 rounded-lg text-xs font-bold transition-colors"
                          title="Remover entregador"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VEICULOS REGISTER */}
        {activeTab === 'veiculos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Cadastro de Veículos</h2>
                <p className="text-xs text-slate-400">Frota de transporte operada pela empresa</p>
              </div>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors font-bold text-xs rounded-lg shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Veículo
                </button>
              )}
            </div>

            {vehicles.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Truck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="font-bold text-white text-sm mb-1">Nenhum veículo cadastrado</h3>
                <p className="text-xs max-w-sm mx-auto">Adicione utilitários para manter controle de placas e modelos associados de forma redundante.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map(v => (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm bg-slate-950 px-2.5 py-1 text-white border border-slate-850 rounded">
                          {v.placa}
                        </span>
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-950 border border-amber-900/30 px-2 py-0.5 rounded uppercase">
                          {v.tipo}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-300 mt-2">{v.modelo}</h4>
                    </div>

                    {currentUser.role === 'admin' && (
                      <div className="mt-4 border-t border-slate-800 pt-3 flex justify-end">
                        <button
                          onClick={() => onDeleteVehicle(v.id)}
                          className="p-1.5 bg-red-950/30 text-red-400 hover:text-red-300 border border-red-900/40 rounded-lg text-xs font-bold transition-colors"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: USUARIOS/COLABORADORES (ADMIN ONLY) */}
        {activeTab === 'colaboradores' && currentUser.role === 'admin' && (() => {
          const companyUsersList = users;
          const isAllSelected = companyUsersList.length > 0 && companyUsersList.every(u => selectedUserIds.includes(u.id));

          const handleSelectAll = (checked: boolean) => {
            if (checked) {
              const allIds = companyUsersList.map(u => u.id);
              setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...allIds])));
            } else {
              const companyUserIds = new Set(companyUsersList.map(u => u.id));
              setSelectedUserIds(selectedUserIds.filter(id => !companyUserIds.has(id)));
            }
          };

          const handleToggleUserSelect = (userId: string) => {
            setSelectedUserIds(prev =>
              prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
            );
          };

          return (
            <div className="space-y-6">
              {/* HEADER */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-extrabold text-slate-900">Usuários & Credenciais do Sistema</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Contas autorizadas para login na plataforma da empresa</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-600 transition-colors font-extrabold text-xs rounded-xl shadow-xs shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  Criar Acesso
                </button>
              </div>

              {/* ACTION BAR FOR SELECTED USERS */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 bg-white cursor-pointer"
                    />
                    <span>Selecionar Todos</span>
                  </label>

                  <div className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                    {selectedUserIds.length} {selectedUserIds.length === 1 ? 'usuário selecionado' : 'usuários selecionados'}
                  </div>

                  {selectedUserIds.length > 0 && (
                    <button
                      onClick={() => setSelectedUserIds([])}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold"
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
                          ativo: u.ativo
                        });
                        setShowEditUserModal(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length === 1
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-600 border-amber-500 shadow-xs'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
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
                      await Database.updateUsersStatusBatch(selectedUserIds, true);
                      setFeedback({ type: 'success', message: `${selectedUserIds.length} usuário(s) ativado(s) com sucesso.` });
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Ativar
                  </button>

                  <button
                    disabled={selectedUserIds.length === 0}
                    onClick={async () => {
                      if (selectedUserIds.length === 0) return;
                      await Database.updateUsersStatusBatch(selectedUserIds, false);
                      setFeedback({ type: 'success', message: `${selectedUserIds.length} usuário(s) bloqueado(s) com sucesso.` });
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
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
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Alterar Perfil
                  </button>

                  <button
                    disabled={selectedUserIds.length === 0}
                    onClick={() => {
                      setBatchPasswordValue('');
                      setShowBatchPasswordModal(true);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      selectedUserIds.length > 0
                        ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
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
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>

              {/* USERS TABLE */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 bg-white cursor-pointer"
                        />
                      </th>
                      <th className="p-3.5 text-left">Nome</th>
                      <th className="p-3.5 text-left">E-mail</th>
                      <th className="p-3.5 text-left">Perfil</th>
                      <th className="p-3.5 text-left">Status</th>
                      <th className="p-3.5 text-center">Último Acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyUsersList.map(u => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <tr key={u.id} className={`border-b border-slate-100 last:border-0 transition-colors ${isSelected ? 'bg-amber-50/60 border-l-4 border-amber-500' : 'hover:bg-slate-50/80'}`}>
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleUserSelect(u.id)}
                              className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 bg-white cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{u.nome}</td>
                          <td className="p-3.5 font-mono text-slate-600">{u.email}</td>
                          <td className="p-3.5">
                            <span className="font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md text-[10px]">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${u.ativo ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                              {u.ativo ? 'ATIVO' : 'BLOQUEADO'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center text-slate-500 font-mono text-[11px]">
                            {u.ultimoLogin ? formatDateTime(u.ultimoLogin) : 'Nenhum'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* TAB: DELIVERY HISTORY (SPRINT 16) */}
        {activeTab === 'historico' && (
          <DeliveryHistoryPanel
            deliveries={deliveries}
            companyName={company.nome}
            onSelectDelivery={(del) => {
              setSelectedDelivery(del);
              setActiveTab('entregas');
            }}
          />
        )}

        {/* TAB: FORM CONFIGURATION (SPRINT 16) */}
        {activeTab === 'formConfig' && (
          <DeliveryFormConfigPanel
            company={company}
            onUpdateCompany={(updated) => {
              if (onUpdateCompany) onUpdateCompany(updated);
            }}
            onSave={async (config) => {
              const res = await Database.updateCompanyFormConfig(company.id, config);
              if (res.success) {
                const updatedComp = { ...company, deliveryFormConfig: config };
                if (onUpdateCompany) onUpdateCompany(updatedComp);
                setFeedback({ type: 'success', message: 'Configurações do formulário salvas com sucesso!' });
                setTimeout(() => setFeedback(null), 4000);
              } else {
                alert('Erro ao salvar configuração: ' + (res.error || 'Erro desconhecido'));
              }
            }}
          />
        )}

        {/* TAB 5: REPORTS & PERFORMANCE (ADMIN ONLY) */}
        {(activeTab === 'relatorios' || activeTab === 'relatorios') && (currentUser.role === 'admin' || currentUser.role === 'master') && (
          <ReportPanel 
            companyId={company.id}
            currentUser={currentUser}
            deliveries={deliveries} 
            drivers={drivers}
            clients={clients}
            auditLogs={auditLogs}
          />
        )}

        {/* TAB: GPS TRACKING & ROUTES (SPRINT 18) */}
        {activeTab === 'rastreamentoGps' && (
          <GpsTrackingPanel
            companyId={company.id}
            deliveries={deliveries}
            drivers={drivers}
            initialSelectedDeliveryId={gpsTargetDeliveryId}
          />
        )}
        {activeTab === 'notificacoes' && <NotificationsPanel companyId={company.id} currentUser={currentUser} />}

        {/* TAB: CONFIGURAÇÕES DA EMPRESA */}
        {activeTab === 'configuracoes' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-extrabold text-slate-900">Configurações do Sistema & Empresa</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Gerencie os parâmetros globais da empresa, limites de operação e configurações da conta.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DADOS DA EMPRESA */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building className="w-4 h-4 text-amber-500" />
                  <span>Dados da Empresa Logada</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">Razão Social / Nome Fantasia</label>
                    <input
                      type="text"
                      disabled
                      value={company.nome}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-extrabold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">CNPJ</label>
                      <input
                        type="text"
                        disabled
                        value={company.cnpj || '00.000.000/0001-00'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 font-mono font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">Telefone / Contato</label>
                      <input
                        type="text"
                        disabled
                        value={company.telefone || '(11) 99999-9999'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-slate-600 text-[11px] font-semibold block">Plano & Licença</span>
                      <span className="font-extrabold text-amber-800 text-xs uppercase">{company.planoContratado || 'SaaS Pro Multiempresas'}</span>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full">
                      Licença Ativa
                    </span>
                  </div>
                </div>
              </div>

              {/* REGRAS OPERACIONAIS */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>Diretrizes e Parâmetros Operacionais</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-amber-500" />
                      GPS Offline & Rastreamento em Tempo Real
                    </span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Pings de localização gravados em segundo plano. Em locais sem cobertura, os dados são preservados em IndexedDB e sincronizados automaticamente.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      Comprovantes & Assinatura Digital
                    </span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Exigência de fotos de entrega, nome do recebedor e documento para baixa e validação no sistema.
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Identidade Visual Fast Gestão padronizada em todos os módulos e relatórios corporativos.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* THEME CONFIGURATION MODAL (SPRINT 18) */}
      <ThemeConfigModal
        empresa={company}
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        onSaved={() => {
          setShowThemeModal(false);
        }}
      />

      {/* -------------------- MODALS -------------------- */}

      {/* 1. ADD NEW DELIVERY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-[18px] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Cadastrar Nova Entrega</h3>
                  <p className="text-xs text-slate-500 font-medium">Preencha os dados da entrega abaixo</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-xl transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DeliveryForm
              company={company}
              availableDrivers={availableDrivers}
              users={users}
              isSubmitting={isSubmittingDelivery}
              submitButtonText="Cadastrar Entrega"
              onSubmit={handleDeliveryFormSubmit}
              onCancel={() => setShowAddModal(false)}
              onNavigateToDrivers={() => {
                setShowAddModal(false);
                setActiveTab('motoristas');
                setShowDriverModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* EDIT DELIVERY MODAL */}
      {showEditDeliveryModal && (editingDelivery || selectedDelivery) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-[18px] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Editar Entrega #{(editingDelivery || selectedDelivery)?.numeroNF}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Atualize as informações da entrega</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowEditDeliveryModal(false);
                  setEditingDelivery(null);
                }} 
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-xl transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DeliveryForm
              company={company}
              initialValues={editingDelivery || selectedDelivery}
              availableDrivers={availableDrivers}
              users={users}
              isSubmitting={isSubmittingDelivery}
              submitButtonText="Salvar Alterações"
              onSubmit={handleSaveEditDeliverySubmit}
              onCancel={() => {
                setShowEditDeliveryModal(false);
                setEditingDelivery(null);
              }}
            />
          </div>
        </div>
      )}

      {/* 2. DRIVER REGISTRATION MODAL */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <form onSubmit={handleCreateDriver} className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                Cadastrar Novo Entregador
              </h3>
              <button type="button" onClick={() => setShowDriverModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Pessoais */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-amber-600 uppercase text-[10px]">Identificação Pessoal</h4>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Nome Completo *</label>
                  <input
                    type="text" required value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#0F172A] font-bold mb-1">CPF *</label>
                    <input
                      type="text" required value={newDriverCPF} onChange={(e) => setNewDriverCPF(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#0F172A] font-bold mb-1">RG</label>
                    <input
                      type="text" value={newDriverRG} onChange={(e) => setNewDriverRG(e.target.value)}
                      placeholder="MG-000.000"
                      className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#0F172A] font-bold mb-1">Telefone *</label>
                    <input
                      type="text" required value={newDriverPhone} onChange={(e) => setNewDriverPhone(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#0F172A] font-bold mb-1">WhatsApp</label>
                    <input
                      type="text" value={newDriverWhatsapp} onChange={(e) => setNewDriverWhatsapp(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">E-mail (Para login do entregador)</label>
                  <input
                    type="email" value={newDriverEmail} onChange={(e) => setNewDriverEmail(e.target.value)}
                    placeholder="entregador@empresa.com"
                    className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Endereço e CNH */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-amber-600 uppercase text-[10px]">Endereço & CNH</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <CepInput
                      label="CEP"
                      value={newDriverCEP}
                      onChange={setNewDriverCEP}
                      targetNumeroInputId="newDriverEnderecoInput"
                      onAddressFound={(addr) => {
                        const fullAddr = addr.bairro ? `${addr.rua}, ${addr.bairro}` : addr.rua;
                        setNewDriverEndereco(fullAddr);
                        if (addr.cidade) setNewDriverCidade(addr.cidade);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Endereço Residencial</label>
                  <input
                    id="newDriverEnderecoInput"
                    name="numero"
                    type="text" value={newDriverEndereco} onChange={(e) => setNewDriverEndereco(e.target.value)}
                    placeholder="Rua, número, bairro"
                    className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Cidade</label>
                  <input
                    type="text" value={newDriverCidade} onChange={(e) => setNewDriverCidade(e.target.value)}
                    placeholder="Cidade / UF"
                    className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[#0F172A] font-bold mb-1">Registro CNH</label>
                    <input
                      type="text" value={newDriverCNH} onChange={(e) => setNewDriverCNH(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#0F172A] font-bold mb-1">Cat.</label>
                    <input
                      type="text" value={newDriverCNHCat} onChange={(e) => setNewDriverCNHCat(e.target.value)}
                      placeholder="A"
                      className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none text-center font-bold uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Validade CNH</label>
                  <input
                    type="date" value={newDriverCNHVal} onChange={(e) => setNewDriverCNHVal(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                  />
                </div>
              </div>

              {/* VEICULO OPCIONAL CONTROLS */}
              <div className="md:col-span-2 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="hasVehicleCheck"
                    checked={hasVehicleInfo}
                    onChange={(e) => setHasVehicleInfo(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="hasVehicleCheck" className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider cursor-pointer select-none">
                    Possui veículo próprio/associado fixo? (Opcional)
                  </label>
                </div>

                {hasVehicleInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 animate-fade-in bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Tipo Veículo</label>
                      <select
                        value={newDriverVeiTipo} onChange={(e) => setNewDriverVeiTipo(e.target.value)}
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2 text-xs text-[#0F172A] font-medium"
                      >
                        <option value="Bicicleta">Bicicleta</option>
                        <option value="Bicicleta Elétrica">Bicicleta Elétrica</option>
                        <option value="Moto">Moto</option>
                        <option value="Carro">Carro</option>
                        <option value="Van">Van / Cargo</option>
                        <option value="Caminhão">Caminhão</option>
                        <option value="Caminhada">Caminhada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Marca</label>
                      <input
                        type="text" value={newDriverVeiMarca} onChange={(e) => setNewDriverVeiMarca(e.target.value)}
                        placeholder="Ex: Honda"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2 text-xs text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Modelo</label>
                      <input
                        type="text" value={newDriverVeiModelo} onChange={(e) => setNewDriverVeiModelo(e.target.value)}
                        placeholder="Ex: CG 160 Cargo"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2 text-xs text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Cor</label>
                      <input
                        type="text" value={newDriverVeiCor} onChange={(e) => setNewDriverVeiCor(e.target.value)}
                        placeholder="Ex: Vermelha"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2 text-xs text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Placa</label>
                      <input
                        type="text" value={newDriverVeiPlaca} onChange={(e) => setNewDriverVeiPlaca(e.target.value)}
                        placeholder="Ex: ABC-1234"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2 text-xs text-[#0F172A] font-mono font-bold uppercase"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-[#0F172A] font-bold mb-1">Observações Internas</label>
                <textarea
                  rows={2} value={newDriverObs} onChange={(e) => setNewDriverObs(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] p-3 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

            </div>

            <div className="border-t border-slate-200 pt-4 flex justify-end gap-2.5">
              <button
                type="button" onClick={() => setShowDriverModal(false)}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Gravar Entregador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CANCEL DELIVERY MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2 uppercase tracking-wider">
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              Cancelar Entrega
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">Informe abaixo o motivo do cancelamento operacional desta entrega para fins de relatório fiscal.</p>
            
            <input
              type="text"
              required
              value={cancelMotive}
              onChange={(e) => setCancelMotive(e.target.value)}
              placeholder="Ex: Erro no endereço de cadastro ou cancelamento do cliente"
              className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-200">
              <button
                type="button" onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button" onClick={handleCancelDeliverySubmit}
                disabled={!cancelMotive}
                className="px-4 py-2 bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] hover:bg-rose-100 rounded-xl font-bold disabled:opacity-50 cursor-pointer"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. USER COLLABORATOR REGISTER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <form onSubmit={handleCreateCollab} className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-lg p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A] max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-200">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                <UserPlus className="w-4 h-4" />
              </div>
              Criar Usuário de Acesso
            </h3>
            
            <div>
              <label className="block text-[#0F172A] font-bold mb-1 text-xs">Nome Completo *</label>
              <input
                type="text" required value={newCollabNome} onChange={(e) => setNewCollabNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1 text-xs">E-mail de Login *</label>
                <input
                  type="email" required value={newCollabEmail} onChange={(e) => setNewCollabEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1 text-xs">Telefone / WhatsApp</label>
                <input
                  type="text" value={newCollabTelefone} onChange={(e) => setNewCollabTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1 text-xs">Senha Inicial</label>
                <input
                  type="password" value={newCollabSenha} onChange={(e) => setNewCollabSenha(e.target.value)}
                  placeholder="Padrão: 123456"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1 text-xs">Confirmar Senha</label>
                <input
                  type="password" value={newCollabConfirmSenha} onChange={(e) => setNewCollabConfirmSenha(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1 text-xs">Perfil de Permissão *</label>
                <select
                  value={newCollabRole} onChange={(e) => setNewCollabRole(e.target.value as any)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none cursor-pointer"
                >
                  <option value="admin">Administrador da Empresa</option>
                  <option value="operador">Operador (Atendente / Logística)</option>
                  <option value="expedidor">Expedidor / Despachante</option>
                  <option value="motorista">Entregador / Motorista (App Celular)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1 text-xs">Status da Conta</label>
                <select
                  value={newCollabAtivo ? 'true' : 'false'} onChange={(e) => setNewCollabAtivo(e.target.value === 'true')}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none cursor-pointer"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo / Bloqueado</option>
                </select>
              </div>
            </div>

            {newCollabRole === 'motorista' && (
              <div>
                <label className="block text-[#0F172A] font-bold mb-1 text-xs">Vincular a qual Cadastro Físico de Entregador?</label>
                <select
                  value={newCollabDriverId} onChange={(e) => setNewCollabDriverId(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:border-[#F59E0B] focus:outline-none cursor-pointer"
                >
                  <option value="">-- Criar Novo ou Selecionar Existente --</option>
                  {drivers.map(drv => (
                    <option key={drv.id} value={drv.id}>{drv.nome} ({drv.cpf || 'Sem CPF'})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
              💡 Se a senha for deixada em branco, a senha temporária inicial será <span className="font-bold text-[#0F172A]">123456</span>. O usuário poderá alterá-la após o primeiro login.
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-200">
              <button
                type="button" onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                Gerar Conta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. NEW VEHICLE MODAL */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <form onSubmit={handleCreateVehicle} className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-sm p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-base font-bold text-[#0F172A] uppercase tracking-wider">Cadastrar Veículo na Frota</h3>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1 text-xs">Placa do Veículo *</label>
              <input
                type="text" required value={newPlaca} onChange={(e) => setNewPlaca(e.target.value)}
                placeholder="Ex: ABC-1234"
                className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] uppercase font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1 text-xs">Modelo do Veículo *</label>
              <input
                type="text" required value={newModelo} onChange={(e) => setNewModelo(e.target.value)}
                placeholder="Ex: Fiat Fiorino 1.4 HD"
                className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1 text-xs">Tipo de Veículo</label>
              <select
                value={newTipo} onChange={(e) => setNewTipo(e.target.value as any)}
                className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] cursor-pointer"
              >
                <option value="moto">Moto</option>
                <option value="carro">Carro de Apoio</option>
                <option value="van">Van / Fiorino</option>
                <option value="outro">Outro (Caminhão, etc.)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-200">
              <button
                type="button" onClick={() => setShowVehicleModal(false)}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] rounded-xl font-bold cursor-pointer shadow-xs"
              >
                Adicionar Veículo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. DELETE CLIENT MODAL WITH INTEGRITY CHECK */}
      {showDeleteClientModal && selectedClientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-5 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <div className="flex items-center gap-2.5 text-rose-600 border-b border-slate-200 pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-[#0F172A]">Excluir Cliente</h3>
            </div>

            {clientDeleteError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <p className="font-extrabold text-rose-800 text-xs">⚠️ Bloqueio de Exclusão por Integridade de Dados</p>
                <p className="text-xs text-rose-900 font-medium">{clientDeleteError}</p>
                {clientDeleteActiveNFs.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Entregas em Andamento:</span>
                    <div className="flex flex-wrap gap-1">
                      {clientDeleteActiveNFs.map(nf => (
                        <span key={nf} className="px-2 py-0.5 bg-white border border-rose-300 text-rose-800 font-mono text-[10px] rounded font-bold">
                          NF {nf}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700 font-medium">
                <p>Tem certeza que deseja excluir permanentemente o cliente <span className="font-extrabold text-[#0F172A]">{selectedClientToDelete.nome}</span>?</p>
                <p className="text-slate-500 text-[11px]">Esta operação será auditada e gravada no sistema central.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowDeleteClientModal(false);
                  setSelectedClientToDelete(null);
                  setClientDeleteError(null);
                }}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {clientDeleteError ? 'Entendido / Voltar' : 'Cancelar'}
              </button>
              {!clientDeleteError && (
                <button
                  disabled={isDeletingClient}
                  onClick={handleExecuteDeleteClient}
                  className="px-4 py-2 bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {isDeletingClient ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. ADD NEW CLIENT MODAL */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <form onSubmit={handleCreateClient} className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-lg p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                Cadastrar Novo Cliente
              </h3>
              <button type="button" onClick={() => setShowAddClientModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-[#0F172A] font-bold mb-1">Nome do Cliente / Razão Social *</label>
                <input
                  type="text" required value={cNome} onChange={(e) => setCNome(e.target.value)}
                  placeholder="Ex: Comercial Silva Ltda"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Telefone *</label>
                <input
                  type="text" required value={cTelefone} onChange={(e) => setCTelefone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">WhatsApp</label>
                <input
                  type="text" value={cWhatsapp} onChange={(e) => setCWhatsapp(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">CPF / CNPJ</label>
                <input
                  type="text" value={cDocumento} onChange={(e) => setCDocumento(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">E-mail</label>
                <input
                  type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)}
                  placeholder="contato@cliente.com"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="md:col-span-2">
                <CepInput
                  label="CEP"
                  value={cCEP}
                  onChange={setCCEP}
                  targetNumeroInputId="clientEnderecoInput"
                  onAddressFound={(addr) => {
                    if (addr.rua) setCEndereco(addr.rua);
                    if (addr.bairro) setCBairro(addr.bairro);
                    if (addr.cidade) setCCidade(addr.estado ? `${addr.cidade} - ${addr.estado}` : addr.cidade);
                  }}
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Endereço (Rua e Nº)</label>
                <input
                  id="clientEnderecoInput"
                  name="numero"
                  type="text" value={cEndereco} onChange={(e) => setCEndereco(e.target.value)}
                  placeholder="Av. Paulista, 1000"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Bairro</label>
                <input
                  type="text" value={cBairro} onChange={(e) => setCBairro(e.target.value)}
                  placeholder="Bela Vista"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-3 border-t border-slate-200">
              <button
                type="button" onClick={() => setShowAddClientModal(false)}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] rounded-xl font-bold cursor-pointer shadow-xs"
              >
                Cadastrar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE DELIVERY CONFIRMATION MODAL */}
      {showDeleteDeliveryModal && deliveryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] max-w-md w-full p-6 space-y-5 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A] text-xs">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-sm">Confirmar Exclusão de Entrega</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">Esta ação removerá a entrega do banco de dados e de todos os painéis em tempo real.</p>
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 p-3 rounded-xl space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-500">Nota Fiscal:</span>
                <span className="font-bold text-[#0F172A]">{deliveryToDelete.numeroNF}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold text-slate-800">{deliveryToDelete.cliente.nome}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Status Atual:</span>
                <span className="font-bold uppercase text-amber-600">{deliveryToDelete.status}</span>
              </div>
            </div>

            {/* Proof / Files check */}
            {(deliveryToDelete.comprovante?.assinaturaUrl || deliveryToDelete.comprovante?.fotoProdutoUrl || deliveryToDelete.comprovante?.fotoFachadaUrl) && (
              <div className="space-y-2 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <label className="font-bold text-amber-900 block text-[11px]">
                  ⚠️ Esta entrega possui comprovantes e arquivos anexados:
                </label>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteFilesOpt"
                      checked={deleteFilesOption === 'only_delivery'}
                      onChange={() => setDeleteFilesOption('only_delivery')}
                      className="text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Excluir somente a entrega</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteFilesOpt"
                      checked={deleteFilesOption === 'delivery_and_files'}
                      onChange={() => setDeleteFilesOption('delivery_and_files')}
                      className="text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-rose-700 font-bold">Excluir entrega e todos os arquivos relacionados</span>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Motivo da exclusão (opcional)</label>
              <textarea
                value={deleteDeliveryMotivo}
                onChange={(e) => setDeleteDeliveryMotivo(e.target.value)}
                placeholder="Digite o motivo para registro no Log de Auditoria..."
                className="w-full bg-white border border-[#CBD5E1] rounded-[12px] p-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-rose-500"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDeleteDeliveryModal(false)}
                disabled={isDeletingDelivery}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDelivery}
                disabled={isDeletingDelivery}
                className="px-4 py-2 bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] hover:bg-rose-100 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
              >
                {isDeletingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER (OPERATOR PANEL) */}
      {showEditUserModal && userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A] text-xs">
            <h3 className="text-base font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-200">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                <Edit3 className="w-4 h-4" />
              </div>
              Editar Dados do Usuário
            </h3>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const res = await Database.updateUser(company.id, userToEdit.id, {
                nome: editUserForm.nome,
                email: editUserForm.email,
                role: editUserForm.role,
                ativo: editUserForm.ativo
              });
              if (res.success) {
                setFeedback({ type: 'success', message: `Usuário "${editUserForm.nome}" atualizado com sucesso!` });
                setShowEditUserModal(false);
                setUserToEdit(null);
              } else {
                setFeedback({ type: 'error', message: res.error || 'Erro ao atualizar usuário.' });
              }
            }} className="space-y-3">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editUserForm.nome}
                  onChange={(e) => setEditUserForm({ ...editUserForm, nome: e.target.value })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Perfil de Acesso *</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as UserRole })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                >
                  <option value="admin">Administrador</option>
                  <option value="operador">Operador</option>
                  <option value="motorista">Entregador / Motorista</option>
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Status de Acesso</label>
                <select
                  value={editUserForm.ativo ? 'true' : 'false'}
                  onChange={(e) => setEditUserForm({ ...editUserForm, ativo: e.target.value === 'true' })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                >
                  <option value="true">Ativo / Liberado</option>
                  <option value="false">Bloqueado / Suspenso</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] font-bold rounded-xl cursor-pointer shadow-xs"
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
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A] text-xs">
            <h3 className="text-base font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-200">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                <Shield className="w-4 h-4" />
              </div>
              Alterar Perfil em Lote
            </h3>

            <p className="text-slate-600 font-medium">
              Selecione o novo perfil que será aplicado aos <strong className="text-[#0F172A]">{selectedUserIds.length}</strong> usuário(s) selecionados:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Novo Perfil *</label>
                <select
                  value={batchRoleValue}
                  onChange={(e) => setBatchRoleValue(e.target.value as UserRole)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                >
                  <option value="admin">Administrador</option>
                  <option value="operador">Operador</option>
                  <option value="motorista">Entregador / Motorista</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowChangeRoleModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await Database.updateUsersRoleBatch(selectedUserIds, batchRoleValue);
                    setShowChangeRoleModal(false);
                    setFeedback({ type: 'success', message: `Perfil alterado para ${batchRoleValue} em ${selectedUserIds.length} usuário(s).` });
                  }}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer shadow-xs"
                >
                  Aplicar Perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BATCH PASSWORD RESET */}
      {showBatchPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A] text-xs">
            <h3 className="text-base font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-200">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                <Key className="w-4 h-4" />
              </div>
              Resetar Senhas em Lote
            </h3>

            <p className="text-slate-600 font-medium">
              Defina a nova senha que será atribuída aos <strong className="text-[#0F172A]">{selectedUserIds.length}</strong> usuários selecionados:
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!batchPasswordValue) return;
              await Database.resetUsersPasswordBatch(selectedUserIds, batchPasswordValue);
              setShowBatchPasswordModal(false);
              setBatchPasswordValue('');
              setFeedback({ type: 'success', message: `Senhas alteradas para ${selectedUserIds.length} usuário(s).` });
            }} className="space-y-3">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Nova Senha em Lote *</label>
                <input
                  type="password"
                  required
                  value={batchPasswordValue}
                  onChange={(e) => setBatchPasswordValue(e.target.value)}
                  placeholder="Digite a nova senha comum"
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBatchPasswordModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Redefinir Senhas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BATCH DELETE CONFIRMATION */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A] text-xs">
            <h3 className="text-base font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-200">
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              Confirmar Exclusão em Lote
            </h3>

            <p className="text-slate-600 font-medium">
              Tem certeza que deseja excluir permanentemente os <strong className="text-[#0F172A]">{selectedUserIds.length}</strong> usuário(s) selecionados?
            </p>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-1">
              {users.filter(u => selectedUserIds.includes(u.id)).map(u => (
                <div key={u.id} className="text-slate-800 font-semibold flex items-center justify-between border-b border-slate-200 pb-1">
                  <span>{u.nome}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{u.email}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-rose-700 font-bold">
              ⚠️ Esta operação excluirá permanentemente os registros do banco de dados e revogará os logins.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const selectedUsersList = users.filter(u => selectedUserIds.includes(u.id)).map(u => ({ id: u.id, companyId: u.companyId }));
                  const res = await Database.deleteUsersBatch(selectedUsersList);
                  setShowBatchDeleteModal(false);
                  if (res.success) {
                    setSelectedUserIds([]);
                    setFeedback({ type: 'success', message: `${res.count} usuário(s) excluído(s) permanentemente com sucesso.` });
                  } else {
                    setFeedback({ type: 'error', message: res.error || 'Erro ao excluir usuários.' });
                  }
                }}
                className="px-5 py-2 bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] hover:bg-rose-100 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
