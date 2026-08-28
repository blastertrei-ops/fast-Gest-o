/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, MapPin, Phone, Clock, DollarSign, Package, Check, X, Navigation, 
  ChevronRight, Camera, FileText, AlertTriangle, RefreshCw, MapPinOff, 
  Wifi, WifiOff, LogOut, FileCheck, Shield, Search, UserCheck, Calendar
} from 'lucide-react';
import { Entrega, Motorista, Veiculo, Usuario, EntregaStatus, ComprovanteInfo, HistoricoStatus } from '../types';
import SignaturePad from './SignaturePad';
import FastGestaoLogo from './FastGestaoLogo';
import BrandLogo from './BrandLogo';
import { startDriverGpsTracking, stopDriverGpsTracking } from '../lib/gpsTracker';

interface DriverPanelProps {
  currentUser: Usuario;
  deliveries: Entrega[];
  drivers: Motorista[];
  vehicles: Veiculo[];
  onUpdateDelivery: (id: string, updates: Partial<Entrega>) => void;
  onLogout: () => void;
}

export default function DriverPanel({
  currentUser,
  deliveries,
  drivers,
  vehicles,
  onUpdateDelivery,
  onLogout
}: DriverPanelProps) {
  // Mobile UI screens inside the driver flow: 'list' | 'detail' | 'confirm' | 'fail'
  const [currentScreen, setCurrentScreen] = useState<'list' | 'detail' | 'confirm' | 'fail'>('list');
  const [selectedDelivery, setSelectedDelivery] = useState<Entrega | null>(null);

  // Delivery confirmation inputs (Signature, Photo, Recebedor, Documento & Observação)
  const [recebedorNome, setRecebedorNome] = useState<string>('');
  const [documentoRecebedor, setDocumentoRecebedor] = useState<string>('');
  const [observacaoEntrega, setObservacaoEntrega] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Delivery failure inputs
  const [failReason, setFailReason] = useState<string>('Cliente ausente');
  const [failDetails, setFailDetails] = useState<string>('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Simulated Offline State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Resolve the active driver physical row using currentUser's motoristaId link, email, or name
  const currentDriver = 
    drivers.find(d => d.id === currentUser.motoristaId) ||
    drivers.find(d => d.email && currentUser.email && d.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    drivers.find(d => d.nome && currentUser.nome && d.nome.toLowerCase() === currentUser.nome.toLowerCase());

  // Log active logged-in driver user information on mount and session updates
  useEffect(() => {
    if (currentUser) {
      console.log("=== PAINEL DO ENTREGADOR (SPRINT 18 - MINHAS ENTREGAS) ===");
      console.log("currentUser.id:", currentUser.id);
      console.log("currentUser.nome:", currentUser.nome);
      console.log("currentUser.motoristaId:", currentUser.motoristaId);
      console.log("currentDriver ID:", currentDriver?.id || "Nenhum");
      console.log("=========================================================");
    }
  }, [currentUser, currentDriver]);

  // Start real-time GPS tracking for active driver
  useEffect(() => {
    const driverId = currentUser.motoristaId || currentDriver?.id || currentUser.id;
    const driverName = currentDriver?.nome || currentUser.nome;
    const companyId = currentUser.companyId;

    if (driverId && companyId) {
      startDriverGpsTracking(driverId, driverName, companyId, selectedDelivery?.id);
    }

    return () => {
      stopDriverGpsTracking();
    };
  }, [currentUser, currentDriver, selectedDelivery]);

  // Filter ONLY active deliveries assigned to the driver (excludes completed 'entregue', 'cancelada', 'nao_entregue')
  const driverDeliveries = useMemo(() => {
    if (!currentUser || !currentUser.id) return [];

    const activeDriverId = currentUser.motoristaId || currentDriver?.id;
    const activeDriverName = currentDriver?.nome || currentUser.nome;

    return deliveries.filter(d => {
      const isAssigned = 
        (d.entregadorId && d.entregadorId === currentUser.id) || 
        (activeDriverId && d.motoristaId && d.motoristaId === activeDriverId) ||
        (d.entregadorNome && activeDriverName && d.entregadorNome.toLowerCase() === activeDriverName.toLowerCase());
      
      // SPRINT 18 RULE: Only active deliveries appear in "Minhas Entregas"!
      // Completed, canceled, or failed deliveries automatically disappear.
      const isActive = d.status !== 'entregue' && d.status !== 'cancelada' && d.status !== 'nao_entregue';
      
      if (!isAssigned || !isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQ = 
          (d.numeroNF || '').toLowerCase().includes(q) ||
          (d.cliente?.nome || '').toLowerCase().includes(q) ||
          (d.endereco?.ruaNumero || '').toLowerCase().includes(q) ||
          (d.endereco?.bairro || '').toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      return true;
    }).sort((a, b) => {
      // 'em_rota' stays at top
      if (a.status === 'em_rota' && b.status !== 'em_rota') return -1;
      if (b.status === 'em_rota' && a.status !== 'em_rota') return 1;
      
      if (a.ordemRota !== undefined && b.ordemRota !== undefined) {
        return a.ordemRota - b.ordemRota;
      }
      return 0;
    });
  }, [deliveries, currentUser, currentDriver, searchQuery]);

  const formatCurrency = (val?: number | null) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSelectDelivery = (delivery: Entrega) => {
    setSelectedDelivery(delivery);
    setCurrentScreen('detail');
  };

  // 1. ACTION: INICIAR ROTA
  const handleStartDelivery = (delivery?: Entrega, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = delivery || selectedDelivery;
    if (!target || !currentDriver) return;

    const nowIso = new Date().toISOString();

    const historyItem: HistoricoStatus = {
      id: 'h_' + Date.now(),
      statusAnterior: target.status,
      statusNovo: 'em_rota',
      alteradoPor: currentDriver.nome,
      alteradoEm: nowIso,
      motivo: `Rota de entrega iniciada pelo entregador ${currentDriver.nome}.`
    };

    const updates: Partial<Entrega> = {
      status: 'em_rota',
      iniciadoEm: nowIso,
      atualizadoEm: nowIso,
      historico: [...(target.historico || []), historyItem]
    };

    onUpdateDelivery(target.id, updates);

    if (selectedDelivery && selectedDelivery.id === target.id) {
      setSelectedDelivery(prev => prev ? { ...prev, ...updates } : null);
    }
    
    if (!isOnline) {
      setPendingSyncCount(prev => prev + 1);
    }
  };

  // 2. ACTION: OPEN IN GOOGLE MAPS
  const handleOpenNavigation = () => {
    if (!selectedDelivery) return;
    const addr = selectedDelivery.endereco;
    const destination = `${addr.ruaNumero}, ${addr.numero || ''}, ${addr.bairro}, ${addr.cidade}, ${addr.cep}`;
    
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(mapsUrl, '_blank');
  };

  // 3. ACTION: INITIATE SINGLE-SCREEN PROOF MODAL
  const handleInitiateProof = (delivery?: Entrega, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = delivery || selectedDelivery;
    if (!target) return;

    setSelectedDelivery(target);
    setRecebedorNome(target.cliente.nome || '');
    setDocumentoRecebedor(target.cliente.documento || '');
    setObservacaoEntrega('');
    setSignatureDataUrl(null);
    setPhotoDataUrl(null);
    setGpsCoordinates(null);
    setCurrentScreen('confirm');
    
    // Auto Capture GPS Geolocation
    setIsCapturingGPS(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsCapturingGPS(false);
        },
        (error) => {
          console.warn('Geolocation failed, fallback to delivery coordinates:', error);
          setGpsCoordinates({
            lat: target.endereco.latitude + 0.0001,
            lng: target.endereco.longitude - 0.0001
          });
          setIsCapturingGPS(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsCoordinates({
        lat: target.endereco.latitude || -23.55,
        lng: target.endereco.longitude || -46.63
      });
      setIsCapturingGPS(false);
    }
  };

  // 4. ACTION: CONFIRM DELIVERED WITH ALL 7 REQUIRED PROOF FIELDS AT ONCE
  const handleConfirmDelivered = () => {
    if (!selectedDelivery || !currentDriver) return;
    if (!recebedorNome.trim()) {
      alert('Por favor informe o nome de quem recebeu a mercadoria!');
      return;
    }
    if (!signatureDataUrl) {
      alert('Por favor solicite a assinatura do cliente!');
      return;
    }

    const finalLat = gpsCoordinates?.lat || selectedDelivery.endereco.latitude + 0.00015;
    const finalLng = gpsCoordinates?.lng || selectedDelivery.endereco.longitude - 0.00012;
    const nowIso = new Date().toISOString();

    const comprovante: ComprovanteInfo = {
      assinaturaUrl: signatureDataUrl,
      fotoProdutoUrl: photoDataUrl || undefined,
      dataHoraEntrega: nowIso,
      latitudeEntrega: finalLat,
      longitudeEntrega: finalLng,
      recebedorNome: recebedorNome.trim(),
      documentoRecebedor: documentoRecebedor.trim() || undefined,
      observacaoEntrega: observacaoEntrega.trim() || undefined,
      entregadorNome: currentDriver.nome
    };

    const historyItem: HistoricoStatus = {
      id: 'h_' + Date.now(),
      statusAnterior: selectedDelivery.status,
      statusNovo: 'entregue',
      alteradoPor: currentDriver.nome,
      alteradoEm: nowIso,
      motivo: `Entrega finalizada por ${currentDriver.nome}. Recebedor: ${recebedorNome.trim()}${documentoRecebedor.trim() ? ' (Doc: ' + documentoRecebedor.trim() + ')' : ''}. Assinatura, Foto e GPS registrados.`
    };

    const updates: Partial<Entrega> = {
      status: 'entregue',
      statusPagamento: 'pago', // Automatically marked as paid once successfully delivered
      comprovante,
      atualizadoEm: nowIso,
      historico: [...(selectedDelivery.historico || []), historyItem]
    };

    // Database persistence before UI state update
    onUpdateDelivery(selectedDelivery.id, updates);
    
    if (!isOnline) {
      setPendingSyncCount(prev => prev + 1);
    }

    // Reset inputs and return to list. The delivery will automatically disappear from driver view!
    setRecebedorNome('');
    setDocumentoRecebedor('');
    setObservacaoEntrega('');
    setSignatureDataUrl(null);
    setPhotoDataUrl(null);
    setSelectedDelivery(null);
    setCurrentScreen('list');
  };

  // 5. ACTION: RECORD FAIL ATTEMPT
  const handleConfirmFailed = () => {
    if (!selectedDelivery || !currentDriver) return;

    const nowIso = new Date().toISOString();

    const historyItem: HistoricoStatus = {
      id: 'h_' + Date.now(),
      statusAnterior: selectedDelivery.status,
      statusNovo: 'nao_entregue',
      alteradoPor: currentDriver.nome,
      alteradoEm: nowIso,
      motivo: `${failReason} - ${failDetails}`
    };

    const updates: Partial<Entrega> = {
      status: 'nao_entregue',
      motivoNaoEntregue: `${failReason}${failDetails ? ': ' + failDetails : ''}`,
      atualizadoEm: nowIso,
      historico: [...(selectedDelivery.historico || []), historyItem]
    };

    onUpdateDelivery(selectedDelivery.id, updates);

    if (!isOnline) {
      setPendingSyncCount(prev => prev + 1);
    }

    // Reset failure state
    setFailReason('Cliente ausente');
    setFailDetails('');
    setSelectedDelivery(null);
    setCurrentScreen('list');
  };

  // Handle Sync simulation
  const handleOfflineSync = () => {
    setIsOnline(true);
    setPendingSyncCount(0);
  };

  if (!currentDriver) {
    const isDriverRole = currentUser.role === 'entregador' || currentUser.role === 'driver' || currentUser.role === 'motorista';
    if (!isDriverRole) {
      return (
        <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-200/80 text-center flex flex-col items-center gap-4 max-w-sm w-full shadow-xl">
            <Shield className="w-10 h-10 text-amber-500" />
            <div>
              <h1 className="font-bold text-base text-slate-900">Redirecionando...</h1>
              <p className="text-xs text-slate-500 mt-1">Seu perfil ({currentUser.role}) possui acesso administrativo.</p>
            </div>
            <button
              onClick={onLogout}
              className="w-full py-3 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors shadow-xs min-h-[48px]"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 max-w-sm w-full p-6 text-center flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-amber-50 rounded-full border border-amber-100 text-amber-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="font-bold text-lg text-slate-900 mt-1">Vínculo não Configurado</h1>
            <p className="text-xs text-slate-600 leading-normal">
              Sua conta de usuário ({currentUser.nome}) está registrada como Perfil Motorista, porém o Administrador ainda não vinculou seu usuário a um Cadastro Físico de Entregador.
            </p>
            <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 font-semibold mt-1">
              Peça ao Administrador para vincular seu E-mail a um Entregador ativo na aba "Usuários".
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors min-h-[48px]"
          >
            Sair e Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col max-w-md mx-auto relative shadow-xl border-x border-slate-200/80" id="driver-app-frame">
      
      {/* Top Header Strip - Corporate Blue */}
      <div className="bg-[#132238] p-3.5 border-b border-slate-800 sticky top-0 z-40 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <BrandLogo size={36} className="w-[36px] h-[36px] object-contain shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white truncate max-w-[140px]">{currentDriver.nome}</h2>
            {currentDriver.veiculoTipo ? (
              <p className="text-[10px] text-amber-400 truncate max-w-[140px] font-mono font-semibold">
                {currentDriver.veiculoModelo} • {currentDriver.veiculoPlaca || 'SEM PLACA'}
              </p>
            ) : (
              <p className="text-[10px] text-slate-300 font-semibold uppercase">Frota Alugada / Pedestre</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Network Toggle */}
          <button 
            type="button"
            onClick={() => {
              if (isOnline) {
                setIsOnline(false);
              } else {
                handleOfflineSync();
              }
            }}
            className={`p-1.5 rounded-xl border flex items-center gap-1 text-[10px] font-bold transition-all ${isOnline ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'}`}
            title="Clique para alternar conexão"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                <span>OFFLINE ({pendingSyncCount})</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SPRINT 18: TELA ÚNICA - MINHAS ENTREGAS */}
      {currentScreen === 'list' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
          
          {/* Offline Warning banner */}
          {!isOnline && (
            <div className="mb-4 p-3.5 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 text-xs flex flex-col gap-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                Modo Offline Ativo
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Suas entregas serão salvas no celular e reenviadas automaticamente ao conectar.
              </p>
              {pendingSyncCount > 0 && (
                <button
                  onClick={handleOfflineSync}
                  className="mt-1 self-start px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg font-extrabold text-[10px] flex items-center gap-1 shadow-xs hover:bg-amber-400 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Sincronizar {pendingSyncCount} item(ns)
                </button>
              )}
            </div>
          )}

          {/* Header Card - Minhas Entregas (White Card, Official Design System) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Minhas Entregas
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Entregas ativas em andamento para hoje
                </p>
              </div>
            </div>

            <div className="bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1 rounded-full font-black text-xs font-mono shadow-2xs">
              {driverDeliveries.length} ativas
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por NF, Cliente, Endereço..."
              className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* List of Active Deliveries */}
          {driverDeliveries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3 my-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                <Truck className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Nenhuma entrega pendente
              </h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
                Você não possui entregas ativas no momento. Quando o operador atribuir novas entregas, elas aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {driverDeliveries.map((delivery) => {
                const isCollectOnDelivery = delivery.statusPagamento === 'receber_na_entrega';
                const isEmRota = delivery.status === 'em_rota';
                
                return (
                  <div
                    key={delivery.id}
                    onClick={() => handleSelectDelivery(delivery)}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 cursor-pointer ${
                      isEmRota 
                        ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-400/30 shadow-md' 
                        : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: NF + Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        NF: {delivery.numeroNF}
                      </span>

                      {/* Status Badges */}
                      {isEmRota ? (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1.5 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                          🔵 Em Rota
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-purple-600" />
                          🟣 Aguardando
                        </span>
                      )}
                    </div>

                    {/* Client & Address Info */}
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{delivery.cliente.nome}</h4>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {delivery.endereco.ruaNumero}, Nº {delivery.endereco.numero} — {delivery.endereco.bairro}
                      </p>
                    </div>

                    {/* Payment Alert & Action Button Row */}
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 mt-0.5 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-slate-600 font-semibold text-xs">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>{delivery.volumes} vol</span>
                        </div>

                        {isCollectOnDelivery ? (
                          <span className="bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-2xs">
                            COBRAR: {formatCurrency(delivery.valorVenda)}
                          </span>
                        ) : (
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                            PAGO
                          </span>
                        )}
                      </div>

                      {/* Direct In-Card Action Buttons */}
                      {!isEmRota ? (
                        <button
                          onClick={(e) => handleStartDelivery(delivery, e)}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[40px]"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Iniciar Rota
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleInitiateProof(delivery, e)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[40px]"
                        >
                          <Check className="w-4 h-4" />
                          Finalizar Entrega
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SCREEN 2: DELIVERY DETAILS */}
      {currentScreen === 'detail' && selectedDelivery && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header row */}
          <div className="bg-white p-3.5 border-b border-slate-200/80 flex items-center justify-between sticky top-[57px] z-10 shadow-xs">
            <button 
              onClick={() => setCurrentScreen('list')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              ← Voltar às Entregas
            </button>
            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">NF: {selectedDelivery.numeroNF}</span>
          </div>

          <div className="p-4 flex flex-col gap-4 flex-1">
            
            {/* Destinatário */}
            <div className="flex justify-between items-start gap-2 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">CLIENTE DESTINATÁRIO</span>
                <h3 className="font-bold text-base text-slate-900 mt-0.5 truncate">{selectedDelivery.cliente.nome}</h3>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-semibold">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {selectedDelivery.cliente.telefone}
                </p>
              </div>

              <a
                href={`tel:${selectedDelivery.cliente.telefone}`}
                className="p-3 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-full shadow-xs transition-colors shrink-0"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>

            {/* Endereço & Map Button */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">LOCAL DA ENTREGA</span>
                <p className="text-sm font-bold text-slate-900">{selectedDelivery.endereco.ruaNumero}, Nº {selectedDelivery.endereco.numero}</p>
                <p className="text-xs text-slate-600 mt-0.5">{selectedDelivery.endereco.bairro} — {selectedDelivery.endereco.cidade}</p>
                <p className="text-[10px] text-slate-500 font-semibold font-mono mt-1">CEP: {selectedDelivery.endereco.cep}</p>
              </div>

              {selectedDelivery.endereco.complemento && (
                <div className="bg-amber-50/80 p-3 rounded-xl text-xs text-amber-900 font-medium leading-relaxed border border-amber-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Complemento da Entrega:</span>
                  {selectedDelivery.endereco.complemento}
                </div>
              )}

              <button
                onClick={handleOpenNavigation}
                className="w-full mt-1 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs py-3 rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-colors shadow-xs min-h-[48px]"
              >
                <Navigation className="w-4 h-4 text-amber-400" />
                Abrir Rota no Google Maps
              </button>
            </div>

            {/* Volumes & Financial Box */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
              <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">CONTEÚDO E PAGAMENTO</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[9px] text-slate-400 block font-bold">VOLUMES</span>
                  <span className="text-sm font-bold text-slate-800">{selectedDelivery.volumes} caixa(s)</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[9px] text-slate-400 block font-bold">VALOR DO PEDIDO</span>
                  <span className="text-sm font-bold text-amber-700">{formatCurrency(selectedDelivery.valorVenda)}</span>
                </div>
              </div>

              {/* Payment notification bar */}
              {selectedDelivery.statusPagamento === 'receber_na_entrega' ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-bold flex flex-col gap-1 text-center">
                  <span>⚠️ RECEBER O VALOR NA ENTREGA!</span>
                  <span className="text-[10px] text-slate-600 font-medium font-mono uppercase">
                    Cobrar via: {selectedDelivery.formaPagamento === 'cartao_credito' ? 'Cartão de Crédito' : selectedDelivery.formaPagamento === 'cartao_debito' ? 'Cartão de Débito' : selectedDelivery.formaPagamento.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold text-center">
                  ✅ PEDIDO PAGO NA LOJA — APENAS ENTREGAR!
                </div>
              )}
            </div>

            {/* Operator Notes */}
            {selectedDelivery.observacoes && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mb-1">OBSERVAÇÕES DO OPERADOR</span>
                <p className="text-xs text-slate-700 italic leading-relaxed">"{selectedDelivery.observacoes}"</p>
              </div>
            )}

          </div>

          {/* Bottom Action Sheet */}
          <div className="bg-white p-4 border-t border-slate-200/80 sticky bottom-0 shadow-lg">
            {selectedDelivery.status !== 'em_rota' ? (
              <button
                onClick={() => handleStartDelivery()}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Truck className="w-5 h-5" />
                Iniciar Rota de Entrega
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleInitiateProof()}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5 min-h-[48px]"
                >
                  <Check className="w-5 h-5 stroke-[3px]" />
                  Finalizar Entrega
                </button>
                
                <button
                  onClick={() => setCurrentScreen('fail')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <X className="w-4 h-4 text-rose-600" />
                  Não foi possível entregar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SPRINT 18 REQUIREMENT: SINGLE-SCREEN FINALIZATION MODAL (ALL 7 FIELDS ON ONE SCREEN) */}
      {currentScreen === 'confirm' && selectedDelivery && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="bg-white p-3.5 border-b border-slate-200/80 flex items-center justify-between sticky top-[57px] z-10 shadow-xs">
            <button 
              onClick={() => setCurrentScreen('detail')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
            <span className="font-bold text-xs tracking-wide text-emerald-800 uppercase">Finalizar Cadastro de Entrega</span>
          </div>

          <div className="p-4 flex flex-col gap-4">
            
            {/* 1. AUTO GPS Coordinates Badge */}
            <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Registro GPS de Satélite</span>
                {isCapturingGPS ? (
                  <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 mt-0.5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Obtendo coordenadas de satélite...
                  </span>
                ) : gpsCoordinates ? (
                  <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Lat: {gpsCoordinates.lat.toFixed(5)}, Lng: {gpsCoordinates.lng.toFixed(5)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPinOff className="w-3.5 h-3.5" /> GPS Registrado
                  </span>
                )}
              </div>
              <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-bold font-mono border border-slate-200">
                AUTOMÁTICO
              </span>
            </div>

            {/* 2. AUTO Date / Time Display */}
            <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Data & Hora do Encerramento</span>
                <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-bold font-mono border border-slate-200">
                AUTOMÁTICO
              </span>
            </div>

            {/* 3. Receiver Name (Mandatory) */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Nome de quem recebeu <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                value={recebedorNome}
                onChange={(e) => setRecebedorNome(e.target.value)}
                placeholder="Nome completo do recebedor..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-semibold h-11"
                required
              />
            </div>

            {/* 4. Signature Pad (Mandatory) */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
              <SignaturePad 
                onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
                onClear={() => setSignatureDataUrl(null)}
              />
            </div>

            {/* 7. Observations */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-800">
                <span>Observação da entrega (Opcional)</span>
              </label>
              <textarea
                value={observacaoEntrega}
                onChange={(e) => setObservacaoEntrega(e.target.value)}
                placeholder="Ex: Deixado com a portaria, entregue no apartamento 102..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white h-20"
              />
            </div>

          </div>

          {/* Submit Action Button */}
          <div className="bg-white p-4 border-t border-slate-200/80 sticky bottom-0 mt-auto z-10 shadow-lg">
            <button
              onClick={handleConfirmDelivered}
              disabled={!signatureDataUrl || !recebedorNome.trim()}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[48px]"
            >
              <FileCheck className="w-5 h-5" />
              Finalizar e Confirmar Entrega
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 4: DELIVERY FAILURE ENTRY */}
      {currentScreen === 'fail' && selectedDelivery && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="bg-white p-3.5 border-b border-slate-200/80 flex items-center justify-between sticky top-[57px] z-10 shadow-xs">
            <button 
              onClick={() => setCurrentScreen('detail')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
            <span className="font-bold text-xs tracking-wide text-rose-700 uppercase">Falha na entrega</span>
          </div>

          <div className="p-4 flex flex-col gap-4">
            
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center flex flex-col items-center gap-1.5 shadow-xs">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
              <h3 className="font-semibold text-sm text-rose-800">Não foi possível realizar a entrega?</h3>
              <p className="text-xs text-slate-600">Selecione o motivo correto para documentar o ocorrido na auditoria do operador.</p>
            </div>

            {/* Motive selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Motivo Principal</label>
              <div className="flex flex-col gap-2">
                {[
                  'Cliente ausente',
                  'Endereço não encontrado',
                  'Cliente recusou o produto',
                  'Estabelecimento fechado',
                  'Outro (Especificar)'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFailReason(reason)}
                    className={`p-3 text-left rounded-xl text-xs font-bold border transition-all ${failReason === reason ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Text comments */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observações / Detalhes adicionais</label>
              <textarea
                value={failDetails}
                onChange={(e) => setFailDetails(e.target.value)}
                placeholder="Ex: Vizinho informou que o cliente viajou..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white h-24"
              />
            </div>

          </div>

          {/* Footer Save */}
          <div className="bg-white p-4 border-t border-slate-200/80 mt-auto shadow-lg">
            <button
              onClick={handleConfirmFailed}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm min-h-[48px]"
            >
              Confirmar Ocorrência de Falha
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
