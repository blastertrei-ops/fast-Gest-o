export interface JwtPayload { userId: string; email: string; role: string; companyId: string; }
export interface ApiUser {
  id: string; companyId: string; nome: string; email: string; senhaHash: string;
  role: string; ativo: boolean; criadoEm: string; telefone?: string; motoristaId?: string;
  organizationId?: string; tenantId?: string; permissoesCustomizadas?: any; ultimoLogin?: string;
}
