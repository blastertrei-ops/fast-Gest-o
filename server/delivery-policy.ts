const transitions: Record<string, ReadonlySet<string>> = {
  venda_realizada: new Set(['nf_emitida', 'separacao', 'aguardando_motorista', 'cancelada']),
  nf_emitida: new Set(['separacao', 'aguardando_motorista', 'cancelada']),
  separacao: new Set(['aguardando_motorista', 'cancelada']),
  aguardando_motorista: new Set(['em_rota', 'cancelada']),
  em_rota: new Set(['entregue', 'nao_entregue']),
  nao_entregue: new Set(['aguardando_motorista', 'cancelada']),
  entregue: new Set(),
  cancelada: new Set()
};

export const canTransitionDelivery = (from: string, to: string) => from === to || Boolean(transitions[from]?.has(to));

export function hasValidDeliveryProof(proof: any): boolean {
  return Boolean(
    proof &&
    typeof proof.assinaturaUrl === 'string' && proof.assinaturaUrl.startsWith('data:image/') &&
    typeof proof.recebedorNome === 'string' && proof.recebedorNome.trim().length >= 2 &&
    typeof proof.dataHoraEntrega === 'string' && !Number.isNaN(new Date(proof.dataHoraEntrega).getTime())
  );
}
