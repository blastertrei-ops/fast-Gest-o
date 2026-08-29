/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'master' | 'admin' | 'operador' | 'motorista' | 'entregador' | 'driver' | 'custom' | string;

export type CompanyStatus = 'ativa' | 'suspensa' | 'bloqueada' | 'cancelada';
export type PlanoTipo = 'Mensal' | 'Anual' | 'Vitalicio' | 'Básico' | 'Profissional' | 'Enterprise';

export interface CompanyLimits {
  maxClientes: number;
  maxEntregasMes: number;
  maxUsuarios: number;
  maxEntregadores: number;
  maxOperadores: number;
  maxArmazenamentoMB: number;
}

export type CustomFieldType = 'texto' | 'numero' | 'lista' | 'data' | 'moeda' | 'checkbox' | 'qrcode' | 'codigo_interno';

export interface StandardFieldConfig {
  id: string;
  label: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required: boolean;
  enabled: boolean;
  order: number;
  placeholder?: string;
}

export interface DeliveryFormConfig {
  standardFields: StandardFieldConfig[];
  customFields: CustomFieldConfig[];
}

export interface CompanyModulesConfig {
  entregas: boolean;
  historico: boolean;
  usuarios: boolean;
  colaboradores?: boolean;
  formConfig: boolean;
  qrcode: boolean;
  relatorios: boolean;
  rastreamentoGps?: boolean;
  personalizacaoVisual?: boolean;
  financeiro?: boolean;
  logs?: boolean;
}

export interface CompanyThemeConfig {
  logoUrl?: string;
  faviconUrl?: string;
  loginBgUrl?: string;
  bannerUrl?: string;
  primaryColor?: string; // hex string ex: #f59e0b
  secondaryColor?: string; // hex string ex: #3b82f6
  buttonColor?: string;
  menuColor?: string;
  cardColor?: string;
  tagColor?: string;
  darkModePreference?: 'claro' | 'escuro' | 'sistema';
}

export interface Empresa {
  id: string;
  nome: string;
  nomeFantasia?: string;
  cnpj?: string;
  responsavel?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  planoContratado?: PlanoTipo;
  valorPlano?: number;
  dataInicio?: string;
  dataVencimento?: string;
  status: CompanyStatus;
  limites?: CompanyLimits;
  deliveryFormConfig?: DeliveryFormConfig;
  enabledModules?: CompanyModulesConfig;
  themeConfig?: CompanyThemeConfig;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface GpsLogPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number; // km/h
  timestamp: string; // ISO String
  address?: string;
  event?: 'aceito' | 'em_rota' | 'periodic' | 'parado' | 'entregue' | 'nao_entregue';
  deliveryId?: string;
}

export interface DriverLocationState {
  driverId: string;
  driverName: string;
  companyId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  address?: string;
  lastUpdated: string; // ISO String
  isOnline: boolean;
  isMoving?: boolean;
  currentDeliveryId?: string;
  batteryLevel?: number;
  heading?: number;
}

export interface DeliveryRouteHistory {
  deliveryId: string;
  driverId: string;
  driverName?: string;
  companyId: string;
  points: GpsLogPoint[];
  startedAt: string;
  finishedAt?: string;
  totalDistanceKm?: number;
  totalDurationMin?: number;
  avgSpeedKmH?: number;
}

export interface AppNotification {
  id: string;
  companyId: string;
  type: 'entrega_criada' | 'status_entrega' | 'alerta';
  title: string;
  message: string;
  deliveryId?: string;
  createdAt: string;
  readBy: string[];
}

export interface OfflineSyncItem {
  id: string;
  companyId: string;
  userId?: string;
  action: 'create_delivery' | 'update_delivery' | 'update_delivery_status' | 'add_comprovante' | 'gps_log' | 'update_company_theme';
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
}

export interface GranularPermissions {
  criar_clientes: boolean;
  editar_clientes: boolean;
  excluir_clientes: boolean;
  criar_entregas: boolean;
  editar_entregas: boolean;
  excluir_entregas: boolean;
  alterar_status_entregas: boolean;
  criar_usuarios: boolean;
  excluir_usuarios: boolean;
  ver_relatorios: boolean;
  exportar_dados: boolean;
  configuracoes_empresa: boolean;
  dashboard: boolean;
  financeiro: boolean;
  logs: boolean;
  backup: boolean;
  ia: boolean;
}

export interface PerfilPermissoes {
  id: string;
  companyId: string; // 'global' ou ID específico
  nome: string; // Ex: Financeiro, Operações, Supervisor, Expedição, Atendente, Gerente
  descricao?: string;
  permissoes: GranularPermissions;
  criadoEm: string;
}

export interface Usuario {
  id: string;
  companyId: string; // Isolamento por empresa
  organizationId?: string; // Vínculo da Organização
  tenantId?: string; // Isolamento Multitenant
  nome: string;
  email: string;
  senhaHash: string; // Para autenticação real simulada
  telefone: string;
  role: UserRole;
  customRoleId?: string; // Se role === 'custom'
  permissoesCustomizadas?: GranularPermissions; // Permissões diretas
  motoristaId?: string; // Preenchido se role === 'motorista'
  ativo: boolean;
  criadoEm: string;
  ultimoLogin?: string;
}

