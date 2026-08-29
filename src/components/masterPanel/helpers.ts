import { CompanyLimits, GranularPermissions } from '../../types';

export const DEFAULT_LIMITS: CompanyLimits = {
  maxClientes: 1000, maxEntregasMes: 5000, maxUsuarios: 20,
  maxEntregadores: 10, maxOperadores: 10, maxArmazenamentoMB: 5000
};

export const DEFAULT_PERMISSIONS: GranularPermissions = {
  criar_clientes: true, editar_clientes: true, excluir_clientes: false,
  criar_entregas: true, editar_entregas: true, excluir_entregas: false,
  alterar_status_entregas: true, criar_usuarios: false, excluir_usuarios: false,
  ver_relatorios: true, exportar_dados: true, configuracoes_empresa: false,
  dashboard: true, financeiro: false, logs: false, backup: false, ia: true
};

export const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
export const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
};
