/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Calendar, Users, Truck, DollarSign, Package, 
  MapPin, CheckCircle2, AlertTriangle, Clock, XCircle, FileText, Phone, 
  FileCheck, Shield, ChevronRight, UserPlus, Trash, Printer, FileDown, Eye, Check, RefreshCw, Loader2
} from 'lucide-react';
import { 
  Entrega, Motorista, Veiculo, Usuario, Empresa, EntregaStatus, 
  FormaPagamento, StatusPagamento, EnderecoInfo, ClienteInfo, HistoricoStatus 
} from '../types';
import QrCodeGenerator from './QrCodeGenerator';
import ReportPanel from './ReportPanel';

interface OperatorPanelProps {
  currentUser: Usuario;
  company: Empresa;
  deliveries: Entrega[];
  drivers: Motorista[];
  vehicles: Veiculo[];
  users: Usuario[];
  onAddDelivery: (delivery: Omit<Entrega, 'id' | 'companyId' | 'criadoPor' | 'criadoEm' | 'atualizadoEm' | 'origem' | 'historico'>) => Promise<void> | void;
  onUpdateDelivery: (id: string, updates: Partial<Entrega>) => void;
  onDeleteDelivery: (id: string) => void;
  onAddDriver: (driver: Omit<Motorista, 'id' | 'companyId' | 'criadoEm'>) => void;
  onUpdateDriver: (id: string, updates: Partial<Motorista>) => void;
  onDeleteDriver: (id: string) => void;
  onAddVehicle: (vehicle: Omit<Veiculo, 'id' | 'companyId'>) => void;
  onUpdateVehicle: (id: string, updates: Partial<Veiculo>) => void;
  onDeleteVehicle: (id: string) => void;
  onAddUser: (nome: string, email: string, role: 'operador' | 'motorista', motoristaId?: string) => void;
  onUpdateUserStatus: (userId: string, ativo: boolean) => void;
  onLogout: () => void;
}

