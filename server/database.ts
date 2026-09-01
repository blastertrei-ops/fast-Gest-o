import * as firebase from './firebase';

type Filter = { field: string; operator: '=='; value: unknown };
type CollectionRef = { kind: 'collection'; name: string; filters: Filter[] };
type DocumentRef = { kind: 'document'; collection: string; id: string };

const backend = process.env.DATA_BACKEND?.trim().toLowerCase() || 'firebase';
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tableNames: Record<string, string> = {
  empresas: 'companies', usuarios: 'users', drivers: 'drivers', vehicles: 'vehicles', clientes: 'clients',
  deliveries: 'deliveries', driver_locations: 'driver_locations', route_histories: 'route_histories',
  notifications: 'notifications', auditoria: 'audit_logs', master_auditoria: 'master_audit_logs', custom_roles: 'custom_roles'
};

if (backend !== 'firebase' && backend !== 'supabase') throw new Error('DATA_BACKEND deve ser firebase ou supabase.');
if (backend === 'supabase' && (!supabaseUrl || !supabaseKey)) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias quando DATA_BACKEND=supabase.');

export const firestoreDb: any = backend === 'firebase' ? firebase.firestoreDb : { backend: 'supabase' };
export const activeDatabaseBackend = backend;

function tableFor(collectionName: string) {
  const table = tableNames[collectionName];
  if (!table) throw new Error(`Coleção não mapeada para Supabase: ${collectionName}`);
  return table;
}

function headers(extra: Record<string, string> = {}) {
  return { apikey: supabaseKey!, Authorization: `Bearer ${supabaseKey!}`, ...extra };
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: headers(init.headers as Record<string, string> | undefined) });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  return response;
}

function fromRow(row: any) { return { ...(row.payload || {}), id: row.id }; }
function clean(value: any): any {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, clean(item)]));
  return value;
}
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value : null; }
function date(value: unknown) { return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null; }

function rowFor(collectionName: string, id: string, data: any) {
  const payload = clean({ ...data, id });
  const base = { id, payload };
  switch (collectionName) {
    case 'empresas': return { ...base, name: text(data.nome) ?? text(data.name), status: text(data.status) };
    case 'usuarios': return { ...base, company_id: text(data.companyId), email: text(data.email)?.toLowerCase() ?? null, role: text(data.role), driver_id: text(data.motoristaId) ?? text(data.driverId), active: typeof data.ativo === 'boolean' ? data.ativo : (typeof data.active === 'boolean' ? data.active : null) };
    case 'drivers': return { ...base, company_id: data.companyId, user_id: text(data.userId), name: text(data.nome) ?? text(data.name), active: typeof data.ativo === 'boolean' ? data.ativo : null };
    case 'vehicles': return { ...base, company_id: data.companyId, driver_id: text(data.motoristaId) ?? text(data.driverId), plate: text(data.placa) ?? text(data.plate), active: typeof data.ativo === 'boolean' ? data.ativo : null };
    case 'clientes': return { ...base, company_id: data.companyId, name: text(data.nome) ?? text(data.name), document: text(data.documento) ?? text(data.cpfCnpj) };
    case 'deliveries': return { ...base, company_id: data.companyId, client_id: text(data.clienteId) ?? text(data.clientId), driver_id: text(data.motoristaId) ?? text(data.driverId), status: text(data.status), scheduled_at: date(data.dataAgendada) ?? date(data.scheduledAt), delivered_at: date(data.dataEntrega) ?? date(data.deliveredAt) };
    case 'driver_locations': return { ...base, company_id: data.companyId, driver_id: data.driverId ?? id, latitude: typeof data.latitude === 'number' ? data.latitude : null, longitude: typeof data.longitude === 'number' ? data.longitude : null, updated_location_at: date(data.updatedAt) ?? date(data.lastUpdated) };
    case 'route_histories': return { ...base, company_id: data.companyId, delivery_id: data.deliveryId ?? id };
    case 'notifications': return { ...base, company_id: data.companyId, delivery_id: text(data.deliveryId), notification_type: text(data.type), created_notification_at: date(data.createdAt) };
    case 'auditoria': return { ...base, company_id: data.companyId, action_type: text(data.tipoAcao) ?? text(data.actionType), actor_id: text(data.usuarioId) ?? text(data.userId) };
    case 'master_auditoria': return { ...base, action_type: text(data.tipoAcao) ?? text(data.actionType), actor_id: text(data.usuarioId) ?? text(data.userId) };
    case 'custom_roles': return { ...base, company_id: text(data.companyId), name: text(data.nome) ?? text(data.name) };
    default: throw new Error(`Coleção não mapeada para Supabase: ${collectionName}`);
  }
}

export const collection = (_db: any, name: string): any => backend === 'firebase' ? firebase.collection(firebase.firestoreDb, name) : ({ kind: 'collection', name, filters: [] } satisfies CollectionRef);
export const doc = (_db: any, name: string, id: string): any => backend === 'firebase' ? firebase.doc(firebase.firestoreDb, name, id) : ({ kind: 'document', collection: name, id } satisfies DocumentRef);
export const where = (field: string, operator: '==', value: unknown): Filter => {
  if (operator !== '==') throw new Error('A migração Supabase suporta apenas filtros de igualdade.');
  return { field, operator, value };
};
export const query = (ref: any, ...filters: Filter[]): any => backend === 'firebase' ? firebase.query(ref, ...filters) : ({ ...ref, filters: [...ref.filters, ...filters] } satisfies CollectionRef);

export async function getDoc(ref: any): Promise<any> {
  if (backend === 'firebase') return firebase.getDoc(ref);
  const result = await (await request(`${tableFor(ref.collection)}?id=eq.${encodeURIComponent(ref.id)}&select=*`)).json();
  const row = result[0];
  return { exists: () => Boolean(row), data: () => row ? fromRow(row) : undefined };
}

export async function getDocs(ref: any): Promise<any> {
  if (backend === 'firebase') return firebase.getDocs(ref);
  const params = new URLSearchParams({ select: '*' });
  for (const filter of ref.filters ?? []) {
    const column = filter.field === 'companyId' ? 'company_id' : filter.field;
    params.set(column, `eq.${String(filter.value)}`);
  }
  const rows = await (await request(`${tableFor(ref.name)}?${params.toString()}`)).json();
  return { docs: rows.map((row: any) => ({ id: row.id, data: () => fromRow(row) })) };
}

export async function setDoc(ref: any, data: any, options?: { merge?: boolean }) {
  if (backend === 'firebase') return firebase.setDoc(ref, data, options);
  const current = options?.merge ? await getDoc(ref) : undefined;
  const merged = current?.exists() ? { ...current.data(), ...data } : data;
  const table = tableFor(ref.collection);
  await request(`${table}?on_conflict=id`, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([rowFor(ref.collection, ref.id, merged)]) });
}

export async function updateDoc(ref: any, data: any) {
  if (backend === 'firebase') return firebase.updateDoc(ref, data);
  const current = await getDoc(ref);
  if (!current.exists()) throw new Error('Documento não encontrado.');
  return setDoc(ref, { ...current.data(), ...data });
}

export async function deleteDoc(ref: any) {
  if (backend === 'firebase') return firebase.deleteDoc(ref);
  await request(`${tableFor(ref.collection)}?id=eq.${encodeURIComponent(ref.id)}`, { method: 'DELETE' });
}

export async function databaseReady() {
  if (backend === 'firebase') { await firebase.getDoc(firebase.doc(firebase.firestoreDb, '_system', 'healthcheck')); return; }
  await request('companies?select=id&limit=1');
}
