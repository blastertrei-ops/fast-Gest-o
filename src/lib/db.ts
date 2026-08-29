import { Usuario } from '../types';

// Browser data access is API-only. Firebase Admin runs exclusively on the server.
const tokenKey = 'fast_jwt_token';
const state: any = { empresas: [], usuarios: [], deliveries: {}, drivers: {}, vehicles: {}, clients: {}, notifications: {}, auditLogs: {}, masterAuditLogs: [], customRoles: [], activeSession: null, listeners: new Set<() => void>() };
const notify = () => state.listeners.forEach((listener: () => void) => listener());
const auth = () => localStorage.getItem(tokenKey);
async function api(url: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(auth() ? { Authorization: `Bearer ${auth()}` } : {}), ...(init.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a operação.');
  return body;
}
const list = (key: string, companyId: string) => state[key][companyId] || [];
const generic = (companyId: string, collection: string, data: any) => api(`/api/data/${companyId}/${collection}`, { method: 'POST', body: JSON.stringify(data) });

export const Database: any = {
  subscribe(listener: () => void) { state.listeners.add(listener); return () => state.listeners.delete(listener); },
  clearAll() { localStorage.removeItem(tokenKey); state.activeSession = null; notify(); },
  getCurrentSession() { return state.activeSession; },
  setCurrentSession(user: Usuario | null, token?: string) { state.activeSession = user; if (token) localStorage.setItem(tokenKey, token); if (!user) localStorage.removeItem(tokenKey); notify(); },
  async login(email: string, password: string) { try { const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); localStorage.setItem(tokenKey, data.token); state.activeSession = data.user; notify(); return data; } catch (error: any) { return { success: false, error: error.message }; } },
  async registerCompany(companyName: string, adminName: string, adminEmail: string, adminPassword: string, adminPhone: string) { try { const data = await api('/api/auth/register-company', { method: 'POST', body: JSON.stringify({ companyName, adminName, adminEmail, adminPassword, adminPhone }) }); localStorage.setItem(tokenKey, data.token); state.activeSession = data.user; return data; } catch (error: any) { return { success: false, error: error.message }; } },
  async recoverPassword(email: string) { try { return await api('/api/auth/recover-password', { method: 'POST', body: JSON.stringify({ email }) }); } catch (error: any) { return { success: false, message: error.message }; } },
  async changePassword(_id: string, currentPassword: string, newPassword: string) { try { return await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }); } catch (error: any) { return { success: false, error: error.message }; } },
  async updateProfile(_id: string, nome: string, email: string, telefone: string) { try { const data = await api('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ nome, email, telefone }) }); state.activeSession = { ...state.activeSession, ...data.user }; notify(); return data; } catch (error: any) { return { success: false, error: error.message }; } },
  getCompany(id: string) { return state.empresas.find((item: any) => item.id === id) || (state.activeSession?.companyId === id ? { id, nome: '', status: 'ativa', criadoEm: '' } : undefined); }, getDeliveries(id: string) { return list('deliveries', id); }, getDrivers(id: string) { return list('drivers', id); }, getVehicles(id: string) { return list('vehicles', id); }, getClients(id: string) { return list('clients', id); }, getAuditLogs(id: string) { return list('auditLogs', id); }, getUsers(id: string) { return id === 'global' ? state.usuarios : state.usuarios.filter((item: any) => item.companyId === id); }, getAllUsers() { return state.usuarios; }, getCompanies() { return state.empresas; }, getMasterAuditLogs() { return state.masterAuditLogs; }, getCustomRoles(id?: string) { return id ? state.customRoles.filter((item: any) => item.companyId === id || item.companyId === 'global') : state.customRoles; },
  getNotifications(id: string) { return list('notifications', id); },
  async loadNotifications(companyId: string) { const data = await api(`/api/notifications/${companyId}`); state.notifications[companyId] = data; notify(); return data; },
  async markNotificationRead(companyId: string, notificationId: string) { await api(`/api/notifications/${companyId}/${notificationId}/read`, { method: 'PUT' }); const userId = state.activeSession?.id; const item = list('notifications', companyId).find((notification: any) => notification.id === notificationId); if (item && userId && !item.readBy.includes(userId)) item.readBy.push(userId); notify(); },
  async syncCompanyData(companyId: string) {
    const role = state.activeSession?.role;
    const endpoints: any = {
      deliveries: `/api/deliveries/${companyId}`,
      drivers: `/api/drivers/${companyId}`,
      vehicles: `/api/vehicles/${companyId}`,
      usuarios: `/api/users/${companyId}`,
      clients: `/api/clients/${companyId}`,
      auditLogs: `/api/audit/${companyId}`
    };
    const keys = role === 'motorista' || role === 'entregador' || role === 'driver'
      ? ['deliveries']
      : role === 'operador'
        ? ['deliveries', 'drivers', 'vehicles', 'clients']
        : Object.keys(endpoints);
    await Promise.all(keys.map(async key => {
      const data = await api(endpoints[key]);
      if (key === 'usuarios') state.usuarios = [...state.usuarios.filter((u: any) => u.companyId !== companyId), ...data];
      else state[key][companyId] = data;
    }));
    const company = await api(`/api/company/${companyId}`);
    state.empresas = [...state.empresas.filter((item: any) => item.id !== companyId), company];
    notify();
  },
  async saveSingleDelivery(companyId: string, data: any) { const out = await api(`/api/deliveries/${companyId}`, { method: 'POST', body: JSON.stringify(data) }); state.deliveries[companyId] = [out.delivery, ...list('deliveries', companyId).filter((x: any) => x.id !== out.delivery.id)]; notify(); return out.delivery; },
  saveDeliveries(id: string, data: any[]) { state.deliveries[id] = data; notify(); data.forEach(item => generic(id, 'deliveries', item).catch(console.error)); }, saveDrivers(id: string, data: any[]) { state.drivers[id] = data; notify(); data.forEach(item => generic(id, 'drivers', item).catch(console.error)); }, saveVehicles(id: string, data: any[]) { state.vehicles[id] = data; notify(); data.forEach(item => generic(id, 'vehicles', item).catch(console.error)); }, saveUsers(id: string, data: any[]) { data.forEach(item => api(`/api/users/${id}/${item.id}`, { method: 'PUT', body: JSON.stringify(item) }).catch(console.error)); },
  async createDriver(id: string, data: any) { try { return await api(`/api/drivers/${id}`, { method: 'POST', body: JSON.stringify(data) }); } catch (error: any) { return { success: false, error: error.message }; } }, async createUser(id: string, data: any) { try { return await api(`/api/users/${id}`, { method: 'POST', body: JSON.stringify(data) }); } catch (error: any) { return { success: false, error: error.message }; } },
  updateUserStatus(userId: string, ativo: boolean) { const user = state.usuarios.find((x: any) => x.id === userId); if (!user) return false; user.ativo = ativo; api(`/api/users/${user.companyId}/${userId}`, { method: 'PUT', body: JSON.stringify({ ativo }) }).catch(console.error); notify(); return true; }, async updateUser(companyId: string, id: string, data: any) { try { return await api(`/api/users/${companyId}/${id}`, { method: 'PUT', body: JSON.stringify(data) }); } catch (error: any) { return { success: false, error: error.message }; } }, async deleteUser(companyId: string, id: string) { return api(`/api/users/${companyId}/${id}`, { method: 'DELETE' }); }, async deleteUsersBatch(items: any[]) { await Promise.all(items.map(x => this.deleteUser(x.companyId, x.id))); return { success: true, count: items.length }; }, async updateUsersStatusBatch(ids: string[], ativo: boolean) { ids.forEach(id => this.updateUserStatus(id, ativo)); return { success: true }; }, async updateUsersRoleBatch(ids: string[], role: string) { await Promise.all(ids.map(id => { const u = state.usuarios.find((x: any) => x.id === id); return u && this.updateUser(u.companyId, id, { role }); })); return { success: true }; }, async resetUsersPasswordBatch(ids: string[], senha: string) { await Promise.all(ids.map(id => { const u = state.usuarios.find((x: any) => x.id === id); return u && this.updateUser(u.companyId, id, { senha }); })); return { success: true }; },
  async updateDriver(c: string, id: string, d: any) { return api(`/api/drivers/${c}/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }, async deleteDriver(c: string, id: string) { return api(`/api/drivers/${c}/${id}`, { method: 'DELETE' }); }, async deleteVehicle(c: string, id: string) { return api(`/api/vehicles/${c}/${id}`, { method: 'DELETE' }); }, async updateDelivery(id: string, d: any) { try { await api(`/api/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(d) }); return true; } catch { return false; } }, async saveDelivery(d: any) { try { await this.saveSingleDelivery(d.companyId, d); return true; } catch { return false; } }, async updateDeliveryStatus(id: string, status: string) { return this.updateDelivery(id, { status }); }, async addComprovanteEntrega(id: string, comprovante: any) { return this.updateDelivery(id, { comprovante, status: 'entregue' }); }, async deleteDelivery(c: string, id: string, d?: any) { try { return await api(`/api/deliveries/${c}/${id}`, { method: 'DELETE', body: JSON.stringify(d || {}) }); } catch (error: any) { return { success: false, error: error.message }; } },
  async saveClient(c: string, d: any) { return (await api(`/api/clients/${c}`, { method: 'POST', body: JSON.stringify(d) })).client; }, async deleteClient(c: string, id: string) { return api(`/api/clients/${c}/${id}`, { method: 'DELETE' }); }, async bulkCleanupClients(c: string, startDate: string, endDate: string, mode: string) { return api(`/api/admin/bulk-cleanup-clients/${c}`, { method: 'POST', body: JSON.stringify({ startDate, endDate, mode }) }); }, async getStorageMetrics(c: string) { return api(`/api/storage-metrics/${c}`); },
  async createCompanyMaster(d: any) { return api('/api/master/companies', { method: 'POST', body: JSON.stringify(d) }); }, async updateCompanyMaster(id: string, d: any) { return api(`/api/master/companies/${id}`, { method: 'PUT', body: JSON.stringify(d) }); }, async deleteCompanyMaster(id: string) { return api(`/api/master/companies/${id}`, { method: 'DELETE' }); }, async deleteCompaniesBatchMaster(ids: string[]) { await Promise.all(ids.map(id => this.deleteCompanyMaster(id))); return { success: true, count: ids.length }; }, async updateCompaniesStatusBatchMaster(ids: string[], status: string) { await Promise.all(ids.map(id => this.updateCompanyMaster(id, { status }))); return { success: true }; }, async resetCompanyAdminPasswordBatchMaster() { return { success: false, count: 0 }; }, async saveCustomRole(d: any) { return api('/api/master/custom-roles', { method: 'POST', body: JSON.stringify(d) }); }, async deleteCustomRole(id: string) { return api(`/api/master/custom-roles/${id}`, { method: 'DELETE' }); }, async updateCompanyFormConfig(id: string, d: any) { return this.updateCompanyMaster(id, { deliveryFormConfig: d }); }, async updateCompanyThemeConfig(id: string, d: any) { return this.updateCompanyMaster(id, { themeConfig: d }); }, async updateDriverGpsLocation(d: any) { return generic(d.companyId, 'driver_locations', d); }, async getDriverGpsLocations(id: string) { return api(`/api/data/${id}/driver_locations`); }, async appendDeliveryRoutePoint(_id: string, d: any) { return generic(d.companyId, 'route_histories', d); }, async getDeliveryRouteHistory(id: string) { return (await api(`/api/data/${state.activeSession?.companyId}/route_histories`)).find((x: any) => x.deliveryId === id) || null; }
};
