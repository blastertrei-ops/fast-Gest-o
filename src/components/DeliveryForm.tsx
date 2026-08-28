/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Users, Loader2, Calendar, Clock, AlertCircle, 
  MapPin, Truck, Receipt, FileText, Sliders 
} from 'lucide-react';
import { 
  Empresa, DeliveryFormConfig, Entrega, Motorista, Usuario, 
  FormaPagamento, StatusPagamento, CustomFieldType, ClienteInfo, EnderecoInfo 
} from '../types';
import CepInput from './CepInput';
import { DEFAULT_DELIVERY_FORM_CONFIG } from './DeliveryFormConfigPanel';

export interface DeliveryFormValues {
  numeroNF: string;
  numeroPedido?: string;
  cliente: ClienteInfo;
  endereco: EnderecoInfo;
  volumes: number;
  valorVenda: number;
  valorFrete?: number;
  formaPagamento: FormaPagamento;
  statusPagamento: StatusPagamento;
  motoristaId?: string;
  dataEntregaPrevista: string;
  horaEntregaPrevista?: string;
  isAgendada?: boolean;
  prioridade: 'alta' | 'media' | 'baixa';
  observacoes?: string;
  customValues?: Record<string, any>;
}

export interface DeliveryFormProps {
  config?: DeliveryFormConfig;
  company?: Empresa;
  initialValues?: Partial<Entrega> | null;
  availableDrivers?: Motorista[];
  users?: Usuario[];
  onSubmit?: (values: DeliveryFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  isPreview?: boolean;
  onNavigateToDrivers?: () => void;
}

type RenderableField =
  | { kind: 'standard'; id: string; label: string; required: boolean; enabled: boolean; order: number }
  | { kind: 'custom'; id: string; label: string; type: CustomFieldType; options?: string[]; required: boolean; enabled: boolean; order: number; placeholder?: string };

export default function DeliveryForm({
  config,
  company,
  initialValues,
  availableDrivers = [],
  users = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Cadastrar Entrega',
  isPreview = false,
  onNavigateToDrivers
}: DeliveryFormProps) {
  // Resolve configuration from prop or company with fallback
  const activeFormConfig: DeliveryFormConfig = useMemo(() => {
    const raw = config || company?.deliveryFormConfig || DEFAULT_DELIVERY_FORM_CONFIG;
    if (raw.standardFields && raw.standardFields.length > 0) {
      const existingIds = new Set(raw.standardFields.map(f => f.id));
      const missingStandard = DEFAULT_DELIVERY_FORM_CONFIG.standardFields
        .filter(f => !existingIds.has(f.id))
        .map((f, i) => ({ ...f, order: raw.standardFields.length + i + 1 }));

      return {
        standardFields: [...raw.standardFields, ...missingStandard].sort((a, b) => a.order - b.order),
        customFields: (raw.customFields || []).sort((a, b) => a.order - b.order)
      };
    }
    return DEFAULT_DELIVERY_FORM_CONFIG;
  }, [config, company?.deliveryFormConfig]);

  // Combine enabled fields sorted by order
  const sortedFormFields = useMemo<RenderableField[]>(() => {
    const fields: RenderableField[] = [];

    activeFormConfig.standardFields.forEach(f => {
      if (f.enabled) {
        fields.push({
          kind: 'standard',
          id: f.id,
          label: f.label,
          required: f.required,
          enabled: true,
          order: f.order
        });
      }
    });

    (activeFormConfig.customFields || []).forEach(f => {
      if (f.enabled !== false) {
        fields.push({
          kind: 'custom',
          id: f.id,
          label: f.label,
          type: f.type,
          options: f.options,
          required: f.required,
          enabled: true,
          order: f.order,
          placeholder: f.placeholder
        });
      }
    });

    return fields.sort((a, b) => a.order - b.order);
  }, [activeFormConfig]);

  const isEnabled = (id: string) => sortedFormFields.some(f => f.id === id && f.enabled);
  const isRequired = (id: string) => sortedFormFields.some(f => f.id === id && f.required);
  const getLabel = (id: string, fallback: string) => sortedFormFields.find(f => f.id === id)?.label || fallback;

  const customFields = useMemo(() => {
    return sortedFormFields.filter((f): f is Extract<RenderableField, { kind: 'custom' }> => f.kind === 'custom');
  }, [sortedFormFields]);

  // Form Field States
  const [numeroNF, setNumeroNF] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');
  const [cep, setCep] = useState('');
  const [complemento, setComplemento] = useState('');
  const [volumes, setVolumes] = useState<number>(1);
  const [valorVenda, setValorVenda] = useState('');
  const [valorFrete, setValorFrete] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('ja_pago');
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>('pago');
  const [dataEntregaPrevista, setDataEntregaPrevista] = useState(() => new Date().toISOString().split('T')[0]);
  const [horaEntregaPrevista, setHoraEntregaPrevista] = useState('');
  const [isAgendada, setIsAgendada] = useState(false);
  const [prioridade, setPrioridade] = useState<'alta' | 'media' | 'baixa'>('media');
  const [motoristaId, setMotoristaId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Initialize or update fields when initialValues changes
  useEffect(() => {
    if (initialValues) {
      setNumeroNF(initialValues.numeroNF || '');
      setNumeroPedido(initialValues.numeroPedido || '');
      setClientName(initialValues.cliente?.nome || '');
      setClientPhone(initialValues.cliente?.telefone || '');
      setClientWhatsapp(initialValues.cliente?.whatsapp || '');
      setClientDoc(initialValues.cliente?.documento || '');
      
      const addrRuaNum = initialValues.endereco?.ruaNumero || '';
      if (initialValues.endereco?.numero) {
        setRua(addrRuaNum.replace(`, ${initialValues.endereco.numero}`, '').trim());
        setNumero(initialValues.endereco.numero);
      } else {
        setRua(addrRuaNum);
        setNumero('');
      }

      setBairro(initialValues.endereco?.bairro || '');
      setCidade(initialValues.endereco?.cidade || '');
      setEstado(initialValues.endereco?.estado || 'SP');
      setCep(initialValues.endereco?.cep || '');
      setComplemento(initialValues.endereco?.complemento || '');

      setVolumes(initialValues.volumes || 1);
      setValorVenda(initialValues.valorVenda !== undefined ? String(initialValues.valorVenda) : '');
      setValorFrete(initialValues.valorFrete !== undefined ? String(initialValues.valorFrete) : '');
      setFormaPagamento(initialValues.formaPagamento || 'ja_pago');
      setStatusPagamento(initialValues.statusPagamento || 'pago');

      setDataEntregaPrevista(initialValues.dataEntregaPrevista || new Date().toISOString().split('T')[0]);
      setHoraEntregaPrevista(initialValues.horaEntregaPrevista || '');
      setIsAgendada(initialValues.isAgendada || false);
      setPrioridade(initialValues.prioridade || 'media');
      setMotoristaId(initialValues.motoristaId || initialValues.entregadorId || '');
      setObservacoes(initialValues.observacoes || '');
      setCustomValues(initialValues.customValues || {});
    }
  }, [initialValues]);

  // Dynamic Validation Function
  const validateForm = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];

    sortedFormFields.forEach(field => {
      if (!field.enabled) return;

      if (field.required) {
        if (field.kind === 'standard') {
          switch (field.id) {
            case 'cliente':
              if (!clientName.trim()) missingFields.push(field.label || 'Nome do Cliente');
              break;
            case 'telefone':
              if (!clientPhone.trim() && !clientWhatsapp.trim()) {
                missingFields.push(field.label || 'Telefone / WhatsApp');
              }
              break;
            case 'rua':
              if (!rua.trim()) missingFields.push(field.label || 'Endereço (Rua e Nº)');
              break;
            case 'bairro':
              if (!bairro.trim()) missingFields.push(field.label || 'Bairro');
              break;
            case 'cidade':
              if (!cidade.trim()) missingFields.push(field.label || 'Cidade');
              break;
            case 'cep':
              if (!cep.trim()) missingFields.push(field.label || 'CEP');
              break;
            case 'numeroPedido':
              if (!numeroPedido.trim()) missingFields.push(field.label || 'Número do Pedido');
              break;
            case 'numeroNF':
              if (!numeroNF.trim()) missingFields.push(field.label || 'Nota Fiscal / Identificador');
              break;
            case 'valorVenda':
              if (!valorVenda.toString().trim()) missingFields.push(field.label || 'Valor da Venda');
              break;
            case 'formaPagamento':
              if (!formaPagamento) missingFields.push(field.label || 'Forma de Pagamento');
              break;
            case 'volumes':
              if (!volumes || volumes < 1) missingFields.push(field.label || 'Volumes / Pacotes');
              break;
            case 'observacoes':
              if (!observacoes.trim()) missingFields.push(field.label || 'Observações');
              break;
          }
        } else if (field.kind === 'custom') {
          const val = customValues[field.id];
          if (val === undefined || val === null || val === '' || (field.type === 'checkbox' && !val)) {
            missingFields.push(field.label);
          }
        }
      }
    });

    return { isValid: missingFields.length === 0, missingFields };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) return;

