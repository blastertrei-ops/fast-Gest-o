/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  FileCheck, Printer, User, Phone, MapPin, Package, DollarSign, 
  Calendar, Clock, AlertCircle, FileText, CheckCircle2 
} from 'lucide-react';
import { Entrega, Empresa, Motorista, FormaPagamento, StatusPagamento } from '../types';
import { getDeliveryFormConfig, getFieldValue, generateA4ReceiptHtml } from '../utils/pdfGenerator';

interface DynamicDeliveryDetailsProps {
  delivery: Entrega;
  company?: Empresa;
  drivers?: Motorista[];
  onUpdateDelivery?: (id: string, updates: Partial<Entrega>) => void;
  onClose?: () => void;
  onAdvanceStatus?: (status: any) => void;
  onShowCancelModal?: () => void;
}

export default function DynamicDeliveryDetails({
  delivery,
  company,
  drivers = [],
  onUpdateDelivery,
  onClose,
  onAdvanceStatus,
  onShowCancelModal
}: DynamicDeliveryDetailsProps) {
  const formConfig = getDeliveryFormConfig(delivery, company);

  // Combine enabled standard & custom fields sorted by order
  const enabledStandard = (formConfig.standardFields || [])
    .filter(f => f.enabled !== false)
    .map(f => ({ id: f.id, label: f.label, order: f.order, isCustom: false }));

  const enabledCustom = (formConfig.customFields || [])
    .filter(f => f.enabled !== false)
    .map(f => ({ id: f.id, label: f.label, order: f.order, isCustom: true }));

  const sortedFields = [...enabledStandard, ...enabledCustom].sort((a, b) => a.order - b.order);

  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const driverObj = drivers.find(drv => drv.id === delivery.motoristaId || drv.id === delivery.entregadorId);
    const html = generateA4ReceiptHtml(delivery, company, driverObj?.nome);

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans text-slate-800">
      
      {/* 📋 DADOS DINÂMICOS DO FORMULÁRIO */}
      <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            Dados da Entrega ({sortedFields.length} campos ativos)
          </span>
          <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            NF #{delivery.numeroNF}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sortedFields.map(field => {
            const val = getFieldValue(delivery, field.id, field.label);
            if (!val) return null; // Don't take space if empty value

            const isFullWidth = field.id === 'rua' || field.id === 'endereco' || field.id === 'observacoes';

            return (
              <div 
                key={field.id} 
                className={`bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs ${
                  isFullWidth ? 'sm:col-span-2' : ''
                }`}
              >
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                  {field.label}
                </span>
                <span className="font-extrabold text-slate-900 text-xs mt-0.5 block break-words">
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 💳 FORMA E STATUS DE PAGAMENTO & PRIORIDADE */}
      {onUpdateDelivery && (
        <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">
            Gestão de Pagamento & Prioridade
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Forma Pagamento</span>
              <select
                value={delivery.formaPagamento}
                onChange={(e) => {
                  const val = e.target.value as FormaPagamento;
                  onUpdateDelivery(delivery.id, { formaPagamento: val });
                }}
                className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ja_pago">Já Pago no Site/Loja</option>
                <option value="pix">PIX na entrega</option>
                <option value="dinheiro">Dinheiro na entrega</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
              </select>
            </div>

            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Status Pagamento</span>
              <select
                value={delivery.statusPagamento}
                onChange={(e) => {
                  const val = e.target.value as StatusPagamento;
                  onUpdateDelivery(delivery.id, { statusPagamento: val });
                }}
                className={`w-full font-bold text-xs rounded-xl px-2.5 py-1.5 border focus:outline-none cursor-pointer ${
                  delivery.statusPagamento === 'pago' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <option value="pago">PAGO / RECEBIDO</option>
                <option value="receber_na_entrega">RECEBER NA ENTREGA</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 🚚 FLUXO / MOTORISTA DESIGNADO (Se não finalizada) */}
      {delivery.status !== 'entregue' && delivery.status !== 'cancelada' && onUpdateDelivery && (
        <div className="border-t border-slate-200/80 pt-3.5 space-y-3">
          <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
            Atribuição e Ações Operacionais
          </span>

          {/* Motorista Dropdown */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase block">Entregador Responsável</label>
            <select
              value={delivery.motoristaId || delivery.entregadorId || ''}
              onChange={(e) => {
                const selectedId = e.target.value || undefined;
                const drvObj = drivers.find(drv => drv.id === selectedId);
                const updates: Partial<Entrega> = {
                  motoristaId: selectedId,
                  entregadorId: drvObj?.id || selectedId,
                  entregadorNome: drvObj?.nome || undefined
                };
                if (selectedId && (delivery.status === 'venda_realizada' || delivery.status === 'nf_emitida' || delivery.status === 'separacao')) {
                  updates.status = 'aguardando_motorista';
                }
                onUpdateDelivery(delivery.id, updates);
              }}
              className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-amber-500 text-amber-800 cursor-pointer"
            >
              <option value="">-- Selecionar Entregador --</option>
              {drivers.map(drv => (
                <option key={drv.id} value={drv.id}>{drv.nome} ({drv.telefone || 'Sem tel'})</option>
              ))}
            </select>
          </div>

          {onShowCancelModal && (
            <button
              onClick={onShowCancelModal}
              className="w-full py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors rounded-xl font-bold text-xs cursor-pointer"
            >
              Cancelar Entrega
            </button>
          )}
        </div>
      )}

      {/* ✍️ SEÇÃO COMPROVANTE DE ENTREGA (Exibida após entrega finalizada) */}
      {delivery.status === 'entregue' && (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-emerald-800 font-extrabold flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 
              Comprovante de Entrega
            </h4>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
              Confirmado
            </span>
          </div>

          {/* Dados do Comprovante */}
          <div className="bg-white p-3 rounded-xl border border-emerald-100 font-mono text-[11px] space-y-1.5 text-slate-700 shadow-2xs">
            <p className="flex justify-between">
              <span className="text-slate-500 font-sans font-bold">Recebido por:</span> 
              <strong className="text-slate-900 font-sans">{delivery.comprovante?.recebedorNome || delivery.cliente?.nome || '—'}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500 font-sans font-bold">Entregador:</span> 
              <strong className="text-slate-900 font-sans">{delivery.comprovante?.entregadorNome || delivery.entregadorNome || '—'}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500 font-sans font-bold">Concluído em:</span> 
              <strong className="text-slate-900 font-sans">{formatDateTime(delivery.comprovante?.dataHoraEntrega)}</strong>
            </p>
            {delivery.comprovante?.latitudeEntrega != null && (
              <p className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-sans font-bold">GPS:</span> 
                <span className="text-slate-800 font-mono">{Number(delivery.comprovante.latitudeEntrega).toFixed(6)}, {Number(delivery.comprovante.longitudeEntrega || 0).toFixed(6)}</span>
              </p>
            )}
          </div>

          {/* Assinatura */}
          {delivery.comprovante?.assinaturaUrl ? (
            <div className="space-y-1">
              <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider block">
                Assinatura Digital
              </span>
              <div className="rounded-xl border border-emerald-200 bg-white p-2 flex items-center justify-center min-h-[80px]">
                <img 
                  src={delivery.comprovante.assinaturaUrl} 
                  alt="Assinatura"
                  className="h-16 max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-amber-700 italic bg-amber-50 p-2 rounded-lg border border-amber-200">
              Assinatura pendente ou não fornecida.
            </div>
          )}

          {/* Observação do Entregador (Apenas se preenchida) */}
          {delivery.comprovante?.observacaoEntrega && (
            <div className="space-y-1">
              <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider block">
                Observação do Entregador
              </span>
              <div className="bg-amber-50/80 border border-amber-200 text-amber-900 p-2.5 rounded-xl font-medium text-xs italic">
                "{delivery.comprovante.observacaoEntrega}"
              </div>
            </div>
          )}

          {/* Botão para Gerar PDF A4 */}
          <button
            onClick={handlePrintPdf}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold rounded-xl flex items-center justify-center gap-2 border border-slate-800 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Gerar Comprovante PDF (A4)
          </button>
        </div>
      )}

      {/* Botão de impressão direta também para entregas não finalizadas */}
      {delivery.status !== 'entregue' && (
        <button
          onClick={handlePrintPdf}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          Imprimir Ficha de Entrega PDF (A4)
        </button>
      )}

    </div>
  );
}
