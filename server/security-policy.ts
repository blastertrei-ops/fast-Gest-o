export const roleAliases: Record<string, string> = { entregador: 'motorista', driver: 'motorista' };
const permissions: Record<string, ReadonlySet<string>> = {
  master: new Set(['*']),
  admin: new Set(['company:read', 'deliveries:read', 'deliveries:write', 'deliveries:delete', 'drivers:read', 'drivers:write', 'vehicles:read', 'vehicles:write', 'users:read', 'users:write', 'clients:read', 'clients:write', 'clients:delete', 'audit:read', 'storage:read', 'locations:read', 'locations:write', 'routes:read', 'routes:write']),
  operador: new Set(['company:read', 'deliveries:read', 'deliveries:write', 'drivers:read', 'vehicles:read', 'clients:read', 'clients:write', 'locations:read', 'routes:read']),
  motorista: new Set(['company:read', 'deliveries:read', 'deliveries:own-write', 'locations:write', 'routes:write'])
};
export const canonicalRole = (role: string) => roleAliases[role] || role;
export const hasPermission = (role: string, permission: string) => Boolean(permissions[canonicalRole(role)]?.has('*') || permissions[canonicalRole(role)]?.has(permission));
export function canAssignRole(actorRole: string, targetRole: string): boolean {
  const actor = canonicalRole(actorRole); const target = canonicalRole(targetRole);
  return actor === 'master' ? ['master', 'admin', 'operador', 'motorista'].includes(target) : actor === 'admin' && ['admin', 'operador', 'motorista'].includes(target);
}
const tenantFields = new Set(['companyId', 'organizationId', 'tenantId']);
export const withoutTenantFields = (data: any): any => Object.fromEntries(Object.entries(data).filter(([key]) => !tenantFields.has(key)));
