/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Truck, MapPin, Phone, Clock, DollarSign, Package, Check, X, Navigation, 
  ChevronRight, Camera, FileText, AlertTriangle, RefreshCw, Smartphone, 
  MapPinOff, Wifi, WifiOff, LogOut, FileCheck, HelpCircle
} from 'lucide-react';
import { Entrega, Motorista, Veiculo, Usuario, EntregaStatus, ComprovanteInfo, HistoricoStatus } from '../types';
import SignaturePad from './SignaturePad';
import CameraCapture from './CameraCapture';

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

  // Delivery confirmation inputs (Signature & Photo)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Delivery failure inputs
  const [failReason, setFailReason] = useState<string>('Cliente ausente');
  const [failDetails, setFailDetails] = useState<string>('');

  // Simulated Offline State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Resolve the active driver physical row using currentUser's motoristaId link
  const currentDriver = drivers.find(d => d.id === currentUser.motoristaId);

  // Log active logged-in driver user information on mount and session updates
  React.useEffect(() => {
    if (currentUser) {
      console.log("=== USUÁRIO LOGADO ===");
      console.log("currentUser.id:", currentUser.id);
      console.log("currentUser.nome:", currentUser.nome);
      console.log("empresaId:", currentUser.companyId);
      console.log("perfil:", currentUser.role);
      console.log("======================");
    }
  }, [currentUser]);

  // Filter deliveries assigned to the active driver that are ready for driver or processed
  const driverDeliveries = React.useMemo(() => {
    if (!currentUser.id) return [];

    console.log("=== ANTES DE FILTRAR AS ENTREGAS ===");
    console.log("Todas as entregas encontradas:", deliveries);
    console.log("====================================");

    console.log("=== DURANTE O FILTRO ===");
    const filtered = deliveries.filter(d => {
      const isAssigned = d.entregadorId === currentUser.id;
      const isValidStatus = (d.status === 'aguardando_motorista' || d.status === 'em_rota' || d.status === 'entregue' || d.status === 'nao_entregue');
      const isMatch = isAssigned && isValidStatus;
      
      console.log(`Entrega NF: ${d.numeroNF} (ID: ${d.id})`);
      console.log(`  entregadorId = ${d.entregadorId || 'undefined'}`);
      console.log(`  currentUser.id = ${currentUser.id}`);
      console.log(`  status = ${d.status}`);
      console.log(`  Resultado = ${isMatch ? 'TRUE' : 'FALSE'}`);
      
      return isMatch;
    });
    console.log("========================");

    return filtered.sort((a, b) => {
      // Active "em_rota" always at the top
      if (a.status === 'em_rota' && b.status !== 'em_rota') return -1;
      if (b.status === 'em_rota' && a.status !== 'em_rota') return 1;
      
      // Then remaining "aguardando_motorista"
      if (a.status === 'aguardando_motorista' && b.status !== 'aguardando_motorista') return -1;
      if (b.status === 'aguardando_motorista' && a.status !== 'aguardando_motorista') return 1;

      // Then by order index if exists
      if (a.ordemRota !== undefined && b.ordemRota !== undefined) {
        return a.ordemRota - b.ordemRota;
      }
      return 0;
    });
  }, [deliveries, currentUser.motoristaId]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSelectDelivery = (delivery: Entrega) => {
    setSelectedDelivery(delivery);
    setCurrentScreen('detail');
  };

  // 1. ACTION: INICIAR ENTREGA (B3)
  const handleStartDelivery = () => {
    if (!selectedDelivery || !currentDriver) return;

    const historyItem: HistoricoStatus = {
      id: 'h_' + Date.now(),
      statusAnterior: selectedDelivery.status,
      statusNovo: 'em_rota',
      alteradoPor: currentDriver.nome,
      alteradoEm: new Date().toISOString()
    };

    const updates: Partial<Entrega> = {
      status: 'em_rota',
      iniciadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      historico: [...(selectedDelivery.historico || []), historyItem]
    };

    onUpdateDelivery(selectedDelivery.id, updates);
    setSelectedDelivery(prev => prev ? { ...prev, ...updates } : null);
    
    // Simulate connection update
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

  // 3. ACTION: INITIATE PROOF SCREEN (B5)
  const handleInitiateProof = () => {
    setSignatureDataUrl(null);
    setPhotoDataUrl(null);
    setGpsCoordinates(null);
    setCurrentScreen('confirm');
    
    // Capture GPS Geolocation
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
          console.warn('Geolocation failed, falling back to mock coordinates:', error);
          setTimeout(() => {
            if (selectedDelivery) {
              setGpsCoordinates({
                lat: selectedDelivery.endereco.latitude + 0.0001,
                lng: selectedDelivery.endereco.longitude - 0.0001
              });
            }
            setIsCapturingGPS(false);
          }, 800);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsCoordinates({
        lat: selectedDelivery?.endereco.latitude || -23.55,
        lng: selectedDelivery?.endereco.longitude || -46.63
      });
      setIsCapturingGPS(false);
    }
  };

  // 4. ACTION: CONFIRM DELIVERED WITH SIGNATURE, PHOTO & GPS
  const handleConfirmDelivered = () => {
    if (!selectedDelivery || !currentDriver) return;
    if (!signatureDataUrl) {
      alert('Por favor solicite a assinatura do cliente!');
      return;
    }

    const finalLat = gpsCoordinates?.lat || selectedDelivery.endereco.latitude + 0.00015;
    const finalLng = gpsCoordinates?.lng || selectedDelivery.endereco.longitude - 0.00012;

    const comprovante: ComprovanteInfo = {
      assinaturaUrl: signatureDataUrl,
      fotoProdutoUrl: photoDataUrl || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400', // Default mock parcel if they didn't take a photo
      dataHoraEntrega: new Date().toISOString(),
      latitudeEntrega: finalLat,
      longitudeEntrega: finalLng,
      entregadorNome: currentDriver.nome
    };

    const historyItem: HistoricoStatus = {
      id: 'h_' + Date.now(),
      statusAnterior: selectedDelivery.status,
      statusNovo: 'entregue',
      alteradoPor: currentDriver.nome,
      alteradoEm: new Date().toISOString()
    };

    const updates: Partial<Entrega> = {
      status: 'entregue',
      statusPagamento: 'pago', // Automatically marked as paid once successfully delivered
      comprovante,
      atualizadoEm: new Date().toISOString(),
      historico: [...(selectedDelivery.historico || []), historyItem]
    };

    onUpdateDelivery(selectedDelivery.id, updates);
    
    if (!isOnline) {
      setPendingSyncCount(prev => prev + 1);
    }

    // Go back to deliveries list
    setSelectedDelivery(null);
    setCurrentScreen('list');
  };

  // 5. ACTION: RECORD FAIL ATTEMPT (B6)
  const handleConfirmFailed = () => {
    if (!selectedDelivery || !currentDriver) return;

    const historyItem: HistoricoStatus = {
      id: 'h_' + Date.now(),
      statusAnterior: selectedDelivery.status,
      statusNovo: 'nao_entregue',
      alteradoPor: currentDriver.nome,
      alteradoEm: new Date().toISOString(),
      motivo: `${failReason} - ${failDetails}`
    };

    const updates: Partial<Entrega> = {
      status: 'nao_entregue',
      motivoNaoEntregue: `${failReason}${failDetails ? ': ' + failDetails : ''}`,
      atualizadoEm: new Date().toISOString(),
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
    return (
      <div className="bg-slate-900 min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <h1 className="font-display font-bold text-lg text-slate-900 mt-2">Vínculo não Configurado</h1>
            <p className="text-xs text-slate-500 leading-normal">
              Sua conta de usuário ({currentUser.nome}) está registrada como Perfil Motorista, porém o Administrador ainda não vinculou seu usuário a um Cadastro Físico de Entregador.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 font-semibold mt-1">
              Peça ao Administrador para vincular seu E-mail a um Entregador ativo na aba "Usuários".
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl"
          >
            Sair e Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-900 text-slate-100 flex flex-col max-w-md mx-auto relative shadow-2xl" id="driver-app-frame">
      
      {/* Top Header Strip (B2 Header) */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-black font-display text-base shadow-xs">
            F
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white truncate max-w-[150px]">{currentDriver.nome}</h2>
            {currentDriver.veiculoTipo ? (
              <p className="text-[10px] text-amber-400 truncate max-w-[150px] font-mono">
                {currentDriver.veiculoModelo} • {currentDriver.veiculoPlaca || 'SEM PLACA'}
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Frota Alugada / Pedestre</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Simulated Network Toggle (Offline testing) */}
          <button 
            type="button"
            onClick={() => {
              if (isOnline) {
                setIsOnline(false);
              } else {
                handleOfflineSync();
              }
            }}
            className={`p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold transition-all ${isOnline ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' : 'bg-amber-950/60 text-amber-400 border-amber-800/80 animate-pulse'}`}
            title="Clique para alternar conexão"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>OFFLINE ({pendingSyncCount})</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Screen Views Routing */}

      {/* SCREEN 1: DELIVERIES LIST (B2) */}
      {currentScreen === 'list' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
          {/* Offline Warning banner if offline */}
          {!isOnline && (
            <div className="mb-4 p-3 bg-amber-950/40 text-amber-400 rounded-xl border border-amber-800 text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                Modo Offline Ativo
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Suas entregas serão salvas no celular. Clique no botão de sync ou no banner para reenviar quando houver conexão.
              </p>
              {pendingSyncCount > 0 && (
                <button
                  onClick={handleOfflineSync}
                  className="mt-1 self-start px-2.5 py-1 bg-amber-400 text-slate-950 rounded-md font-bold text-[10px] flex items-center gap-1 shadow-sm"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Sincronizar {pendingSyncCount} item(ns)
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">SUA ROTA DO DIA ({driverDeliveries.length})</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-semibold font-mono text-slate-300">ENTREGAS</span>
          </div>

          {driverDeliveries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3 my-auto">
              <div className="p-4 bg-slate-800 text-slate-500 rounded-full">
                <Truck className="w-10 h-10" />
              </div>
              <h3 className="font-display font-semibold text-sm text-slate-200">Sem entregas designadas</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">Não há entregas na situação de "Aguardando Motorista" destinadas à sua rota neste momento.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {driverDeliveries.map((delivery) => {
                const isCollectOnDelivery = delivery.statusPagamento === 'receber_na_entrega';
                
                return (
                  <div
                    key={delivery.id}
                    onClick={() => handleSelectDelivery(delivery)}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 cursor-pointer ${
                      delivery.status === 'em_rota' 
                        ? 'bg-blue-950/20 border-blue-600/50 ring-1 ring-blue-500/20' 
                        : delivery.status === 'entregue'
                        ? 'bg-slate-950/30 border-slate-800 opacity-60'
                        : delivery.status === 'nao_entregue'
                        ? 'bg-red-950/10 border-red-900/50'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                        NF: {delivery.numeroNF}
                      </span>

                      {/* Status Indicator Pill */}
                      {delivery.status === 'aguardando_motorista' && (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Aguardando
                        </span>
                      )}
                      {delivery.status === 'em_rota' && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Em Rota
                        </span>
                      )}
                      {delivery.status === 'entregue' && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Entregue
                        </span>
                      )}
                      {delivery.status === 'nao_entregue' && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Não entregue
                        </span>
                      )}
                    </div>

                    {/* Client & Address Info */}
                    <div>
                      <h4 className="font-semibold text-slate-100 text-sm">{delivery.cliente.nome}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {delivery.endereco.ruaNumero}, Nº {delivery.endereco.numero} — {delivery.endereco.bairro}
                      </p>
                    </div>

                    {/* Payment Alert box */}
                    <div className="flex items-center justify-between border-t border-slate-700/60 pt-3 mt-1 text-xs">
                      <div className="flex items-center gap-1 text-slate-400 font-semibold">
                        <Package className="w-3.5 h-3.5" />
                        <span>{delivery.volumes} vol(s)</span>
                      </div>
                      
                      {isCollectOnDelivery ? (
                        <div className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[11px] font-extrabold px-3 py-1 rounded-lg flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>COBRAR: {formatCurrency(delivery.valorVenda)}</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>PAGO NA LOJA</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SCREEN 2: DELIVERY DETAILS (B3) */}
      {currentScreen === 'detail' && selectedDelivery && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header row */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <button 
              onClick={() => setCurrentScreen('list')}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
            >
              ← Voltar à lista
            </button>
            <span className="font-mono text-xs font-bold text-slate-400">NF: {selectedDelivery.numeroNF}</span>
          </div>

          <div className="p-4 flex flex-col gap-4 flex-1">
            
            {/* Destinatário */}
            <div className="flex justify-between items-start gap-2 bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">CLIENTE DESTINATÁRIO</span>
                <h3 className="font-display font-bold text-md text-slate-100 mt-0.5 truncate">{selectedDelivery.cliente.nome}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-semibold">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {selectedDelivery.cliente.telefone}
                </p>
              </div>

              <a
                href={`tel:${selectedDelivery.cliente.telefone}`}
                className="p-3 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-full shadow-md transition-colors shrink-0"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>

            {/* Endereco & Map Button */}
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col gap-3">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">LOCAL DA ENTREGA</span>
                <p className="text-sm font-bold text-slate-100">{selectedDelivery.endereco.ruaNumero}, Nº {selectedDelivery.endereco.numero}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selectedDelivery.endereco.bairro} — {selectedDelivery.endereco.cidade}</p>
                <p className="text-[10px] text-slate-500 font-semibold font-mono mt-1">CEP: {selectedDelivery.endereco.cep}</p>
              </div>

              {selectedDelivery.endereco.complemento && (
                <div className="bg-amber-500/10 p-2.5 rounded-xl text-xs text-amber-400 font-semibold leading-relaxed border border-amber-500/20">
                  <span className="text-[10px] text-slate-400 uppercase font-black block mb-0.5">Complemento da Entrega:</span>
                  {selectedDelivery.endereco.complemento}
                </div>
              )}

              <button
                onClick={handleOpenNavigation}
                className="w-full mt-1 bg-slate-900 text-white hover:bg-slate-950 font-bold text-xs py-3 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Navigation className="w-4 h-4 text-amber-500" />
                Abrir Rota no Google Maps
              </button>
            </div>

            {/* volumes & Financial Box */}
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col gap-3">
              <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">CONTEÚDO E PAGAMENTO</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/60 p-3 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 block font-bold">VOLUMES</span>
                  <span className="text-sm font-bold text-slate-200">{selectedDelivery.volumes} caixa(s)</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 block font-bold">VALOR DO PEDIDO</span>
                  <span className="text-sm font-bold text-amber-400 font-display">{formatCurrency(selectedDelivery.valorVenda)}</span>
                </div>
              </div>

              {/* Payment notification bar */}
              {selectedDelivery.statusPagamento === 'receber_na_entrega' ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 font-bold flex flex-col gap-1 text-center">
                  <span>⚠️ RECEBER O VALOR NA ENTREGA!</span>
                  <span className="text-[10px] text-slate-300 font-medium font-mono uppercase">
                    Cobrar via: {selectedDelivery.formaPagamento === 'cartao_credito' ? 'Cartão de Crédito' : selectedDelivery.formaPagamento === 'cartao_debito' ? 'Cartão de Débito' : selectedDelivery.formaPagamento.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400 font-bold text-center">
                  ✅ PEDIDO PAGO NA LOJA — APENAS ENTREGAR!
                </div>
              )}
            </div>

            {/* Operator Notes */}
            {selectedDelivery.observacoes && (
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mb-1">OBSERVAÇÕES DO CAIXA</span>
                <p className="text-xs text-slate-300 italic leading-relaxed">"{selectedDelivery.observacoes}"</p>
              </div>
            )}

          </div>

          {/* Bottom Action Drawer Sheet (B4) */}
          <div className="bg-slate-950 p-4 border-t border-slate-800 sticky bottom-0">
            {selectedDelivery.status === 'aguardando_motorista' && (
              <button
                onClick={handleStartDelivery}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
                id="btn-start-delivery"
              >
                <Truck className="w-5 h-5" />
                Iniciar Rota / Saída da Loja
              </button>
            )}

            {selectedDelivery.status === 'em_rota' && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleInitiateProof}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5"
                  id="btn-mark-delivered"
                >
                  <Check className="w-5 h-5 stroke-[3px]" />
                  Marcar como Entregue
                </button>
                
                <button
                  onClick={() => setCurrentScreen('fail')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4 text-red-500" />
                  Não foi possível entregar
                </button>
              </div>
            )}

            {(selectedDelivery.status === 'entregue' || selectedDelivery.status === 'nao_entregue' || selectedDelivery.status === 'cancelada') && (
              <div className="text-center p-3 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                Esta entrega já foi processada anteriormente. Status atual: <span className="font-bold uppercase text-slate-200">{selectedDelivery.status.replace('_', ' ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 3: PROOF SIGNATURE AND PHOTO CONFIRMATION (B5) */}
      {currentScreen === 'confirm' && selectedDelivery && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <button 
              onClick={() => setCurrentScreen('detail')}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <span className="font-display font-bold text-xs tracking-wide text-emerald-400 uppercase">Comprovação Eletrônica</span>
          </div>

          <div className="p-4 flex flex-col gap-5">
            
            {/* Geolocation indicator */}
            <div className="bg-slate-800 border border-slate-700 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Registro GPS de Entrega</span>
                {isCapturingGPS ? (
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 mt-0.5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Obtendo coordenadas de satélite...
                  </span>
                ) : gpsCoordinates ? (
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Lat: {gpsCoordinates.lat.toFixed(5)}, Lng: {gpsCoordinates.lng.toFixed(5)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-red-400 flex items-center gap-1 mt-0.5">
                    <MapPinOff className="w-3.5 h-3.5" /> GPS Indisponível (Mock Ativo)
                  </span>
                )}
              </div>
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-md text-slate-500 font-bold font-mono">AUTOMÁTICO</span>
            </div>

            {/* Signature Pad */}
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl">
              <SignaturePad 
                onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
                onClear={() => setSignatureDataUrl(null)}
              />
            </div>

            {/* Photo Capture */}
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl">
              <CameraCapture 
                label="Foto de comprovação (Produto entregue ou Fachada)"
                onCapture={(dataUrl) => setPhotoDataUrl(dataUrl)}
                savedImage={photoDataUrl || undefined}
                onClear={() => setPhotoDataUrl(null)}
              />
            </div>

          </div>

          {/* Footer Submit */}
          <div className="bg-slate-950 p-4 border-t border-slate-800 sticky bottom-0 mt-auto">
            <button
              onClick={handleConfirmDelivered}
              disabled={!signatureDataUrl}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              id="btn-confirm-delivery-submit"
            >
              <FileCheck className="w-5 h-5" />
              Finalizar e Confirmar Entrega
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 4: DELIVERY FAILURE ENTRY (B6) */}
      {currentScreen === 'fail' && selectedDelivery && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <button 
              onClick={() => setCurrentScreen('detail')}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <span className="font-display font-bold text-xs tracking-wide text-red-400 uppercase">Falha na entrega</span>
          </div>

          <div className="p-4 flex flex-col gap-4">
            
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-center flex flex-col items-center gap-1.5">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <h3 className="font-semibold text-sm text-red-400">Não foi possível realizar a entrega?</h3>
              <p className="text-xs text-slate-400">Selecione o motivo correto para documentar o ocorrido na auditoria do operador.</p>
            </div>

            {/* Motive selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motivo Principal</label>
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
                    className={`p-3 text-left rounded-xl text-xs font-bold border transition-all ${failReason === reason ? 'bg-red-500/10 text-red-400 border-red-500/50' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/50'}`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Text comments */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações / Detalhes adicionais</label>
              <textarea
                value={failDetails}
                onChange={(e) => setFailDetails(e.target.value)}
                placeholder="Ex: Vizinho informou que o cliente viajou. Tentei ligar mas deu caixa postal..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-red-500 h-24"
              />
            </div>

          </div>

          {/* Footer Save */}
          <div className="bg-slate-950 p-4 border-t border-slate-800 mt-auto">
            <button
              onClick={handleConfirmFailed}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md"
            >
              Confirmar Ocorrência de Falha
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