export interface Motorista {
  id: string;
  userId?: string; // ID do usuário de autenticação correspondente
  companyId: string; // Isolamento por empresa
  nome: string;
  cpf: string;
  rg?: string;
  telefone: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  fotoPerfilUrl?: string; // DataURL da foto
  cnh?: string;
  categoriaCNH?: string;
  validadeCNH?: string;
  observacoes?: string;
  ativo: boolean;
  online?: boolean;
  rotaAtual?: string | null;
  ultimaLocalizacao?: any;
  criadoEm: string;
  
  // Dados do veículo (opcionais)
  veiculoTipo?: string; // Bicicleta, Bicicleta elétrica, Moto, Carro, Van, Caminhão, Caminhada, etc.
  veiculoMarca?: string;
  veiculoModelo?: string;
  veiculoCor?: string;
  veiculoPlaca?: string;
}

export type VeiculoTipo = 'moto' | 'carro' | 'van' | 'outro';

export interface Veiculo {
  id: string;
  companyId: string; // Isolamento por empresa
  placa: string;
  modelo: string;
  tipo: VeiculoTipo;
  motoristaAtualId?: string;
  ativo: boolean;
}

export type FormaPagamento = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'ja_pago';
export type StatusPagamento = 'pago' | 'receber_na_entrega';

// Novo fluxo profissional de entrega
export type EntregaStatus = 
  | 'venda_realizada' 
  | 'nf_emitida' 
  | 'separacao' 
  | 'aguardando_motorista' 
  | 'em_rota' 
  | 'entregue' 
  | 'nao_entregue' 
  | 'cancelada';

export interface ClienteInfo {
  nome: string;
  telefone: string;
  whatsapp?: string;
  documento?: string;
}

export interface EnderecoInfo {
  ruaNumero: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado?: string;
  cep: string;
  complemento?: string;
  latitude: number;
  longitude: number;
}

export interface ComprovanteInfo {
  assinaturaUrl?: string; // DataURL da assinatura canvas
  fotoProdutoUrl?: string; // DataURL da foto do produto
  fotoFachadaUrl?: string; // DataURL opcional da fachada
  dataHoraEntrega?: string; // ISO String
  latitudeEntrega?: number;
  longitudeEntrega?: number;
  recebedorNome?: string;
  documentoRecebedor?: string; // RG, CPF ou documento do recebedor
  observacaoEntrega?: string; // Observação informada na finalização
  entregadorNome?: string;
  pdfUrl?: string;
}

export interface HistoricoStatus {
  id: string;
  statusAnterior: EntregaStatus;
  statusNovo: EntregaStatus;
  alteradoPor: string; // Nome do usuário
  alteradoEm: string;
  motivo?: string;
}

export interface Cliente {
  id: string;
  companyId: string;
  nome: string;
  telefone: string;
  whatsapp?: string;
  documento?: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface RegistroAuditoria {
  id: string;
  companyId: string;
  tipoAcao: 'exclusao_cliente' | 'exclusao_massa_clientes' | 'limpeza_banco' | 'exclusao_entrega';
  descricao: string;
  usuarioNome: string;
  usuarioId: string;
  detalhes?: {
    clienteNome?: string;
    clienteDocumento?: string;
    entregaId?: string;
    numeroNF?: string;
    motivo?: string;
    deleteFiles?: boolean;
    qtdClientesRemovidos?: number;
    qtdEntregasRemovidas?: number;
    espacoLiberadoBytes?: number;
    periodoReferencia?: string;
  };
  dataHora: string;
}

export interface StorageMetrics {
  totalClientes: number;
  totalClientesAtivos: number;
  totalClientesExcluidos: number;
  totalEntregas: number;
  totalComprovantes: number;
  totalFotos: number;
  totalDocumentos: number;
  espacoUtilizadoBytes: number;
  espacoUtilizadoFormatted: string;
  percentualUso: number;
}

export interface Entrega {
  id: string;
  companyId: string; // Isolamento por empresa
  numeroNF: string;
  numeroPedido?: string;
  cliente: ClienteInfo;
  endereco: EnderecoInfo;
  volumes: number;
  valorVenda: number;
  valorFrete?: number; // Opcional
  formaPagamento: FormaPagamento;
  statusPagamento: StatusPagamento;
  status: EntregaStatus;
  motoristaId?: string;
  entregadorId?: string;
  entregadorNome?: string;
  veiculoId?: string; // Para compatibilidade
  ordemRota?: number;
  dataEntregaPrevista: string; // YYYY-MM-DD
  horaEntregaPrevista?: string; // HH:MM
  isAgendada?: boolean; // Indicação de entrega agendada
  observacoes?: string;
  prioridade: 'alta' | 'media' | 'baixa';
  motivoNaoEntregue?: string;
  comprovante?: ComprovanteInfo;
  criadoPor: string; // Nome do operador/admin
  criadoEm: string;
  iniciadoEm?: string;
  atualizadoEm: string;
  origem: 'manual' | 'integracao_loja' | 'qrcode';
  historico?: HistoricoStatus[];
  customValues?: Record<string, any>;
  formSnapshot?: DeliveryFormConfig;
  qrCodeId?: string;
}

export interface ConfigGeral {
  nomeEmpresa: string;
  logoUrl?: string;
  raioToleranciaEntregaMetros: number;
  formasPagamentoAtivas: FormaPagamento[];
}

export interface MasterAuditLog {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  tipoAcao: 'criar_empresa' | 'editar_empresa' | 'bloquear_empresa' | 'suspender_empresa' | 'reativar_empresa' | 'excluir_empresa' | 'alterar_plano' | 'alterar_limites' | 'modo_suporte' | 'criar_perfil';
  descricao: string;
  detalhes?: any;
  dataHora: string;
}