    const { isValid, missingFields } = validateForm();
    if (!isValid) {
      alert(`Por favor preencha os campos obrigatórios: ${missingFields.join(', ')}.`);
      return;
    }

    const numericValor = parseFloat(valorVenda.toString().replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
    const numericFrete = valorFrete ? (parseFloat(valorFrete.toString().replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0) : 0;

    const finalRua = rua.trim() || 'Rua sem nome';
    const finalNumero = numero.trim() || 'S/N';
    const finalBairro = bairro.trim() || 'Centro';
    const finalCidade = cidade.trim() || 'São Paulo';
    const finalCEP = cep.trim() || '00000-000';

    const formattedValues: DeliveryFormValues = {
      numeroNF: numeroNF.trim() || `NF-${Date.now().toString().slice(-6)}`,
      numeroPedido: numeroPedido.trim() || undefined,
      cliente: {
        nome: clientName.trim() || 'Cliente Não Informado',
        telefone: clientPhone.trim() || 'Sem telefone',
        whatsapp: clientWhatsapp.trim() || undefined,
        documento: clientDoc.trim() || undefined,
      },
      endereco: {
        ruaNumero: `${finalRua}, ${finalNumero}`,
        numero: finalNumero,
        bairro: finalBairro,
        cidade: finalCidade,
        estado: estado || 'SP',
        cep: finalCEP,
        complemento: complemento.trim() || undefined,
        latitude: initialValues?.endereco?.latitude || -23.55052,
        longitude: initialValues?.endereco?.longitude || -46.633308,
      },
      volumes: Number(volumes) || 1,
      valorVenda: numericValor,
      valorFrete: numericFrete,
      formaPagamento,
      statusPagamento,
      motoristaId: motoristaId || undefined,
      dataEntregaPrevista: dataEntregaPrevista || new Date().toISOString().split('T')[0],
      horaEntregaPrevista: horaEntregaPrevista || undefined,
      isAgendada: isAgendada || (dataEntregaPrevista > new Date().toISOString().split('T')[0]),
      prioridade,
      observacoes: observacoes.trim() || undefined,
      customValues: Object.keys(customValues).length > 0 ? customValues : undefined,
    };

    if (onSubmit) {
      await onSubmit(formattedValues);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 📦 CARD 1: DADOS DO CLIENTE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Dados do Cliente</h3>
            <p className="text-[11px] text-slate-500">Informações do comprador e identificadores do pedido</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome do Cliente */}
          {isEnabled('cliente') && (
            <div className="md:col-span-2 space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('cliente', 'Nome do Cliente')} {isRequired('cliente') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <input
                type="text"
                disabled={isPreview}
                required={isRequired('cliente')}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome completo do comprador"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          )}

          {/* Telefone e Whatsapp */}
          {isEnabled('telefone') && (
            <>
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold text-xs">
                  Telefone Celular {isRequired('telefone') && <span className="text-amber-500 font-bold">*</span>}
                </label>
                <input
                  type="text"
                  disabled={isPreview}
                  required={isRequired('telefone')}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(ex: 11 99999-9999)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold text-xs">
                  WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  disabled={isPreview}
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  placeholder="WhatsApp para notificações"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
                />
              </div>
            </>
          )}

          {/* Documento (CPF/CNPJ) */}
          <div className="space-y-1">
            <label className="block text-slate-600 font-semibold text-xs">
              CPF / CNPJ (Opcional)
            </label>
            <input
              type="text"
              disabled={isPreview}
              value={clientDoc}
              onChange={(e) => setClientDoc(e.target.value)}
              placeholder="Documento do cliente"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Nota Fiscal */}
          {isEnabled('numeroNF') && (
            <div className="space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('numeroNF', 'Nota Fiscal / Identificador')} {isRequired('numeroNF') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <input
                type="text"
                disabled={isPreview}
                required={isRequired('numeroNF')}
                value={numeroNF}
                onChange={(e) => setNumeroNF(e.target.value)}
                placeholder="Ex: 001.245-A"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          )}

          {/* Número do Pedido */}
          {isEnabled('numeroPedido') && (
            <div className="space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('numeroPedido', 'Número do Pedido')} {isRequired('numeroPedido') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <input
                type="text"
                disabled={isPreview}
                required={isRequired('numeroPedido')}
                value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value)}
                placeholder="Ex: PD-89542"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* 📍 CARD 2: ENDEREÇO DE ENTREGA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Endereço de Entrega</h3>
            <p className="text-[11px] text-slate-500">Local de destino com preenchimento automático via CEP</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CEP */}
          {isEnabled('cep') && (
            <div className="md:col-span-1 space-y-1">
              {isPreview ? (
                <div>
                  <label className="block text-slate-600 font-semibold text-xs mb-1.5">
                    {getLabel('cep', 'CEP')} {isRequired('cep') && <span className="text-amber-500 font-bold">*</span>}
                  </label>
                  <input
                    type="text"
                    disabled
                    placeholder="00000-000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 h-12 text-slate-900 text-xs font-semibold opacity-75"
                  />
                </div>
              ) : (
                <CepInput
                  label={getLabel('cep', 'CEP')}
                  required={isRequired('cep')}
                  value={cep}
                  onChange={setCep}
                  targetNumeroInputId="deliveryFormNumero"
                  onAddressFound={(addr) => {
                    if (addr.rua) setRua(addr.rua);
                    if (addr.bairro) setBairro(addr.bairro);
                    if (addr.cidade) setCidade(addr.cidade);
                    if (addr.estado) setEstado(addr.estado);
                    if (addr.complemento) setComplemento(addr.complemento);
                  }}
                />
              )}
            </div>
          )}

          {/* Logradouro / Rua */}
          {isEnabled('rua') && (
            <div className="md:col-span-2 space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('rua', 'Endereço (Rua e Logradouro)')} {isRequired('rua') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <input
                type="text"
                disabled={isPreview}
                required={isRequired('rua')}
                value={rua}
                onChange={(e) => setRua(e.target.value)}
                placeholder="Logradouro / Avenida / Rua"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          )}

          {/* Número */}
          <div className="space-y-1">
            <label className="block text-slate-600 font-semibold text-xs">
              Número <span className="text-amber-500 font-bold">*</span>
            </label>
            <input
              id="deliveryFormNumero"
              name="numero"
              type="text"
              disabled={isPreview}
              required
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Nº (Ex: 123)"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Bairro */}
          {isEnabled('bairro') && (
            <div className="space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('bairro', 'Bairro')} {isRequired('bairro') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <input
                type="text"
                disabled={isPreview}
                required={isRequired('bairro')}
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          )}

          {/* Cidade */}
          {isEnabled('cidade') && (
            <div className="space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('cidade', 'Cidade')} {isRequired('cidade') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <input
                type="text"
                disabled={isPreview}
                required={isRequired('cidade')}
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          )}

          {/* Estado & Complemento */}
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">Estado (UF)</label>
              <input
                type="text"
                disabled={isPreview}
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                placeholder="SP"
                maxLength={2}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm uppercase transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">Complemento (Opcional)</label>
              <input
                type="text"
                disabled={isPreview}
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Apto, Bloco, Referência..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🚚 CARD 3: ENTREGA & AGENDAMENTO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Entrega & Agendamento</h3>
            <p className="text-[11px] text-slate-500">Prazos de entrega, prioridade e designação de entregador</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data Prevista */}
          <div className="space-y-1">
            <label className="block text-slate-600 font-semibold text-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Data Prevista <span className="text-amber-500 font-bold">*</span>
            </label>
            <input
              type="date"
              disabled={isPreview}
              required
              value={dataEntregaPrevista}
              onChange={(e) => setDataEntregaPrevista(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Hora Estimada */}
          <div className="space-y-1">
            <label className="block text-slate-600 font-semibold text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Hora Estimada (Opcional)
            </label>
            <input
              type="time"
              disabled={isPreview}
              value={horaEntregaPrevista}
              onChange={(e) => setHoraEntregaPrevista(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Prioridade */}
          <div className="space-y-1">
            <label className="block text-slate-600 font-semibold text-xs">Prioridade</label>
            <select
              disabled={isPreview}
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none cursor-pointer disabled:opacity-75 text-xs sm:text-sm transition-all"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta / Urgente</option>
            </select>
          </div>

          {/* Checkbox Agendada */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2.5 text-xs text-slate-800 font-bold cursor-pointer bg-slate-50 hover:bg-amber-50/50 p-3 rounded-xl border border-slate-300 hover:border-amber-500 transition-all h-12">
              <input
                type="checkbox"
                disabled={isPreview}
                checked={isAgendada}
                onChange={(e) => setIsAgendada(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4 disabled:opacity-75 cursor-pointer"
              />
              <span>Entrega Agendada</span>
            </label>
          </div>

          {/* Escalar Motorista */}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-slate-600 font-semibold text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-500" />
              Escalar Motorista / Entregador
            </label>
            <select
              disabled={isPreview}
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-amber-700 font-extrabold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none cursor-pointer disabled:opacity-75 text-xs sm:text-sm transition-all"
            >
              <option value="">Não designar motorista agora</option>
              {availableDrivers.map(drv => (
                <option key={drv.id} value={drv.id}>{drv.nome} ({drv.telefone || 'Sem tel'})</option>
              ))}
            </select>
            {!isPreview && availableDrivers.length === 0 && onNavigateToDrivers && (
              <div className="flex items-center justify-between gap-2 mt-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs font-medium">
                <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> Nenhum entregador cadastrado.</span>
                <button
                  type="button"
                  onClick={onNavigateToDrivers}
                  className="underline font-bold text-amber-900 hover:text-amber-600"
                >
                  + Cadastrar Entregador
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 💰 CARD 4: FINANCEIRO & VOLUMES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Financeiro & Volumes</h3>
            <p className="text-[11px] text-slate-500">Valores, pagamento e quantidade de volumes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Valor Venda */}
          {isEnabled('valorVenda') && (
            <div className="space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('valorVenda', 'Valor da Venda')} {isRequired('valorVenda') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <input
                type="text"
                disabled={isPreview}
                required={isRequired('valorVenda')}
                value={valorVenda}
                onChange={(e) => setValorVenda(e.target.value)}
                placeholder="R$ 0,00"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          )}

          {/* Valor Frete */}
          <div className="space-y-1">
            <label className="block text-slate-600 font-semibold text-xs">Valor do Frete (Opcional)</label>
            <input
              type="text"
              disabled={isPreview}
              value={valorFrete}
              onChange={(e) => setValorFrete(e.target.value)}
              placeholder="R$ 0,00"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
            />
          </div>

          {/* Forma de Pagamento */}
          {isEnabled('formaPagamento') && (
            <>
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold text-xs">
                  Forma de Pagamento {isRequired('formaPagamento') && <span className="text-amber-500 font-bold">*</span>}
                </label>
                <select
                  disabled={isPreview}
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none cursor-pointer disabled:opacity-75 text-xs sm:text-sm transition-all"
                >
                  <option value="ja_pago">Já Pago no Site/Loja</option>
                  <option value="pix">PIX na entrega</option>
                  <option value="dinheiro">Dinheiro na entrega</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold text-xs">Status do Pagamento</label>
                <select
                  disabled={isPreview}
                  value={statusPagamento}
                  onChange={(e) => setStatusPagamento(e.target.value as StatusPagamento)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none cursor-pointer disabled:opacity-75 text-xs sm:text-sm transition-all"
                >
                  <option value="pago">PAGO (Já liquidado)</option>
                  <option value="receber_na_entrega">RECEBER NA ENTREGA</option>
                </select>
              </div>
            </>
          )}

          {/* Volumes */}
          {isEnabled('volumes') && (
            <div className="space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('volumes', 'Volumes / Pacotes')} {isRequired('volumes') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <input
                type="number"
                disabled={isPreview}
                required={isRequired('volumes')}
                min="1"
                value={volumes}
                onChange={(e) => setVolumes(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* 📝 CARD 5: OBSERVAÇÕES & OUTROS CAMPOS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Observações & Instruções</h3>
            <p className="text-[11px] text-slate-500">Observações de entrega e campos personalizados</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Observações */}
          {isEnabled('observacoes') && (
            <div className="space-y-1">
              <label className="block text-slate-600 font-semibold text-xs">
                {getLabel('observacoes', 'Observações / Instruções para o Entregador')} {isRequired('observacoes') && <span className="text-amber-500 font-bold">*</span>}
              </label>
              <textarea
                rows={3}
                disabled={isPreview}
                required={isRequired('observacoes')}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Digite orientações ou pontos de referência para o entregador..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 font-medium placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all resize-none min-h-[88px]"
              />
            </div>
          )}

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                Campos Personalizados
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-600 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500 font-bold">*</span>}
                    </label>
                    {field.type === 'lista' ? (
                      <select
                        disabled={isPreview}
                        value={customValues[field.id] || ''}
                        onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                        required={field.required}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none cursor-pointer disabled:opacity-75 text-xs sm:text-sm transition-all"
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <label className="flex items-center gap-2.5 text-xs text-slate-800 font-bold cursor-pointer bg-slate-50 hover:bg-amber-50/50 p-3 rounded-xl border border-slate-300 hover:border-amber-500 transition-all h-12">
                        <input
                          type="checkbox"
                          disabled={isPreview}
                          checked={!!customValues[field.id]}
                          onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.checked })}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4 disabled:opacity-75 cursor-pointer"
                        />
                        <span>{field.label}</span>
                      </label>
                    ) : (
                      <input
                        type={field.type === 'numero' ? 'number' : field.type === 'data' ? 'date' : 'text'}
                        disabled={isPreview}
                        value={customValues[field.id] || ''}
                        onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                        required={field.required}
                        placeholder={field.placeholder || `Preencha ${field.label.toLowerCase()}`}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 h-12 text-slate-900 font-semibold placeholder:text-slate-400 hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 focus:outline-none disabled:opacity-75 text-xs sm:text-sm transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isPreview && (
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 h-12 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 h-12 bg-[#F59E0B] text-slate-950 hover:bg-amber-600 font-extrabold disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              submitButtonText || 'Cadastrar Entrega'
            )}
          </button>
        </div>
      )}
    </form>
  );
}
