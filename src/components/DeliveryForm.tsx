/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Package, Users, Loader2, Calendar, Clock, AlertCircle } from 'lucide-react';
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
  submitButtonText = 'Salvar Entrega',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Dynamic Ordered Fields */}
      <div className="space-y-4 text-xs">
        {sortedFormFields.map((field) => {
          if (field.kind === 'standard') {
            switch (field.id) {
              case 'cliente':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isPreview}
                      required={field.required}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome completo do comprador"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                    />
                  </div>
                );

              case 'telefone':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        disabled={isPreview}
                        required={field.required}
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Telefone Celular (ex: 11 99999-9999)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                      />
                      <input
                        type="text"
                        disabled={isPreview}
                        value={clientWhatsapp}
                        onChange={(e) => setClientWhatsapp(e.target.value)}
                        placeholder="WhatsApp (Opcional)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                      />
                    </div>
                  </div>
                );

              case 'rua':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      <div className="col-span-2 md:col-span-3">
                        <input
                          type="text"
                          disabled={isPreview}
                          required={field.required}
                          value={rua}
                          onChange={(e) => setRua(e.target.value)}
                          placeholder="Logradouro / Avenida / Rua"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                        />
                      </div>
                      <div>
                        <input
                          id="deliveryFormNumero"
                          name="numero"
                          type="text"
                          disabled={isPreview}
                          required={field.required}
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          placeholder="Número"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                        />
                      </div>
                    </div>
                  </div>
                );

              case 'bairro':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isPreview}
                      required={field.required}
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Bairro"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                    />
                  </div>
                );

              case 'cidade':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        disabled={isPreview}
                        required={field.required}
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Cidade"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                      />
                      <input
                        type="text"
                        disabled={isPreview}
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        placeholder="Complemento / Apto / Bloco (Opcional)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                      />
                    </div>
                  </div>
                );

              case 'cep':
                return (
                  <div key={field.id} className="space-y-1">
                    {isPreview ? (
                      <div>
                        <label className="block text-slate-300 font-semibold text-xs mb-1">
                          {field.label} {field.required && <span className="text-amber-500">*</span>}
                        </label>
                        <input
                          type="text"
                          disabled
                          placeholder="00000-000"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs opacity-75"
                        />
                      </div>
                    ) : (
                      <CepInput
                        label={field.label}
                        required={field.required}
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
                );

              case 'numeroPedido':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isPreview}
                      required={field.required}
                      value={numeroPedido}
                      onChange={(e) => setNumeroPedido(e.target.value)}
                      placeholder="Ex: PD-89542"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                    />
                  </div>
                );

              case 'numeroNF':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isPreview}
                      required={field.required}
                      value={numeroNF}
                      onChange={(e) => setNumeroNF(e.target.value)}
                      placeholder="Ex: 001.245-A"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                    />
                  </div>
                );

              case 'valorVenda':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        disabled={isPreview}
                        required={field.required}
                        value={valorVenda}
                        onChange={(e) => setValorVenda(e.target.value)}
                        placeholder="Valor R$ 150,00"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                      />
                      <input
                        type="text"
                        disabled={isPreview}
                        value={valorFrete}
                        onChange={(e) => setValorFrete(e.target.value)}
                        placeholder="Frete R$ (Opcional)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                      />
                    </div>
                  </div>
                );

              case 'formaPagamento':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <select
                        disabled={isPreview}
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-75"
                      >
                        <option value="ja_pago">Já Pago no Site/Loja</option>
                        <option value="pix">PIX na entrega</option>
                        <option value="dinheiro">Dinheiro na entrega</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                      </select>
                      <select
                        disabled={isPreview}
                        value={statusPagamento}
                        onChange={(e) => setStatusPagamento(e.target.value as StatusPagamento)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-75"
                      >
                        <option value="pago">PAGO (Já liquidado)</option>
                        <option value="receber_na_entrega">RECEBER NA ENTREGA</option>
                      </select>
                    </div>
                  </div>
                );

              case 'volumes':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <input
                      type="number"
                      disabled={isPreview}
                      required={field.required}
                      min="1"
                      value={volumes}
                      onChange={(e) => setVolumes(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                    />
                  </div>
                );

              case 'observacoes':
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-slate-300 font-semibold text-xs">
                      {field.label} {field.required && <span className="text-amber-500">*</span>}
                    </label>
                    <textarea
                      rows={2}
                      disabled={isPreview}
                      required={field.required}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Instruções para o entregador..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75 resize-none"
                    />
                  </div>
                );

              default:
                return null;
            }
          } else {
            return (
              <div key={field.id} className="space-y-1">
                <label className="block text-amber-400 font-semibold text-xs flex items-center gap-1">
                  {field.label} {field.required && <span className="text-amber-500">*</span>}
                </label>
                {field.type === 'lista' ? (
                  <select
                    disabled={isPreview}
                    value={customValues[field.id] || ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                    required={field.required}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-75"
                  >
                    <option value="">Selecione...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-xs text-slate-300 font-bold cursor-pointer bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <input
                      type="checkbox"
                      disabled={isPreview}
                      checked={!!customValues[field.id]}
                      onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 h-4 w-4 disabled:opacity-75"
                    />
                    {field.label}
                  </label>
                ) : (
                  <input
                    type={field.type === 'numero' ? 'number' : field.type === 'data' ? 'date' : 'text'}
                    disabled={isPreview}
                    value={customValues[field.id] || ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                    required={field.required}
                    placeholder={field.placeholder || `Preencha ${field.label.toLowerCase()}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  />
                )}
              </div>
            );
          }
        })}

        {/* Operational / Dispatch Fields (System standard block) */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h4 className="font-bold text-amber-500 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Agendamento & Designação de Motorista
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Data Prevista *
              </label>
              <input
                type="date"
                disabled={isPreview}
                required
                value={dataEntregaPrevista}
                onChange={(e) => setDataEntregaPrevista(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-bold text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
              />
            </div>

            <div className="flex flex-col justify-end pb-0.5">
              <label className="flex items-center gap-2 text-xs text-slate-300 font-bold cursor-pointer bg-slate-900 p-2.5 rounded-lg border border-slate-800 hover:border-amber-500/50">
                <input
                  type="checkbox"
                  disabled={isPreview}
                  checked={isAgendada}
                  onChange={(e) => setIsAgendada(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 h-4 w-4 disabled:opacity-75"
                />
                Entrega Agendada
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-xs">Prioridade</label>
              <select
                disabled={isPreview}
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700/80 hover:border-amber-500 rounded-lg p-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer text-xs disabled:opacity-75"
              >
                <option value="baixa" className="bg-slate-900 text-slate-300">Baixa</option>
                <option value="media" className="bg-slate-900 text-white">Média</option>
                <option value="alta" className="bg-slate-900 text-red-400">Alta / Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Hora Estimada
              </label>
              <input
                type="time"
                disabled={isPreview}
                value={horaEntregaPrevista}
                onChange={(e) => setHoraEntregaPrevista(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-75"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold text-xs flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-500" />
              Escalar Motorista / Entregador
            </label>
            <select
              disabled={isPreview}
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500 cursor-pointer text-xs disabled:opacity-75"
            >
              <option value="">Não designar motorista agora</option>
              {availableDrivers.map(drv => (
                <option key={drv.id} value={drv.id}>{drv.nome} ({drv.telefone || 'Sem tel'})</option>
              ))}
            </select>
            {!isPreview && availableDrivers.length === 0 && onNavigateToDrivers && (
              <div className="flex items-center justify-between gap-2 mt-2 p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-400 text-xs">
                <span>⚠️ Nenhum entregador cadastrado.</span>
                <button
                  type="button"
                  onClick={onNavigateToDrivers}
                  className="underline font-bold hover:text-white"
                >
                  + Cadastrar Entregador
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isPreview && (
        <div className="border-t border-slate-800 pt-4 flex justify-end gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors"
            >
              Voltar / Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-500/10"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gravando...
              </>
            ) : (
              submitButtonText
            )}
          </button>
        </div>
      )}
    </form>
  );
}
