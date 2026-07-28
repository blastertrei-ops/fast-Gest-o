import { OfflineSyncItem, Entrega, Empresa, Usuario, Motorista, GpsLogPoint, DriverLocationState } from '../types';

const SYNC_QUEUE_KEY = 'fast_offline_sync_queue';
const OFFLINE_DELIVERIES_KEY = 'fast_offline_deliveries';
const OFFLINE_COMPANIES_KEY = 'fast_offline_companies';
const OFFLINE_DRIVERS_KEY = 'fast_offline_drivers';
const OFFLINE_GPS_KEY = 'fast_offline_gps_logs';

export interface SyncStatusState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt?: string;
  syncError?: string;
}

type SyncListener = (status: SyncStatusState) => void;

class OfflineStorageEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private lastSyncedAt?: string;
  private syncError?: string;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      
      // Auto periodic check/sync every 60s
      setInterval(() => {
        if (this.isOnline && this.getPendingCount() > 0 && !this.isSyncing) {
          this.triggerSync();
        }
      }, 60000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }

  public getStatus(): SyncStatusState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.getPendingCount(),
      lastSyncedAt: this.lastSyncedAt,
      syncError: this.syncError
    };
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    if (online) {
      console.log('📶 Conexão reestabelecida! Iniciando sincronização automática...');
      this.triggerSync();
    } else {
      console.log('🔴 Conexão perdida. Modo offline ativado.');
    }
    this.notify();
  }

  // --- LOCAL CACHE WRAPPERS ---
  public saveDeliveriesLocally(deliveries: Entrega[]) {
    try {
      localStorage.setItem(OFFLINE_DELIVERIES_KEY, JSON.stringify(deliveries));
    } catch (e) {
      console.error('Erro ao salvar entregas localmente:', e);
    }
  }

  public getLocalDeliveries(): Entrega[] {
    try {
      const data = localStorage.getItem(OFFLINE_DELIVERIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  public saveCompaniesLocally(companies: Empresa[]) {
    try {
      localStorage.setItem(OFFLINE_COMPANIES_KEY, JSON.stringify(companies));
    } catch (e) {}
  }

  public getLocalCompanies(): Empresa[] {
    try {
      const data = localStorage.getItem(OFFLINE_COMPANIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // --- SYNC QUEUE MANAGEMENT ---
  public getSyncQueue(): OfflineSyncItem[] {
    try {
      const queue = localStorage.getItem(SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      return [];
    }
  }

  private saveSyncQueue(queue: OfflineSyncItem[]) {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Erro ao salvar fila de sincronização:', e);
    }
    this.notify();
  }

  public getPendingCount(): number {
    return this.getSyncQueue().filter(i => i.status === 'pending' || i.status === 'failed').length;
  }

  public enqueueAction(
    companyId: string,
    action: OfflineSyncItem['action'],
    payload: any,
    userId?: string
  ): OfflineSyncItem {
    const queue = this.getSyncQueue();
    const newItem: OfflineSyncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      userId,
      action,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };

    queue.push(newItem);
    this.saveSyncQueue(queue);

    // If online, attempt immediate sync
    if (this.isOnline && !this.isSyncing) {
      this.triggerSync();
    }

    return newItem;
  }

  // Save GPS log offline
  public saveGpsLogLocally(point: GpsLogPoint) {
    try {
      const existing = this.getLocalGpsLogs();
      existing.push(point);
      // Keep max 500 recent points
      const trimmed = existing.slice(-500);
      localStorage.setItem(OFFLINE_GPS_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  public getLocalGpsLogs(): GpsLogPoint[] {
    try {
      const data = localStorage.getItem(OFFLINE_GPS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Execute sync queue with Firestore handler passed as callback
  public async processQueueWithHandler(
    handler: (item: OfflineSyncItem) => Promise<boolean>
  ): Promise<{ syncedCount: number; errorsCount: number }> {
    if (this.isSyncing) return { syncedCount: 0, errorsCount: 0 };
    
    const queue = this.getSyncQueue();
    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'failed');

    if (pendingItems.length === 0) {
      return { syncedCount: 0, errorsCount: 0 };
    }

    this.isSyncing = true;
    this.syncError = undefined;
    this.notify();

    let syncedCount = 0;
    let errorsCount = 0;

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        this.saveSyncQueue(queue);

        const success = await handler(item);
        if (success) {
          item.status = 'completed';
          syncedCount++;
        } else {
          item.retryCount += 1;
          item.status = item.retryCount >= 5 ? 'failed' : 'pending';
          item.error = 'Falha ao sincronizar com o servidor';
          errorsCount++;
        }
      } catch (err: any) {
        item.retryCount += 1;
        item.status = item.retryCount >= 5 ? 'failed' : 'pending';
        item.error = err.message || 'Erro desconhecido';
        errorsCount++;
      }
      this.saveSyncQueue(queue);
    }

    // Filter out completed items older than 1 hour
    const updatedQueue = this.getSyncQueue().filter(
      item => item.status !== 'completed'
    );
    this.saveSyncQueue(updatedQueue);

    this.isSyncing = false;
    this.lastSyncedAt = new Date().toISOString();
    this.notify();

    return { syncedCount, errorsCount };
  }

  public triggerSync() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast_trigger_offline_sync'));
    }
  }
}

export const OfflineStorage = new OfflineStorageEngine();
