import { readFile } from 'node:fs/promises';

type ExportFile = { collections: Record<string, Array<Record<string, unknown>>> };

const sourceToTarget = {
  empresas: 'companies', usuarios: 'users', drivers: 'drivers', vehicles: 'vehicles',
  clientes: 'clients', deliveries: 'deliveries', driver_locations: 'driver_locations',
  route_histories: 'route_histories', notifications: 'notifications', auditoria: 'audit_logs',
  master_auditoria: 'master_audit_logs', custom_roles: 'custom_roles'
} as const;

const batchSize = 100;
const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function argument(name: string) {
  const value = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!value) throw new Error(`Informe ${name}=caminho-do-arquivo`);
  return value.slice(name.length + 1);
}

function text(value: unknown) { return typeof value === 'string' && value.trim() ? value : null; }
function boolean(value: unknown) { return typeof value === 'boolean' ? value : null; }
function date(value: unknown) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

type ImportContext = { deliveryCompanies: Map<string, string>; driverCompanies: Map<string, string> };
const unassignedLegacyCompanyId = 'legacy_unassigned_company';
function companyId(value: unknown, fallback = unassignedLegacyCompanyId) { return text(value) ?? fallback; }

function recordFor(target: string, source: Record<string, unknown>, context: ImportContext) {
  const base = { id: String(source.id), payload: source };
  switch (target) {
    case 'companies': return { ...base, name: text(source.nome) ?? text(source.name), status: text(source.status) };
    case 'users': return { ...base, company_id: text(source.companyId), email: text(source.email)?.toLowerCase() ?? null, role: text(source.role), driver_id: text(source.motoristaId) ?? text(source.driverId), active: boolean(source.ativo) ?? boolean(source.active) };
    case 'drivers': return { ...base, company_id: companyId(source.companyId), user_id: text(source.userId), name: text(source.nome) ?? text(source.name), active: boolean(source.ativo) ?? boolean(source.active) };
    case 'vehicles': return { ...base, company_id: companyId(source.companyId), driver_id: text(source.motoristaId) ?? text(source.driverId), plate: text(source.placa) ?? text(source.plate), active: boolean(source.ativo) ?? boolean(source.active) };
    case 'clients': return { ...base, company_id: companyId(source.companyId), name: text(source.nome) ?? text(source.name), document: text(source.documento) ?? text(source.cpfCnpj) };
    case 'deliveries': return { ...base, company_id: companyId(source.companyId), client_id: text(source.clienteId) ?? text(source.clientId), driver_id: text(source.motoristaId) ?? text(source.driverId), status: text(source.status), scheduled_at: date(source.dataAgendada) ?? date(source.scheduledAt), delivered_at: date(source.dataEntrega) ?? date(source.deliveredAt) };
    case 'driver_locations': { const driverId = String(source.driverId ?? source.id); return { ...base, company_id: companyId(source.companyId, context.driverCompanies.get(driverId) ?? unassignedLegacyCompanyId), driver_id: driverId, latitude: typeof source.latitude === 'number' ? source.latitude : null, longitude: typeof source.longitude === 'number' ? source.longitude : null, updated_location_at: date(source.updatedAt) ?? date(source.lastUpdated) }; }
    case 'route_histories': { const deliveryId = String(source.deliveryId ?? source.id); return { ...base, company_id: companyId(source.companyId, context.deliveryCompanies.get(deliveryId) ?? unassignedLegacyCompanyId), delivery_id: deliveryId }; }
    case 'notifications': return { ...base, company_id: companyId(source.companyId), delivery_id: text(source.deliveryId), notification_type: text(source.type), created_notification_at: date(source.createdAt) };
    case 'audit_logs': return { ...base, company_id: companyId(source.companyId), action_type: text(source.tipoAcao) ?? text(source.actionType), actor_id: text(source.usuarioId) ?? text(source.userId) };
    case 'master_audit_logs': return { ...base, action_type: text(source.tipoAcao) ?? text(source.actionType), actor_id: text(source.usuarioId) ?? text(source.userId) };
    case 'custom_roles': return { ...base, company_id: text(source.companyId), name: text(source.nome) ?? text(source.name) };
    default: throw new Error(`Tabela não mapeada: ${target}`);
  }
}

function legacyCompany(id: string) {
  return {
    id,
    name: `Empresa legada sem cadastro (${id})`,
    status: 'suspensa',
    payload: { id, migration: { legacyCompanyPlaceholder: true, reason: 'Registros apontavam para esta empresa, mas ela não existia em empresas no Firestore.' } }
  };
}

async function upsert(table: string, records: ReturnType<typeof recordFor>[]) {
  for (let index = 0; index < records.length; index += batchSize) {
    const response = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: { apikey: key!, Authorization: `Bearer ${key!}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(records.slice(index, index + batchSize))
    });
    if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
  }
}

async function main() {
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias. Use-as apenas localmente ou em ambiente seguro.');
  const input = argument('--input');
  const exported = JSON.parse(await readFile(input, 'utf8')) as ExportFile;
  const context: ImportContext = {
    deliveryCompanies: new Map((exported.collections.deliveries ?? []).map((item) => [String(item.id), companyId(item.companyId)])),
    driverCompanies: new Map((exported.collections.drivers ?? []).map((item) => [String(item.id), companyId(item.companyId)]))
  };
  const prepared = Object.fromEntries(Object.entries(sourceToTarget).map(([source, target]) => [source, (exported.collections[source] ?? []).map((item) => recordFor(target, item, context))]));
  const companies = exported.collections.empresas ?? [];
  const knownCompanies = new Set(companies.map((item) => String(item.id)));
  const referencedCompanies = new Set(Object.values(prepared).flatMap((records) => records.map((record) => ('company_id' in record ? text(record.company_id) : null)).filter((id): id is string => Boolean(id))));
  const missingCompanies = [...referencedCompanies].filter((id) => !knownCompanies.has(id));
  await upsert('companies', [...companies.map((item) => recordFor('companies', item, context)), ...missingCompanies.map(legacyCompany)]);
  console.log(`empresas -> companies: ${companies.length} registro(s) importado(s); ${missingCompanies.length} empresa(s) legada(s) suspensa(s) criada(s)`);
  for (const [source, target] of Object.entries(sourceToTarget)) {
    if (source === 'empresas') continue;
    const records = prepared[source];
    await upsert(target, records);
    console.log(`${source} -> ${target}: ${records.length} registro(s) importado(s)`);
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
