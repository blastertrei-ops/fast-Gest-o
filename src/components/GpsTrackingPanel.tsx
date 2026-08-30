import React, { useState, useEffect } from 'react';
import { 
  Navigation, MapPin, Gauge, Clock, RefreshCw, Search, 
  User, Truck, Route, ArrowRight, ExternalLink, Focus, Wifi, WifiOff, AlertTriangle, Users, Radio, Activity, LocateFixed
} from 'lucide-react';
import { DriverLocationState, DeliveryRouteHistory, Entrega, Motorista } from '../types';
import { Database } from '../lib/db';
import { calculateDistanceKm, calculateEta } from '../lib/gpsTracker';
import GpsRouteMap from './GpsRouteMap';
import LiveDriversMap from './LiveDriversMap';

interface GpsTrackingPanelProps {
  companyId: string;
  deliveries: Entrega[];
  drivers: Motorista[];
  initialSelectedDeliveryId?: string | null;
}

export default function GpsTrackingPanel({ 
  companyId, 
  deliveries, 
  drivers, 
  initialSelectedDeliveryId 
}: GpsTrackingPanelProps) {
  const [driverLocations, setDriverLocations] = useState<DriverLocationState[]>([]);
  const [selectedDeliveryRoute, setSelectedDeliveryRoute] = useState<DeliveryRouteHistory | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Entrega | null>(null);
  const [focusedDriverId, setFocusedDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fleetFilter, setFleetFilter] = useState<'all' | 'online' | 'route' | 'offline'>('all');

  const loadLocations = async () => {
    setLoading(true);
    const data = await Database.getDriverGpsLocations(companyId);
    setDriverLocations(data as DriverLocationState[]);
    setLoading(false);
  };

  useEffect(() => {
    loadLocations();
    const interval = setInterval(loadLocations, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [companyId]);

  // Focus on initial delivery if passed
  useEffect(() => {
    if (initialSelectedDeliveryId) {
      const targetDel = deliveries.find(d => d.id === initialSelectedDeliveryId);
      if (targetDel) {
        setSelectedDelivery(targetDel);
        if (targetDel.motoristaId) {
          setFocusedDriverId(targetDel.motoristaId);
        }
        viewRouteHistory(targetDel);
      }
    }
  }, [initialSelectedDeliveryId, deliveries]);

  const viewRouteHistory = async (delivery: Entrega) => {
    setSelectedDelivery(delivery);
    setLoading(true);
    const history = await Database.getDeliveryRouteHistory(delivery.id);
    setSelectedDeliveryRoute(history as DeliveryRouteHistory);
    setLoading(false);
  };

  const getDriverSignalStatus = (loc: DriverLocationState) => {
    if (!loc.lastUpdated) return { label: 'Offline', color: 'text-slate-400 bg-slate-800 border-slate-700', icon: WifiOff };
    
    const diffMs = Date.now() - new Date(loc.lastUpdated).getTime();
    const diffMin = diffMs / (1000 * 60);

    if (diffMin < 3 && loc.isOnline !== false) {
      return { label: 'Online', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800', icon: Wifi };
    } else if (diffMin < 10) {
      return { label: 'Sem Sinal', color: 'text-amber-400 bg-amber-950/80 border-amber-800', icon: AlertTriangle };
    } else {
      return { label: 'Offline', color: 'text-slate-400 bg-slate-800 border-slate-700', icon: WifiOff };
    }
  };

  const openGoogleMapsRoute = (loc: DriverLocationState, delivery?: Entrega) => {
    const origin = `${loc.latitude},${loc.longitude}`;
    let destination = '';
    if (delivery?.endereco) {
      if (delivery.endereco.latitude && delivery.endereco.longitude) {
        destination = `${delivery.endereco.latitude},${delivery.endereco.longitude}`;
      } else {
        destination = encodeURIComponent(`${delivery.endereco.ruaNumero}, ${delivery.endereco.bairro}, ${delivery.endereco.cidade}`);
      }
    } else if (loc.address) {
      destination = encodeURIComponent(loc.address);
    }

    const url = destination 
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
      : `https://www.google.com/maps/search/?api=1&query=${origin}`;
    
    window.open(url, '_blank');
  };

  const filteredLocations = driverLocations.filter(loc =>
    loc.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const visibleLocations = filteredLocations.filter(location => {
    const signal = getDriverSignalStatus(location).label;
    if (fleetFilter === 'online') return signal === 'Online';
    if (fleetFilter === 'offline') return signal !== 'Online';
    if (fleetFilter === 'route') return Boolean(location.currentDeliveryId || deliveries.some(delivery => delivery.motoristaId === location.driverId && delivery.status === 'em_rota'));
    return true;
  });
  const onlineCount = driverLocations.filter(location => getDriverSignalStatus(location).label === 'Online').length;
  const routeCount = driverLocations.filter(location => location.currentDeliveryId || deliveries.some(delivery => delivery.motoristaId === location.driverId && delivery.status === 'em_rota')).length;
  const focusedLocation = driverLocations.find(location => location.driverId === focusedDriverId);
  const focusedDelivery = focusedLocation && deliveries.find(delivery => delivery.id === focusedLocation.currentDeliveryId || (delivery.motoristaId === focusedLocation.driverId && delivery.status === 'em_rota'));

  const activeDeliveriesWithGps = deliveries.filter(d => 
    d.status === 'em_rota' || d.status === 'aguardando_motorista' || d.status === 'entregue'
  );

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>GPS em Tempo Real — Rastreamento de Entregadores</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoramento de posição, velocidade, trajeto e ETA com sincronização automática.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar entregador ou local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>
          <button
            onClick={loadLocations}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
            title="Atualizar Posições"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Entregadores no mapa', value: driverLocations.length, icon: Users, tone: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Sinal online', value: onlineCount, icon: Radio, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Em rota agora', value: routeCount, icon: Navigation, tone: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Sem sinal', value: Math.max(0, driverLocations.length - onlineCount), icon: WifiOff, tone: 'text-slate-600 bg-slate-100 border-slate-200' }
        ].map(metric => {
          const MetricIcon = metric.icon;
          return <div key={metric.label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl border flex items-center justify-center ${metric.tone}`}><MetricIcon className="w-5 h-5" /></span>
            <div><p className="text-xl font-black text-slate-900 leading-none">{metric.value}</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1">{metric.label}</p></div>
          </div>;
        })}
      </section>

      <section className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-stretch">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div><h4 className="font-black text-slate-900 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-500" />Mapa operacional ao vivo</h4><p className="text-[11px] text-slate-500 mt-0.5">Clique em um marcador para acompanhar o entregador.</p></div>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {([['all', 'Todos'], ['online', 'Online'], ['route', 'Em rota'], ['offline', 'Sem sinal']] as const).map(([value, label]) => <button key={value} onClick={() => setFleetFilter(value)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${fleetFilter === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
            </div>
          </div>
          <LiveDriversMap locations={visibleLocations} deliveries={deliveries} focusedDriverId={focusedDriverId} onSelectDriver={setFocusedDriverId} className="h-[520px]" />
        </div>

        <aside className="bg-slate-950 rounded-2xl p-3 shadow-lg border border-slate-800 flex flex-col min-h-[520px]">
          <div className="p-2.5 border-b border-slate-800 flex items-center justify-between"><div><p className="text-white font-black text-sm">Central da frota</p><p className="text-slate-400 text-[10px] mt-0.5">{visibleLocations.length} entregador(es) exibido(s)</p></div><Activity className="w-5 h-5 text-amber-400" /></div>
          <div className="flex-1 overflow-y-auto py-2 space-y-1.5 pr-1">
            {visibleLocations.map(location => {
              const signal = getDriverSignalStatus(location);
              const delivery = deliveries.find(item => item.id === location.currentDeliveryId || (item.motoristaId === location.driverId && item.status === 'em_rota'));
              const selected = location.driverId === focusedDriverId;
              return <button key={location.driverId} onClick={() => setFocusedDriverId(location.driverId)} className={`w-full text-left rounded-xl p-3 transition-colors ${selected ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-bold text-xs truncate">{location.driverName}</span><span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${selected ? 'bg-slate-950/15' : signal.label === 'Online' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>{signal.label}</span></div>
                <div className={`flex items-center justify-between mt-2 text-[10px] ${selected ? 'text-slate-800' : 'text-slate-400'}`}><span>{delivery ? `NF #${delivery.numeroNF}` : 'Sem entrega em rota'}</span><span className="font-mono">{location.speed || 0} km/h</span></div>
              </button>;
            })}
            {visibleLocations.length === 0 && <div className="py-14 text-center text-slate-500 text-xs"><WifiOff className="w-7 h-7 mx-auto mb-2" />Nenhum sinal para este filtro.</div>}
          </div>
          {focusedLocation && <div className="mt-2 p-3 rounded-xl bg-white text-slate-900"><div className="flex items-center gap-2"><LocateFixed className="w-4 h-4 text-amber-600" /><div className="min-w-0"><p className="font-black text-xs truncate">{focusedLocation.driverName}</p><p className="text-[10px] text-slate-500 truncate">{focusedLocation.address || 'Localização recebida'}</p></div></div>{focusedDelivery && <button onClick={() => viewRouteHistory(focusedDelivery)} className="mt-3 w-full rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] py-2 flex justify-center items-center gap-1"><Route className="w-3.5 h-3.5" />Ver rota da entrega</button>}</div>}
        </aside>
      </section>

      {/* ACTIVE DRIVERS LOCATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.length === 0 ? (
          <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-slate-500 shadow-xs">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-bounce" />
            <p className="font-bold text-sm text-slate-800">Nenhum entregador transmitindo sinal GPS no momento</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              O sinal do GPS é transmitido automaticamente quando o entregador aceita uma entrega ou inicia o trajeto. Em modo offline, os dados são gravados no dispositivo e sincronizados assim que a conexão retornar.
            </p>
          </div>
        ) : (
          filteredLocations.map((loc) => {
            const activeDelivery = deliveries.find(d => 
              d.id === loc.currentDeliveryId || (d.motoristaId === loc.driverId && d.status === 'em_rota')
            );
            
            const signalStatus = getDriverSignalStatus(loc);
            const SignalIcon = signalStatus.icon;

            let etaInfo = null;
            let distanceKm = 0;
            let routeCompletionPct = 0;

            if (activeDelivery?.endereco?.latitude && activeDelivery?.endereco?.longitude) {
              distanceKm = calculateDistanceKm(
                loc.latitude, loc.longitude,
                activeDelivery.endereco.latitude, activeDelivery.endereco.longitude
              );
              etaInfo = calculateEta(distanceKm, loc.speed || 30);
              const initialEstKm = 10;
              routeCompletionPct = Math.min(99, Math.max(5, Math.round(((initialEstKm - distanceKm) / initialEstKm) * 100)));
            } else if (activeDelivery) {
              routeCompletionPct = activeDelivery.status === 'entregue' ? 100 : activeDelivery.status === 'em_rota' ? 50 : 10;
            }

            const driverData = drivers.find(drv => drv.id === loc.driverId);
            const isFocused = focusedDriverId === loc.driverId;

            return (
              <div 
                key={loc.driverId}
                className={`bg-white border ${isFocused ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md' : 'border-slate-200/80 hover:border-slate-300'} rounded-2xl p-5 transition-all shadow-xs space-y-3 relative overflow-hidden`}
              >
                {/* DRIVER INFO HEADER */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-600 text-xs overflow-hidden shrink-0">
                      {driverData?.fotoPerfilUrl ? (
                        <img src={driverData.fotoPerfilUrl} alt={loc.driverName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{loc.driverName}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Truck className="w-3 h-3 text-amber-500" />
                        <span>{driverData?.veiculoTipo || 'Veículo Cadastrado'}</span>
                      </p>
                    </div>
                  </div>

                  {/* SIGNAL STATUS BADGE */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border flex items-center gap-1 ${signalStatus.color}`}>
                    <SignalIcon className="w-3 h-3" />
                    <span>{signalStatus.label}</span>
                  </span>
                </div>

                {/* GPS METRICS GRID */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-500" /> Velocidade
                    </span>
                    <span className="font-mono text-sm text-amber-600 font-extrabold">{loc.speed || 0} km/h</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" /> Última Atualização
                    </span>
                    <span className="font-mono text-[11px] text-slate-700 font-semibold">
                      {new Date(loc.lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* CURRENT ADDRESS */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div className="text-slate-500 text-[10px] font-bold mb-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" /> Endereço Atual do Entregador
                  </div>
                  <p className="text-slate-800 font-semibold truncate">{loc.address || `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`}</p>
                </div>

                {/* ACTIVE DELIVERY & ETA */}
                {activeDelivery ? (
                  <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-800 text-[11px] uppercase tracking-wider">Entrega: NF #{activeDelivery.numeroNF}</span>
                      {etaInfo && (
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                          ETA: {etaInfo.formattedEta}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-900 text-xs font-bold">{activeDelivery.cliente.nome}</p>
                    <p className="text-slate-600 text-[11px] truncate">{activeDelivery.endereco.ruaNumero}, {activeDelivery.endereco.bairro}</p>

                    {/* ROUTE PROGRESS BAR */}
                    {routeCompletionPct > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                          <span>Progresso da Rota</span>
                          <span className="text-amber-700 font-mono font-bold">{routeCompletionPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${routeCompletionPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic text-center py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    Sem entrega atribuída no momento.
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setFocusedDriverId(loc.driverId);
                      if (activeDelivery) viewRouteHistory(activeDelivery);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
                    title="Centralizar no Entregador"
                  >
                    <Focus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Centralizar</span>
                  </button>

                  <button
                    onClick={() => openGoogleMapsRoute(loc, activeDelivery)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] py-2 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    title="Abrir rota no Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DELIVERIES ROUTE HISTORY SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Route className="w-4 h-4 text-amber-500" />
          <span>Histórico de Rotas e Trajetos Gravados</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeDeliveriesWithGps.map((delivery) => (
            <div 
              key={delivery.id} 
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-blue-600">NF #{delivery.numeroNF}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    delivery.status === 'entregue' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    delivery.status === 'em_rota' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {delivery.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="font-semibold text-slate-800">{delivery.cliente.nome}</p>
                <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                  {delivery.endereco.ruaNumero}, {delivery.endereco.cidade}
                </p>
              </div>

              <button
                onClick={() => viewRouteHistory(delivery)}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-amber-500 hover:text-slate-950 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 shadow-xs"
              >
                <span>Ver Rota</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ROUTE HISTORY DETAILS MODAL */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-2xl overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.16)] space-y-4 p-6 max-h-[90vh] overflow-y-auto text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base flex items-center gap-2">
                  <div className="p-1 bg-amber-500/10 text-amber-600 rounded-lg">
                    <Route className="w-5 h-5 text-amber-600" />
                  </div>
                  <span>Histórico da Rota - Entrega #{selectedDelivery.numeroNF}</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">{selectedDelivery.cliente.nome} ({selectedDelivery.endereco.ruaNumero})</p>
              </div>
              <button 
                onClick={() => { setSelectedDelivery(null); setSelectedDeliveryRoute(null); }}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedDeliveryRoute && selectedDeliveryRoute.points?.length > 0 ? (
              <div className="space-y-4">
                <GpsRouteMap
                  points={selectedDeliveryRoute.points}
                  currentLocation={driverLocations.find(location => location.driverId === selectedDeliveryRoute.driverId) || null}
                  destination={selectedDelivery.endereco}
                />
                {/* ROUTE SUMMARY STATS */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase block font-bold">Total de Pontos</span>
                    <span className="font-mono text-amber-600 font-extrabold text-sm">{selectedDeliveryRoute.points.length} pings</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase block font-bold">Início da Rota</span>
                    <span className="font-mono text-slate-800 text-xs font-semibold">
                      {new Date(selectedDeliveryRoute.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase block font-bold">Velocidade Média</span>
                    <span className="font-mono text-emerald-600 font-extrabold text-sm">
                      {Math.round(selectedDeliveryRoute.points.reduce((acc, p) => acc + (p.speed || 0), 0) / selectedDeliveryRoute.points.length)} km/h
                    </span>
                  </div>
                </div>

                {/* BREADCRUMB STEPS TIMELINE */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pontos Registrados na Rota:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedDeliveryRoute.points.map((pt, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-mono font-extrabold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{pt.address || `${pt.latitude.toFixed(5)}, ${pt.longitude.toFixed(5)}`}</p>
                            <span className="text-[10px] text-slate-500">Evento: {pt.event || 'gps ping'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-amber-600 text-xs">{pt.speed || 0} km/h</span>
                          <p className="text-[10px] text-slate-500">
                            {new Date(pt.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <MapPin className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-sm text-slate-800">Nenhum ponto de rota gravado ainda para esta entrega.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Os pontos de GPS são registrados em tempo real ou sincronizados localmente após a reconexão.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => { setSelectedDelivery(null); setSelectedDeliveryRoute(null); }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