export default function OperatorPanel({
  currentUser,
  company,
  deliveries,
  drivers,
  vehicles,
  users,
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
  onUpdateUserStatus
}: OperatorPanelProps) {
  // Navigation / Tab States
  const [activeTab, setActiveTab] = useState<'entregas' | 'motoristas' | 'veiculos' | 'colaboradores' | 'relatorios'>('entregas');
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [driverFilter, setDriverFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

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
  const [scannedQrCode, setScannedQrCode] = useState<string>('');
  const [showScannerModal, setShowScannerModal] = useState(false);

  // New Delivery Form States
  const [newNF, setNewNF] = useState('');
  const [newPedido, setNewPedido] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [newClientDoc, setNewClientDoc] = useState('');
  const [newRua, setNewRua] = useState('');
  const [newNumero, setNewNumero] = useState('');
  const [newBairro, setNewBairro] = useState('');
  const [newCidade, setNewCidade] = useState('');
  const [newEstado, setNewEstado] = useState('SP');
  const [newCEP, setNewCEP] = useState('');
  const [newComplemento, setNewComplemento] = useState('');
  const [newVolumes, setNewVolumes] = useState(1);
  const [newValor, setNewValor] = useState('');
  const [newFrete, setNewFrete] = useState('');
  const [newFormaPagamento, setNewFormaPagamento] = useState<FormaPagamento>('ja_pago');
  const [newStatusPagamento, setNewStatusPagamento] = useState<StatusPagamento>('pago');
  const [newMotoristaId, setNewMotoristaId] = useState('');
  const [newObs, setNewObs] = useState('');
  const [newPrioridade, setNewPrioridade] = useState<'alta' | 'media' | 'baixa'>('media');
  const [newHora, setNewHora] = useState('');

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
  const [newCollabRole, setNewCollabRole] = useState<'operador' | 'motorista'>('operador');
  const [newCollabDriverId, setNewCollabDriverId] = useState('');

  // Helpers
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR');
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

  // Handle Create Delivery
  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingDelivery) return;

    if (!newNF || !newClientName || !newRua || !newCEP || !newValor) {
      alert('Por favor preencha os campos obrigatórios (*).');
      return;
    }

    setIsSubmittingDelivery(true);

    try {
      // Auto calculate mock locations near SP
      const baseLat = -23.5505;
      const baseLng = -46.6333;
      const randomLat = baseLat + (Math.random() - 0.5) * 0.08;
      const randomLng = baseLng + (Math.random() - 0.5) * 0.08;

      const selectedDriverObj = newMotoristaId ? drivers.find(drv => drv.id === newMotoristaId) : undefined;
      const matchingUser = newMotoristaId 
        ? users.find(u => u.motoristaId === newMotoristaId || (selectedDriverObj?.email && u.email?.toLowerCase() === selectedDriverObj.email.toLowerCase())) 
        : undefined;

      await onAddDelivery({
        numeroNF: newNF,
        numeroPedido: newPedido || undefined,
        cliente: {
          nome: newClientName,
          telefone: newClientPhone,
          whatsapp: newClientWhatsapp || undefined,
          documento: newClientDoc || undefined
        },
        endereco: {
          ruaNumero: newRua,
          numero: newNumero,
          bairro: newBairro,
          cidade: newCidade || 'São Paulo',
          cep: newCEP,
          complemento: newComplemento || undefined,
          latitude: randomLat,
          longitude: randomLng
        },
        volumes: Number(newVolumes),
        valorVenda: parseFloat(newValor.replace(',', '.')),
        valorFrete: newFrete ? parseFloat(newFrete.replace(',', '.')) : undefined,
        formaPagamento: newFormaPagamento,
        statusPagamento: newStatusPagamento,
        status: newMotoristaId ? 'aguardando_motorista' : 'venda_realizada',
        motoristaId: newMotoristaId || undefined,
        entregadorId: matchingUser?.id || undefined,
        entregadorNome: selectedDriverObj?.nome || matchingUser?.nome || undefined,
        dataEntregaPrevista: dateFilter,
        horaEntregaPrevista: newHora || undefined,
        observacoes: newObs || undefined,
        prioridade: newPrioridade
      });

      // Reset Form
      setNewNF('');
      setNewPedido('');
      setNewClientName('');
      setNewClientPhone('');
      setNewClientWhatsapp('');
      setNewClientDoc('');
      setNewRua('');
      setNewNumero('');
      setNewBairro('');
      setNewCidade('');
      setNewCEP('');
      setNewComplemento('');
      setNewVolumes(1);
      setNewValor('');
      setNewFrete('');
      setNewFormaPagamento('ja_pago');
      setNewStatusPagamento('pago');
      setNewMotoristaId('');
      setNewObs('');
      setNewPrioridade('media');
      setNewHora('');

      // Close modal immediately
      setShowAddModal(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar entrega:', err);
      alert(err?.message || 'Erro ao cadastrar entrega. Tente novamente.');
    } finally {
      setIsSubmittingDelivery(false);
    }
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
    onAddUser(
      newCollabNome,
      newCollabEmail,
      newCollabRole,
      newCollabRole === 'motorista' ? newCollabDriverId : undefined
    );
    setNewCollabNome('');
    setNewCollabEmail('');
    setNewCollabRole('operador');
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
    return deliveries.filter(d => {
      // Date Check
      if (d.dataEntregaPrevista !== dateFilter) return false;

      // Status Check
      if (statusFilter !== 'todas' && d.status !== statusFilter) return false;

      // Driver Check
      if (driverFilter !== 'todos' && d.motoristaId !== driverFilter) return false;

      // Search queries (NF, Pedido, Cliente, Telefone, Endereço, Entregador)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const nfMatch = d.numeroNF.toLowerCase().includes(query);
        const orderMatch = d.numeroPedido?.toLowerCase().includes(query) || false;
        const clientMatch = d.cliente.nome.toLowerCase().includes(query);
        const phoneMatch = d.cliente.telefone.includes(query) || d.cliente.whatsapp?.includes(query);
        const addressMatch = d.endereco.ruaNumero.toLowerCase().includes(query) || d.endereco.bairro.toLowerCase().includes(query);
        
        const driverName = drivers.find(drv => drv.id === d.motoristaId)?.nome.toLowerCase() || '';
        const driverMatch = driverName.includes(query);

        return nfMatch || orderMatch || clientMatch || phoneMatch || addressMatch || driverMatch;
      }

      return true;
    });
  }, [deliveries, dateFilter, statusFilter, driverFilter, searchQuery, drivers]);

  // QR Code Simulator
  const handleScanQrCodeSimulate = () => {
    if (!scannedQrCode) return;
    const found = deliveries.find(d => d.id === scannedQrCode || d.numeroNF === scannedQrCode || d.numeroPedido === scannedQrCode);
    if (found) {
      // Ensure we switch to that delivery's date to show it
      setDateFilter(found.dataEntregaPrevista);
      setSelectedDelivery(found);
      setScannedQrCode('');
      setShowScannerModal(false);
    } else {
      alert('Nenhuma entrega correspondente encontrada para este QR Code.');
    }
  };

  // PRINT RECEIPT LAYOUT SIMULATION (PDF Receipt Generation)
  const printOfficialReceipt = () => {
    if (!selectedDelivery) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const driverObj = drivers.find(drv => drv.id === selectedDelivery.motoristaId);

    const html = `
      <html>
        <head>
          <title>Comprovante de Entrega - NF ${selectedDelivery.numeroNF}</title>
          <style>
            body { font-family: sans-serif; color: #0f172a; padding: 32px; max-width: 650px; margin: 0 auto; line-height: 1.5; }
            .border-box { border: 2px solid #0f172a; padding: 24px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px dashed #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; margin-bottom: 4px; }
            .title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
            .section { margin-bottom: 16px; }
            .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; background-color: #f1f5f9; padding: 4px 8px; margin-bottom: 8px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .label { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .val { font-size: 13px; font-weight: bold; margin-top: 2px; }
            .signature-box { border: 1px solid #cbd5e1; height: 120px; border-radius: 6px; margin-top: 8px; display: flex; align-items: center; justify-content: center; background-color: #fafafa; }
            .signature-img { max-height: 100px; max-width: 100%; object-fit: contain; }
            .photo-box { border: 1px solid #cbd5e1; border-radius: 6px; height: 160px; overflow: hidden; margin-top: 8px; background-color: #fafafa; }
            .photo-img { width: 100%; height: 100%; object-fit: cover; }
            .footer { text-align: center; margin-top: 32px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
            @media print {
              body { padding: 0; }
              .border-box { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="border-box">
            <div class="header">
              <div class="logo">FAST GESTÃO</div>
              <div class="title">Comprovante de Entrega Digital</div>
              <div style="font-size: 11px; color: #64748b;">Isolamento de Segurança: ${company.nome}</div>
            </div>

            <div class="grid-2 section">
              <div>
                <span class="label">Nota Fiscal</span>
                <div class="val">${selectedDelivery.numeroNF}</div>
              </div>
              <div>
                <span class="label">Número Pedido</span>
                <div class="val">${selectedDelivery.numeroPedido || 'N/A'}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Destinatário</div>
              <div class="grid-2">
                <div>
                  <span class="label">Nome do Cliente</span>
                  <div class="val">${selectedDelivery.cliente.nome}</div>
                </div>
                <div>
                  <span class="label">Documento</span>
                  <div class="val">${selectedDelivery.cliente.documento || 'NÃO INFORMADO'}</div>
                </div>
              </div>
              <div style="margin-top: 8px;">
                <span class="label">Endereço de Entrega</span>
                <div class="val">${selectedDelivery.endereco.ruaNumero}, Nº ${selectedDelivery.endereco.numero}</div>
                <div class="val" style="font-size:11px; font-weight:normal; color:#475569;">
                  Bairro: ${selectedDelivery.endereco.bairro} | Cidade: ${selectedDelivery.endereco.cidade} | CEP: ${selectedDelivery.endereco.cep}
                </div>
              </div>
            </div>

            <div class="grid-2 section">
              <div>
                <span class="label">Volumes Entregues</span>
                <div class="val">${selectedDelivery.volumes} Vol(s)</div>
              </div>
              <div>
                <span class="label">Valor Cobrado</span>
                <div class="val">${formatCurrency(selectedDelivery.valorVenda)}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Informações de Entrega</div>
              <div class="grid-2">
                <div>
                  <span class="label">Nome do Recebedor</span>
                  <div class="val">${selectedDelivery.comprovante?.recebedorNome || selectedDelivery.cliente.nome}</div>
                </div>
                <div>
                  <span class="label">Entregador Responsável</span>
                  <div class="val">${selectedDelivery.comprovante?.entregadorNome || driverObj?.nome || 'Designado'}</div>
                </div>
              </div>
              <div style="margin-top: 8px;" class="grid-2">
                <div>
                  <span class="label">Data / Hora Conclusão</span>
                  <div class="val">${selectedDelivery.comprovante?.dataHoraEntrega ? new Date(selectedDelivery.comprovante.dataHoraEntrega).toLocaleString('pt-BR') : '-'}</div>
                </div>
                <div>
                  <span class="label">Localização de Precisão GPS</span>
                  <div class="val" style="font-family: monospace; font-size:11px;">
                    ${selectedDelivery.comprovante?.latitudeEntrega?.toFixed(6) || 'N/A'}, ${selectedDelivery.comprovante?.longitudeEntrega?.toFixed(6) || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Comprovação Operacional</div>
              <div class="grid-2">
                <div>
                  <span class="label">Assinatura Digital</span>
                  <div class="signature-box">
                    ${selectedDelivery.comprovante?.assinaturaUrl ? `<img class="signature-img" src="${selectedDelivery.comprovante.assinaturaUrl}"/>` : '<span style="font-size:11px;color:#94a3b8;">Ausente</span>'}
                  </div>
                </div>
                <div>
                  <span class="label">Foto do Produto no Local</span>
                  <div class="photo-box">
                    ${selectedDelivery.comprovante?.fotoProdutoUrl ? `<img class="photo-img" src="${selectedDelivery.comprovante.fotoProdutoUrl}"/>` : '<span style="font-size:11px;color:#94a3b8;">Ausente</span>'}
                  </div>
                </div>
              </div>
            </div>

            <div class="footer">
              Este comprovante possui autenticação criptográfica local da FastGestão.<br/>
              Processado em ambiente seguro com isolamento de dados multitenant.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden">
      
      {/* MODULE NAVIGATION TAB BAR */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 overflow-x-auto select-none print:hidden">
        <div className="flex gap-1 md:gap-2">
          <button
            onClick={() => setActiveTab('entregas')}
            className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all relative border-b-2 ${activeTab === 'entregas' ? 'border-amber-500 text-amber-500 bg-slate-800/40 font-extrabold' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Package className="w-4 h-4" />
            Entregas
          </button>
          
          <button
            onClick={() => setActiveTab('motoristas')}
            className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all relative border-b-2 ${activeTab === 'motoristas' ? 'border-amber-500 text-amber-500 bg-slate-800/40 font-extrabold' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Users className="w-4 h-4" />
            Entregadores
          </button>

          <button
            onClick={() => setActiveTab('veiculos')}
            className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all relative border-b-2 ${activeTab === 'veiculos' ? 'border-amber-500 text-amber-500 bg-slate-800/40 font-extrabold' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Truck className="w-4 h-4" />
            Veículos
          </button>

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('colaboradores')}
                className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all relative border-b-2 ${activeTab === 'colaboradores' ? 'border-amber-500 text-amber-500 bg-slate-800/40 font-extrabold' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                <Shield className="w-4 h-4" />
                Usuários
              </button>
              <button
                onClick={() => setActiveTab('relatorios')}
                className={`px-4 py-3 text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all relative border-b-2 ${activeTab === 'relatorios' ? 'border-amber-500 text-amber-500 bg-slate-800/40 font-extrabold' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                <FileText className="w-4 h-4" />
                Relatórios
              </button>
            </>
          )}
        </div>

        {/* Scan simulation button */}
        <button
          onClick={() => setShowScannerModal(true)}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-850 hover:bg-slate-800 text-amber-500 border border-slate-800 hover:border-amber-500/40 transition-all rounded-lg text-xs font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Escanear QR Code
        </button>
      </div>

      {/* CORE WORKSPACE PANEL */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        
        {/* TAB 1: ENTREGAS WORKSPACE */}
        {activeTab === 'entregas' && (
          <div className="space-y-6">
            
            {/* 1. BENTO STATISTICS GRID FOR THE CURRENT FILTER DATE */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-slate-900 border border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Entregas do Dia</span>
                <span className="text-2xl font-black text-white mt-1">{stats.total}</span>
                <span className="text-[10px] text-slate-400 mt-1">No período selecionado</span>
              </div>

              <div className="bg-slate-900 border border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Em Separação/Aguardando</span>
                <span className="text-2xl font-black text-white mt-1">{stats.awaiting}</span>
                <span className="text-[10px] text-slate-400 mt-1">Aguardando motorista</span>
              </div>

              <div className="bg-slate-900 border border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Em Rota</span>
                <span className="text-2xl font-black text-cyan-400 mt-1">{stats.inRoute}</span>
                <span className="text-[10px] text-slate-400 mt-1">Em trânsito urbano</span>
              </div>

              <div className="bg-slate-900 border border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Entregues</span>
                <span className="text-2xl font-black text-emerald-400 mt-1">{stats.delivered}</span>
                <span className="text-[10px] text-slate-400 mt-1">Comprovante anexado</span>
              </div>

              <div className="bg-slate-900 border border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Falhas / Canceladas</span>
                <span className="text-2xl font-black text-white mt-1">{stats.failed + stats.canceled}</span>
                <span className="text-[10px] text-slate-400 mt-1">Devolvidas à loja</span>
              </div>

              <div className="bg-slate-900 border border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">Entregas Atrasadas</span>
                <span className={`text-2xl font-black mt-1 ${stats.delayed > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`}>{stats.delayed}</span>
                <span className="text-[10px] text-slate-400 mt-1">Agendamento vencido</span>
              </div>
            </div>

            {/* FINANCIAL STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Total Recebido Hoje (Em Campo)</span>
                <span className="text-lg font-black text-amber-500 mt-0.5">{formatCurrency(stats.totalCollected)}</span>
              </div>
              <div className="flex flex-col border-l border-slate-800/80 pl-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Espécie (Dinheiro)</span>
                <span className="text-sm font-bold text-slate-300 mt-0.5">{formatCurrency(stats.cash)}</span>
              </div>
              <div className="flex flex-col border-l border-slate-800/80 pl-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase">PIX Instantâneo</span>
                <span className="text-sm font-bold text-slate-300 mt-0.5">{formatCurrency(stats.pix)}</span>
              </div>
              <div className="flex flex-col border-l border-slate-800/80 pl-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Maquininha (Cartões)</span>
                <span className="text-sm font-bold text-slate-300 mt-0.5">{formatCurrency(stats.card)}</span>
              </div>
            </div>

            {/* FILTERS AND CONTROLS PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Date select */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Previsão</span>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Status select */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg text-white font-bold focus:outline-none focus:border-amber-500"
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

                {/* Driver filter */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Entregador</span>
                  <select
                    value={driverFilter}
                    onChange={(e) => setDriverFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="todos">Todos os Entregadores</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* SEARCH BOX & ADD BUTTON */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar NF, Pedido, Cliente..."
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all font-bold text-xs rounded-lg shadow-md shadow-amber-500/10 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Nova Entrega
                </button>
              </div>
            </div>

            {/* SPLIT VIEW LIST AND DETAIL SIDEBAR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Deliveries list container */}
              <div className="lg:col-span-2 space-y-3">
                {filteredDeliveries.length === 0 ? (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                    <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <h3 className="font-bold text-white text-sm mb-1">Nenhuma entrega cadastrada</h3>
                    <p className="text-xs max-w-sm mx-auto">Não há entregas correspondentes para a data e filtros selecionados. Cadastre uma nova entrega para começar!</p>
                  </div>
                ) : (
                  filteredDeliveries.map(delivery => {
                    const mappedStatus = statusMap[delivery.status];
                    const driverObj = drivers.find(drv => drv.id === delivery.motoristaId);
                    
                    return (
                      <div
                        key={delivery.id}
                        onClick={() => setSelectedDelivery(delivery)}
                        className={`p-4 bg-slate-900 border rounded-xl cursor-pointer hover:border-amber-500/50 hover:bg-slate-900/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${selectedDelivery?.id === delivery.id ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-slate-800/80'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-white">NF {delivery.numeroNF}</span>
                            {delivery.numeroPedido && (
                              <span className="text-[10px] text-slate-500 font-mono">Ped: {delivery.numeroPedido}</span>
                            )}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${mappedStatus.color} ${mappedStatus.bg}`}>
                              {mappedStatus.label}
                            </span>
                            {delivery.prioridade === 'alta' && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-950 border border-red-900 text-red-400">URGENTE</span>
                            )}
                          </div>

                          <h3 className="font-bold text-xs text-white truncate">{delivery.cliente.nome}</h3>
                          <p className="text-[11px] text-slate-400 mt-1 truncate">
                            {delivery.endereco.ruaNumero}, Nº {delivery.endereco.numero} — {delivery.endereco.bairro}
                          </p>
                        </div>

                        {/* Middle metadata column */}
                        <div className="flex items-center gap-6 shrink-0 text-xs">
                          <div className="flex flex-col text-slate-500">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Volume(s)</span>
                            <span className="font-bold text-slate-300 font-mono">{delivery.volumes} vol</span>
                          </div>

                          <div className="flex flex-col text-slate-500">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Motorista</span>
                            <span className="font-bold text-slate-300 truncate max-w-24">
                              {driverObj ? driverObj.nome : 'Não escalado'}
                            </span>
                          </div>

                          <div className="flex flex-col text-right">
                            <span className="text-xs font-black text-amber-500 font-mono">
                              {formatCurrency(delivery.valorVenda)}
                            </span>
                            <span className={`text-[9px] font-bold uppercase mt-0.5 ${delivery.statusPagamento === 'pago' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {delivery.statusPagamento === 'pago' ? 'PAGO' : 'C. ENTREGA'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ACTIVE DELIVERY DETAILS SIDEBAR */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm h-fit sticky top-4">
                {selectedDelivery ? (
                  <div className="flex flex-col">
                    <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">DETALHES DA ENTREGA</span>
                        <h2 className="text-sm font-bold text-white">NF {selectedDelivery.numeroNF}</h2>
                      </div>
                      <button
                        onClick={() => setSelectedDelivery(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="p-4 space-y-4 text-xs">
                      {/* Cliente */}
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Destinatário</span>
                        <h4 className="font-bold text-white text-xs mt-0.5">{selectedDelivery.cliente.nome}</h4>
                        <p className="text-slate-400 mt-1 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {selectedDelivery.cliente.telefone}
                        </p>
                        {selectedDelivery.cliente.whatsapp && (
                          <p className="text-slate-400 mt-0.5 flex items-center gap-1">
                            <span className="text-emerald-500 font-bold">W:</span>
                            {selectedDelivery.cliente.whatsapp}
                          </p>
                        )}
                      </div>

                      {/* Endereço */}
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Endereço de Entrega</span>
                        <p className="font-medium text-slate-300 mt-0.5">
                          {selectedDelivery.endereco.ruaNumero}, Nº {selectedDelivery.endereco.numero}
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          {selectedDelivery.endereco.bairro} — {selectedDelivery.endereco.cidade} / {newEstado}
                        </p>
                        <p className="font-mono text-slate-500 mt-1">CEP: {selectedDelivery.endereco.cep}</p>
                        {selectedDelivery.endereco.complemento && (
                          <p className="mt-2 bg-amber-950/30 text-amber-400 border border-amber-900/40 p-2 rounded text-[11px]">
                            <span className="font-bold">Compl:</span> {selectedDelivery.endereco.complemento}
                          </p>
                        )}
                      </div>

                      {/* Volumes, Price, Frete */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-850 text-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Volumes</span>
                          <span className="block font-bold text-white mt-0.5 font-mono">{selectedDelivery.volumes} vol</span>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-850 text-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Valor Venda</span>
                          <span className="block font-bold text-amber-500 mt-0.5 font-mono">{formatCurrency(selectedDelivery.valorVenda)}</span>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-850 text-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Frete</span>
                          <span className="block font-bold text-slate-300 mt-0.5 font-mono">
                            {selectedDelivery.valorFrete ? formatCurrency(selectedDelivery.valorFrete) : 'Grátis'}
                          </span>
                        </div>
                      </div>

                      {/* Payment */}
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Forma Pagamento</span>
                          <span className="font-bold text-white text-xs uppercase">{selectedDelivery.formaPagamento.replace('_', ' ')}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedDelivery.statusPagamento === 'pago' ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-red-950 border border-red-900 text-red-400'}`}>
                          {selectedDelivery.statusPagamento === 'pago' ? 'PAGO / RECEBIDO' : 'PAGAR NA ENTREGA'}
                        </span>
                      </div>

                      {/* QR Code integration display (Click to scan simulation) */}
                      <div className="border border-slate-850 p-3 rounded-lg bg-slate-950/40 flex items-center gap-3">
                        <QrCodeGenerator 
                          value={selectedDelivery.id} 
                          size={60} 
                          onClick={() => {
                            setSelectedDelivery(selectedDelivery);
                            alert(`QR Code correspondente à NF ${selectedDelivery.numeroNF}.`);
                          }}
                        />
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Etiqueta de Precisão</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Escaneie para carregar esta entrega instantaneamente.</p>
                        </div>
                      </div>

                      {/* STEP STATE MANAGER - ADVANCE AND MANAGE DELIVERY */}
                      {selectedDelivery.status !== 'entregue' && selectedDelivery.status !== 'cancelada' ? (
                        <div className="border-t border-slate-800 pt-4 space-y-3">
                          <span className="text-[9px] text-slate-500 font-bold uppercase block">Fluxo da Entrega</span>
                          
                          {/* Next Status button progression */}
                          <div className="flex flex-col gap-2">
                            {selectedDelivery.status === 'venda_realizada' && (
                              <button
                                onClick={() => handleAdvanceStatus('nf_emitida')}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg"
                              >
                                Emitir Nota Fiscal
                              </button>
                            )}
                            {selectedDelivery.status === 'nf_emitida' && (
                              <button
                                onClick={() => handleAdvanceStatus('separacao')}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
                              >
                                Enviar para Separação
                              </button>
                            )}
                            {selectedDelivery.status === 'separacao' && (
                              <button
                                onClick={() => handleAdvanceStatus('aguardando_motorista')}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg"
                              >
                                Finalizar Separação (Aguardando Motorista)
                              </button>
                            )}
                            {selectedDelivery.status === 'aguardando_motorista' && (
                              <div className="p-2.5 bg-slate-950 text-purple-400 border border-purple-900/40 rounded-lg text-center">
                                Aguardando o motorista iniciar a entrega via celular
                              </div>
                            )}
                            {selectedDelivery.status === 'em_rota' && (
                              <div className="p-2.5 bg-slate-950 text-cyan-400 border border-cyan-900/40 rounded-lg text-center">
                                Motorista em rota de entrega urbana...
                              </div>
                            )}
                          </div>

                          {/* Driver Assignment Dropdown */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase block">Motorista Responsável</label>
                            <select
                              value={selectedDelivery.motoristaId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value || undefined;
                                const assocUser = users.find(u => u.motoristaId === selectedId);
                                const drvObj = drivers.find(drv => drv.id === selectedId);
                                const updates: any = {
                                  motoristaId: selectedId,
                                  entregadorId: assocUser?.id || undefined,
                                  entregadorNome: drvObj?.nome || undefined
                                };
                                // If assigning a driver to a pending prep delivery, advance status to ready/awaiting driver
                                if (selectedId && (selectedDelivery.status === 'venda_realizada' || selectedDelivery.status === 'nf_emitida' || selectedDelivery.status === 'separacao')) {
                                  updates.status = 'aguardando_motorista';
                                }
                                onUpdateDelivery(selectedDelivery.id, updates);
                                setSelectedDelivery(prev => prev ? { ...prev, ...updates } : null);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-amber-500 text-white"
                            >
                              <option value="">-- Selecionar Motorista --</option>
                              {drivers.map(drv => (
                                <option key={drv.id} value={drv.id}>{drv.nome}</option>
                              ))}
                            </select>
                          </div>

                          {/* Order Index */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase block">Ordem na Rota</label>
                            <input
                              type="number"
                              min="1"
                              value={selectedDelivery.ordemRota || ''}
                              onChange={(e) => {
                                onUpdateDelivery(selectedDelivery.id, { ordemRota: Number(e.target.value) || undefined });
                                setSelectedDelivery(prev => prev ? { ...prev, ordemRota: Number(e.target.value) || undefined } : null);
                              }}
                              placeholder="Posição na rota (Ex: 1)"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500 text-white font-mono"
                            />
                          </div>

                          {/* Cancel button */}
                          <button
                            onClick={() => setShowCancelModal(true)}
                            className="w-full py-2 bg-red-950/30 text-red-400 border border-red-900/30 hover:bg-red-950/50 transition-colors rounded-lg font-bold text-xs"
                          >
                            Cancelar Entrega
                          </button>
                        </div>
                      ) : (
                        /* Concluding Proof view */
                        selectedDelivery.status === 'entregue' ? (
                          <div className="border-t border-slate-800 pt-4 space-y-3">
                            <h4 className="text-emerald-400 font-bold flex items-center gap-1 uppercase text-[10px]">
                              <FileCheck className="w-4 h-4" /> Comprovante Assinado Salvo
                            </h4>

                            {selectedDelivery.comprovante?.fotoProdutoUrl && (
                              <div className="rounded-lg overflow-hidden border border-slate-800 h-32 bg-slate-950">
                                <img 
                                  src={selectedDelivery.comprovante.fotoProdutoUrl} 
                                  alt="Foto entrega"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {selectedDelivery.comprovante?.assinaturaUrl && (
                              <div className="rounded-lg border border-slate-800 bg-white p-2 flex items-center justify-center">
                                <img 
                                  src={selectedDelivery.comprovante.assinaturaUrl} 
                                  alt="Assinatura"
                                  className="h-16 max-w-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 font-mono text-[10px] space-y-1 text-slate-400">
                              <p><span className="text-white">Recebedor:</span> {selectedDelivery.comprovante?.recebedorNome || selectedDelivery.cliente.nome}</p>
                              <p><span className="text-white">Data/Hora:</span> {formatDateTime(selectedDelivery.comprovante?.dataHoraEntrega)}</p>
                              {selectedDelivery.comprovante?.latitudeEntrega && (
                                <p><span className="text-white">GPS:</span> {selectedDelivery.comprovante.latitudeEntrega.toFixed(6)}, {selectedDelivery.comprovante.longitudeEntrega?.toFixed(6)}</p>
                              )}
                            </div>

                            <button
                              onClick={printOfficialReceipt}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-500 font-bold rounded-lg flex items-center justify-center gap-1.5 border border-slate-700"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Gerar Comprovante PDF
                            </button>
                          </div>
                        ) : (
                          // Cancelled
                          <div className="border-t border-slate-800 pt-4 bg-slate-950/20 p-3 rounded-lg text-slate-400 text-xs italic">
                            Cancelado: "{selectedDelivery.motivoNaoEntregue || 'Sem justificativa'}"
                          </div>
                        )
                      )}

                      {/* Operator observations */}
                      {selectedDelivery.observacoes && (
                        <div className="border-t border-slate-800 pt-3">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Observações Operador</span>
                          <p className="text-slate-400 italic mt-0.5">"{selectedDelivery.observacoes}"</p>
                        </div>
                      )}

                      {/* Audit Trail */}
                      {selectedDelivery.historico && selectedDelivery.historico.length > 0 && (
                        <div className="border-t border-slate-850 pt-3">
                          <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Linha do Tempo</span>
                          <div className="space-y-2">
                            {selectedDelivery.historico.map(h => (
                              <div key={h.id} className="border-l border-slate-800 pl-2 text-[10px] text-slate-500">
                                <span className="font-bold text-slate-400">{h.statusNovo.toUpperCase()}</span>
                                <span className="block">Por {h.alteradoPor} às {new Date(h.alteradoEm).toLocaleTimeString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                    <h3 className="font-bold text-white text-xs mb-1">Nenhuma entrega selecionada</h3>
                    <p className="text-[11px] max-w-xs mx-auto">Clique em qualquer entrega na lista para carregar os controles de status, observações e comprovantes de assinatura digital.</p>
                  </div>
                )}
              </div>

            </div>

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
        {activeTab === 'colaboradores' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Usuários & Credenciais do Sistema</h2>
                <p className="text-xs text-slate-400">Contas autorizadas para login na plataforma administrativa e de entregadores</p>
              </div>

              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors font-bold text-xs rounded-lg shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Criar Acesso
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="p-3 text-left">Nome</th>
                    <th className="p-3 text-left">E-mail</th>
                    <th className="p-3 text-left">Perfil</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-center">Último Acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20">
                      <td className="p-3 font-bold text-white">{u.nome}</td>
                      <td className="p-3 font-mono">{u.email}</td>
                      <td className="p-3 font-bold uppercase text-amber-500">{u.role}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.ativo ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-red-950 border border-red-900 text-red-400'}`}>
                          {u.ativo ? 'ATIVO' : 'SUSPENSO'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono">
                        {u.ultimoLogin ? formatDateTime(u.ultimoLogin) : 'Nenhum'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: REPORTS & PERFORMANCE (ADMIN ONLY) */}
        {activeTab === 'relatorios' && currentUser.role === 'admin' && (
          <ReportPanel deliveries={deliveries} drivers={drivers} />
        )}

      </div>

      {/* -------------------- MODALS -------------------- */}

      {/* 1. ADD NEW DELIVERY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto select-none">
          <form onSubmit={handleCreateDelivery} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Package className="w-5 h-5 text-amber-500" />
                Cadastrar Nova Entrega
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-xs bg-slate-800 px-2 py-1 rounded">Fechar</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Documentos */}
              <div className="space-y-4">
                <h4 className="font-bold text-amber-500 uppercase text-[10px] tracking-wider">Identificação fiscal</h4>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Número da Nota Fiscal *</label>
                  <input
                    type="text" required value={newNF} onChange={(e) => setNewNF(e.target.value)}
                    placeholder="Ex: 001.245-A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Número do Pedido</label>
                  <input
                    type="text" value={newPedido} onChange={(e) => setNewPedido(e.target.value)}
                    placeholder="Ex: PD-89542"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Cliente */}
              <div className="space-y-4">
                <h4 className="font-bold text-amber-500 uppercase text-[10px] tracking-wider">Dados do Cliente</h4>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nome do Cliente *</label>
                  <input
                    type="text" required value={newClientName} onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nome completo do comprador"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Telefone Celular</label>
                    <input
                      type="text" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">WhatsApp</label>
                    <input
                      type="text" value={newClientWhatsapp} onChange={(e) => setNewClientWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">CNPJ ou CPF</label>
                  <input
                    type="text" value={newClientDoc} onChange={(e) => setNewClientDoc(e.target.value)}
                    placeholder="Documento para NF-e"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="md:col-span-2 space-y-4 pt-2">
                <h4 className="font-bold text-amber-500 uppercase text-[10px] tracking-wider">Endereço de Destino (Localização Automática por Google Maps Ativada)</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <label className="block text-slate-400 mb-1 font-semibold">Rua / Logradouro *</label>
                    <input
                      type="text" required value={newRua} onChange={(e) => setNewRua(e.target.value)}
                      placeholder="Av. Paulista, etc"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Número *</label>
                    <input
                      type="text" required value={newNumero} onChange={(e) => setNewNumero(e.target.value)}
                      placeholder="Ex: 1000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">CEP *</label>
                    <input
                      type="text" required value={newCEP} onChange={(e) => setNewCEP(e.target.value)}
                      placeholder="01311-100"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Bairro</label>
                    <input
                      type="text" value={newBairro} onChange={(e) => setNewBairro(e.target.value)}
                      placeholder="Bela Vista"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Cidade</label>
                    <input
                      type="text" value={newCidade} onChange={(e) => setNewCidade(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Complemento / Referência</label>
                    <input
                      type="text" value={newComplemento} onChange={(e) => setNewComplemento(e.target.value)}
                      placeholder="Apto 52, bloco B, etc."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Valores & Pagamentos */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-amber-500 uppercase text-[10px] tracking-wider">Financeiro e Logística</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Volumes *</label>
                    <input
                      type="number" required min="1" value={newVolumes} onChange={(e) => setNewVolumes(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Venda *</label>
                    <input
                      type="text" required value={newValor} onChange={(e) => setNewValor(e.target.value)}
                      placeholder="R$ 150,00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Frete</label>
                    <input
                      type="text" value={newFrete} onChange={(e) => setNewFrete(e.target.value)}
                      placeholder="Opcional"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Forma de Pagamento</label>
                    <select
                      value={newFormaPagamento} onChange={(e) => setNewFormaPagamento(e.target.value as FormaPagamento)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    >
                      <option value="ja_pago">Já Pago no Site/Loja</option>
                      <option value="pix">PIX na entrega</option>
                      <option value="dinheiro">Dinheiro na entrega</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Status Pagamento</label>
                    <select
                      value={newStatusPagamento} onChange={(e) => setNewStatusPagamento(e.target.value as StatusPagamento)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    >
                      <option value="pago">PAGO (Já liquidado)</option>
                      <option value="receber_na_entrega">RECEBER NA ENTREGA</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rota */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-amber-500 uppercase text-[10px] tracking-wider">Agendamento & Designação</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Prioridade</label>
                    <select
                      value={newPrioridade} onChange={(e) => setNewPrioridade(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta / Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Hora Estimada</label>
                    <input
                      type="time" value={newHora} onChange={(e) => setNewHora(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Escalar Motorista</label>
                  <select
                    value={newMotoristaId} onChange={(e) => setNewMotoristaId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="">Não designar motorista agora</option>
                    {drivers.map(drv => (
                      <option key={drv.id} value={drv.id}>{drv.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Obs */}
              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1">Observações Operacionais</label>
                <textarea
                  rows={2} value={newObs} onChange={(e) => setNewObs(e.target.value)}
                  placeholder="Instruções para o entregador..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-end gap-2">
              <button
                type="button" onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmittingDelivery}
                className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold flex items-center gap-2"
              >
                {isSubmittingDelivery ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gravando...
                  </>
                ) : (
                  'Gravar Registro'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. DRIVER REGISTRATION MODAL */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto select-none">
          <form onSubmit={handleCreateDriver} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Users className="w-5 h-5 text-amber-500" />
                Cadastrar Novo Entregador
              </h3>
              <button type="button" onClick={() => setShowDriverModal(false)} className="text-slate-400 hover:text-white text-xs bg-slate-800 px-2 py-1 rounded">Fechar</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Pessoais */}
              <div className="space-y-4">
                <h4 className="font-bold text-amber-500 uppercase text-[10px]">Identificação Pessoal</h4>
                <div>
                  <label className="block text-slate-400 mb-1">Nome Completo *</label>
                  <input
                    type="text" required value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">CPF *</label>
                    <input
                      type="text" required value={newDriverCPF} onChange={(e) => setNewDriverCPF(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">RG</label>
                    <input
                      type="text" value={newDriverRG} onChange={(e) => setNewDriverRG(e.target.value)}
                      placeholder="MG-000.000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Telefone *</label>
                    <input
                      type="text" required value={newDriverPhone} onChange={(e) => setNewDriverPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">WhatsApp</label>
                    <input
                      type="text" value={newDriverWhatsapp} onChange={(e) => setNewDriverWhatsapp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">E-mail (Para login do entregador)</label>
                  <input
                    type="email" value={newDriverEmail} onChange={(e) => setNewDriverEmail(e.target.value)}
                    placeholder="entregador@empresa.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Endereço e CNH */}
              <div className="space-y-4">
                <h4 className="font-bold text-amber-500 uppercase text-[10px]">Endereço & CNH</h4>
                <div>
                  <label className="block text-slate-400 mb-1">Endereço Residencial</label>
                  <input
                    type="text" value={newDriverEndereco} onChange={(e) => setNewDriverEndereco(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Cidade</label>
                    <input
                      type="text" value={newDriverCidade} onChange={(e) => setNewDriverCidade(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CEP</label>
                    <input
                      type="text" value={newDriverCEP} onChange={(e) => setNewDriverCEP(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="col-span-2">
                    <label className="block text-slate-400 mb-1">Registro CNH</label>
                    <input
                      type="text" value={newDriverCNH} onChange={(e) => setNewDriverCNH(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Categoria</label>
                    <input
                      type="text" value={newDriverCNHCat} onChange={(e) => setNewDriverCNHCat(e.target.value)}
                      placeholder="A"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Validade CNH</label>
                  <input
                    type="date" value={newDriverCNHVal} onChange={(e) => setNewDriverCNHVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              {/* VEICULO OPCIONAL CONTROLS */}
              <div className="md:col-span-2 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="hasVehicleCheck"
                    checked={hasVehicleInfo}
                    onChange={(e) => setHasVehicleInfo(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500"
                  />
                  <label htmlFor="hasVehicleCheck" className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer select-none">
                    Possui veículo próprio/associado fixo? (Opcional)
                  </label>
                </div>

                {hasVehicleInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 animate-fade-in">
                    <div>
                      <label className="block text-slate-400 mb-1">Tipo Veículo</label>
                      <select
                        value={newDriverVeiTipo} onChange={(e) => setNewDriverVeiTipo(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
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
                      <label className="block text-slate-400 mb-1">Marca</label>
                      <input
                        type="text" value={newDriverVeiMarca} onChange={(e) => setNewDriverVeiMarca(e.target.value)}
                        placeholder="Ex: Honda"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Modelo</label>
                      <input
                        type="text" value={newDriverVeiModelo} onChange={(e) => setNewDriverVeiModelo(e.target.value)}
                        placeholder="Ex: CG 160 Cargo"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Cor</label>
                      <input
                        type="text" value={newDriverVeiCor} onChange={(e) => setNewDriverVeiCor(e.target.value)}
                        placeholder="Ex: Vermelha"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Placa</label>
                      <input
                        type="text" value={newDriverVeiPlaca} onChange={(e) => setNewDriverVeiPlaca(e.target.value)}
                        placeholder="Ex: ABC-1234"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1">Observações Internas</label>
                <textarea
                  rows={2} value={newDriverObs} onChange={(e) => setNewDriverObs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-end gap-2">
              <button
                type="button" onClick={() => setShowDriverModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold"
              >
                Gravar Entregador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CANCEL DELIVERY MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Cancelar Entrega
            </h3>
            <p className="text-xs text-slate-400">Informe abaixo o motivo do cancelamento operacional desta entrega para fins de relatório fiscal.</p>
            
            <input
              type="text"
              required
              value={cancelMotive}
              onChange={(e) => setCancelMotive(e.target.value)}
              placeholder="Ex: Erro no endereço de cadastro ou cancelamento do cliente"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
            />

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button" onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold"
              >
                Voltar
              </button>
              <button
                type="button" onClick={handleCancelDeliverySubmit}
                disabled={!cancelMotive}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg font-bold disabled:opacity-50"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. USER COLLABORATOR REGISTER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
          <form onSubmit={handleCreateCollab} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Criar Usuário de Acesso</h3>
            
            <div>
              <label className="block text-slate-400 mb-1 text-xs">Nome Completo</label>
              <input
                type="text" required value={newCollabNome} onChange={(e) => setNewCollabNome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 text-xs">E-mail de Login</label>
              <input
                type="email" required value={newCollabEmail} onChange={(e) => setNewCollabEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 text-xs">Perfil de Permissão</label>
              <select
                value={newCollabRole} onChange={(e) => setNewCollabRole(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="operador">Operador (Acompanhamento e Criação)</option>
                <option value="motorista">Entregador / Motorista (App Celular)</option>
              </select>
            </div>

            {newCollabRole === 'motorista' && (
              <div>
                <label className="block text-slate-400 mb-1 text-xs">Vincular a qual Cadastro Físico?</label>
                <select
                  required
                  value={newCollabDriverId} onChange={(e) => setNewCollabDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">-- Selecione o Entregador --</option>
                  {drivers.map(drv => (
                    <option key={drv.id} value={drv.id}>{drv.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[11px] text-slate-400">
              💡 A senha temporária padrão de fábrica para novas contas será <span className="font-bold text-white">123456</span>. O usuário poderá alterá-la livremente após o primeiro login através de seu Perfil.
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button" onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg font-bold"
              >
                Gerar Conta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. QR CODE SCANNING SIMULATOR MODAL */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
              Simulador de Leitor QR Code
            </h3>
            <p className="text-xs text-slate-400">Selecione uma entrega ou digite a Nota Fiscal correspondente para simular o escaneamento físico da etiqueta QR Code.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Selecione uma entrega para Escanear</label>
                <select
                  value={scannedQrCode}
                  onChange={(e) => setScannedQrCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                >
                  <option value="">-- Escolher Entrega Registrada --</option>
                  {deliveries.map(d => (
                    <option key={d.id} value={d.id}>NF {d.numeroNF} — {d.cliente.nome}</option>
                  ))}
                </select>
              </div>

              <div className="relative my-4 flex items-center">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="px-3 text-xs text-slate-500 uppercase tracking-widest bg-slate-900">Ou digite manualmente</span>
                <div className="flex-1 border-t border-slate-800"></div>
              </div>

              <div>
                <input
                  type="text"
                  value={scannedQrCode}
                  onChange={(e) => setScannedQrCode(e.target.value)}
                  placeholder="Número da NF ou ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                type="button" onClick={() => setShowScannerModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleScanQrCodeSimulate}
                disabled={!scannedQrCode}
                className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg font-bold disabled:opacity-40"
              >
                Carregar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. NEW VEHICLE MODAL */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
          <form onSubmit={handleCreateVehicle} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cadastrar Veículo na Frota</h3>

            <div>
              <label className="block text-slate-400 mb-1 text-xs">Placa do Veículo *</label>
              <input
                type="text" required value={newPlaca} onChange={(e) => setNewPlaca(e.target.value)}
                placeholder="Ex: ABC-1234"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 text-xs">Modelo do Veículo *</label>
              <input
                type="text" required value={newModelo} onChange={(e) => setNewModelo(e.target.value)}
                placeholder="Ex: Fiat Fiorino 1.4 HD"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 text-xs">Tipo de Veículo</label>
              <select
                value={newTipo} onChange={(e) => setNewTipo(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="moto">Moto</option>
                <option value="carro">Carro de Apoio</option>
                <option value="van">Van / Fiorino</option>
                <option value="outro">Outro (Caminhão, etc.)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                type="button" onClick={() => setShowVehicleModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg font-bold"
              >
                Adicionar Veículo
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
