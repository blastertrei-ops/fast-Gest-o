import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudUpload } from 'lucide-react';
import { OfflineStorage, SyncStatusState } from '../lib/offlineDb';
import { Database } from '../lib/db';

export default function OfflineStatusBanner() {
  const [syncState, setSyncState] = useState<SyncStatusState>(OfflineStorage.getStatus());
  const [messageToast, setMessageToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = OfflineStorage.subscribe((status) => {
      setSyncState(status);
    });

    // Listen for custom trigger event
    const handleTrigger = async () => {
      if (!navigator.onLine) return;
      const { syncedCount, errorsCount } = await OfflineStorage.processQueueWithHandler(async (item) => {
        try {
          if (item.action === 'update_delivery' || item.action === 'create_delivery') {
            await Database.saveDelivery(item.payload);
            return true;
          }
          if (item.action === 'update_delivery_status') {
            await Database.updateDeliveryStatus(item.payload.id, item.payload.status, item.payload.usuarioNome, item.payload.motivo);
            return true;
          }
          if (item.action === 'add_comprovante') {
            await Database.addComprovanteEntrega(item.payload.id, item.payload.comprovante);
            return true;
          }
          if (item.action === 'gps_log') {
            if (item.payload.driverState) {
              await Database.updateDriverGpsLocation(item.payload.driverState);
            }
            if (item.payload.point && item.payload.point.deliveryId) {
              await Database.appendDeliveryRoutePoint(item.payload.point.deliveryId, item.payload.point);
            }
            return true;
          }
          if (item.action === 'update_company_theme') {
            await Database.updateCompanyThemeConfig(item.companyId, item.payload);
            return true;
          }
          return true;
        } catch (err) {
          return false;
        }
      });

      if (syncedCount > 0) {
        setMessageToast(`✔ ${syncedCount} ${syncedCount === 1 ? 'item sincronizado' : 'itens sincronizados'} com sucesso!`);
        setTimeout(() => setMessageToast(null), 4000);
      }
    };

    window.addEventListener('fast_trigger_offline_sync', handleTrigger);

    return () => {
      unsubscribe();
      window.removeEventListener('fast_trigger_offline_sync', handleTrigger);
    };
  }, []);

  const handleSyncNow = () => {
    OfflineStorage.triggerSync();
  };

  return (
    <div className="w-full">
      {/* SUCCESS TOAST NOTIFICATION */}
      {messageToast && (
        <div className="bg-emerald-500/90 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between gap-2 transition-all animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{messageToast}</span>
          </div>
          <button onClick={() => setMessageToast(null)} className="text-white/80 hover:text-white text-xs font-mono">✕</button>
        </div>
      )}

      {/* OFFLINE INDICATOR BAR */}
      {!syncState.isOnline && (
        <div className="bg-red-950/90 border-b border-red-800 text-red-200 px-4 py-2 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="font-bold tracking-wide">🔴 Trabalhando Offline</span>
            {syncState.pendingCount > 0 && (
              <span className="bg-red-900/80 text-red-100 text-[10px] px-2 py-0.5 rounded-full font-mono">
                {syncState.pendingCount} {syncState.pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'}
              </span>
            )}
          </div>
          <span className="text-[11px] text-red-300/80 hidden sm:inline">
            Alterações serão salvas localmente e enviadas ao reconectar.
          </span>
        </div>
      )}

      {/* ONLINE SYNCING BAR */}
      {syncState.isOnline && syncState.pendingCount > 0 && (
        <div className="bg-amber-950/80 border-b border-amber-800 text-amber-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-semibold text-amber-300">
              {syncState.isSyncing ? 'Sincronizando dados...' : `${syncState.pendingCount} alterações salvas localmente`}
            </span>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={syncState.isSyncing}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-3 py-1 rounded text-[11px] flex items-center gap-1 transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncState.isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
