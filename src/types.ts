/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'operador' | 'motorista';

export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string;
  criadoEm: string;
}

export interface Usuario {
  id: string;
  companyId: string; // Isolamento por empresa
  nome: string;
  email: string;
  senhaHash: string; // Para autenticação real simulada
  telefone: string;
  role: UserRole;
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
}

export interface ConfigGeral {
  nomeEmpresa: string;
  logoUrl?: string;
  raioToleranciaEntregaMetros: number;
  formasPagamentoAtivas: FormaPagamento[];
}
