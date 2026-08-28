/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, Plus, Trash2, ArrowUp, ArrowDown, Eye, Check, X, 
  AlignLeft, Hash, List, Calendar, DollarSign, CheckSquare, QrCode, Code, Save, RefreshCw
} from 'lucide-react';
import { Empresa, DeliveryFormConfig, StandardFieldConfig, CustomFieldConfig, CustomFieldType } from '../types';
import { Database } from '../lib/db';
import DeliveryForm from './DeliveryForm';

export const DEFAULT_DELIVERY_FORM_CONFIG: DeliveryFormConfig = {
  standardFields: [
    { id: 'cliente', label: 'Nome do Cliente', required: true, enabled: true, order: 1 },
    { id: 'telefone', label: 'Telefone / WhatsApp', required: true, enabled: true, order: 2 },
    { id: 'rua', label: 'Endereço (Rua e Nº)', required: true, enabled: true, order: 3 },
    { id: 'bairro', label: 'Bairro', required: true, enabled: true, order: 4 },
    { id: 'cidade', label: 'Cidade', required: true, enabled: true, order: 5 },
    { id: 'cep', label: 'CEP', required: false, enabled: true, order: 6 },
    { id: 'numeroPedido', label: 'Número do Pedido', required: false, enabled: true, order: 7 },
    { id: 'numeroNF', label: 'Nota Fiscal / Identificador', required: true, enabled: true, order: 8 },
    { id: 'valorVenda', label: 'Valor da Venda', required: true, enabled: true, order: 9 },
    { id: 'formaPagamento', label: 'Forma de Pagamento', required: true, enabled: true, order: 10 },
    { id: 'volumes', label: 'Volumes / Pacotes', required: true, enabled: true, order: 11 },
    { id: 'observacoes', label: 'Observações / Instruções', required: false, enabled: true, order: 12 },
  ],
  customFields: []
};

interface DeliveryFormConfigPanelProps {
  company: Empresa;
  onUpdateCompany?: (updated: Empresa) => void;
  onSave?: (config: DeliveryFormConfig) => Promise<void> | void;
}

export default function DeliveryFormConfigPanel({ company, onUpdateCompany, onSave }: DeliveryFormConfigPanelProps) {
  const [config, setConfig] = useState<DeliveryFormConfig>(() => {
    if (company?.deliveryFormConfig && company.deliveryFormConfig.standardFields?.length) {
      return company.deliveryFormConfig;
    }
    return DEFAULT_DELIVERY_FORM_CONFIG;
  });

  React.useEffect(() => {
    if (company?.deliveryFormConfig && company.deliveryFormConfig.standardFields?.length) {
      setConfig(company.deliveryFormConfig);
    }
  }, [company?.deliveryFormConfig]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Custom Field Modal state
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomType, setNewCustomType] = useState<CustomFieldType>('texto');
  const [newCustomRequired, setNewCustomRequired] = useState(false);
  const [newCustomPlaceholder, setNewCustomPlaceholder] = useState('');
  const [newCustomOptions, setNewCustomOptions] = useState('');

  // Toggle Standard Field Enabled
  const handleToggleStandardEnabled = (id: string) => {
    setConfig(prev => ({
      ...prev,
      standardFields: prev.standardFields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f)
    }));
  };

  // Toggle Standard Field Required
  const handleToggleStandardRequired = (id: string) => {
    setConfig(prev => ({
      ...prev,
      standardFields: prev.standardFields.map(f => f.id === id ? { ...f, required: !f.required } : f)
    }));
  };

  // Standard Field Label change
  const handleStandardLabelChange = (id: string, newLabel: string) => {
    setConfig(prev => ({
      ...prev,
      standardFields: prev.standardFields.map(f => f.id === id ? { ...f, label: newLabel } : f)
    }));
  };

  // Reorder Standard Fields
  const handleMoveStandard = (index: number, direction: 'up' | 'down') => {
    const newFields = [...config.standardFields];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newFields.length) return;

    const temp = newFields[index];
    newFields[index] = newFields[targetIdx];
    newFields[targetIdx] = temp;

    // re-assign order numbers
    newFields.forEach((f, i) => { f.order = i + 1; });
    setConfig(prev => ({ ...prev, standardFields: newFields }));
  };

  // Add Custom Field
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomLabel.trim()) return;

    const optionsArray = newCustomType === 'lista' 
      ? newCustomOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const newField: CustomFieldConfig = {
      id: 'cf_' + Date.now(),
      label: newCustomLabel.trim(),
      type: newCustomType,
      options: optionsArray,
      required: newCustomRequired,
      enabled: true,
      order: config.customFields.length + 1,
      placeholder: newCustomPlaceholder.trim() || undefined
    };

    setConfig(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField]
    }));

    setNewCustomLabel('');
    setNewCustomType('texto');
    setNewCustomRequired(false);
    setNewCustomPlaceholder('');
    setNewCustomOptions('');
    setShowAddCustomModal(false);
  };

  // Remove Custom Field
  const handleRemoveCustomField = (id: string) => {
    setConfig(prev => ({
      ...prev,
      customFields: prev.customFields.filter(f => f.id !== id)
    }));
  };

  // Save config to database
  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (onSave) {
        await onSave(config);
      } else {
        await Database.updateCompanyFormConfig(company.id, config);
      }
      if (onUpdateCompany) {
        onUpdateCompany({
          ...company,
          deliveryFormConfig: config
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configuração do formulário:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Icon selector by field type
  const getTypeIcon = (type: CustomFieldType) => {
    switch (type) {
      case 'texto': return <AlignLeft className="w-4 h-4 text-amber-400" />;
      case 'numero': return <Hash className="w-4 h-4 text-blue-400" />;
      case 'lista': return <List className="w-4 h-4 text-emerald-400" />;
      case 'data': return <Calendar className="w-4 h-4 text-purple-400" />;
      case 'moeda': return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'checkbox': return <CheckSquare className="w-4 h-4 text-indigo-400" />;
      case 'qrcode': return <QrCode className="w-4 h-4 text-amber-400" />;
      case 'codigo_interno': return <Code className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Configuração do Formulário de Entrega — {company.nome}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Personalize quais campos aparecem ao criar ou editar uma entrega. Ative, reordene, torne obrigatório ou adicione novos campos personalizados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfig(DEFAULT_DELIVERY_FORM_CONFIG)}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            title="Restaurar padrão"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Restaurar Padrão
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? 'Configuração Salva!' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* 70% / 30% LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (70%): STANDARD & CUSTOM FIELDS SETTINGS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* STANDARD FIELDS */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-amber-500" />
                Campos Padrões do Sistema ({config.standardFields.length})
              </h3>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                Exibição dinâmica
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {config.standardFields.map((field, idx) => (
                <div 
                  key={field.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    field.enabled ? 'bg-slate-50/80 border-slate-200/80' : 'bg-slate-50/30 border-slate-100 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveStandard(idx, 'up')}
                        disabled={idx === 0}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5 transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveStandard(idx, 'down')}
                        disabled={idx === config.standardFields.length - 1}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5 transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleStandardLabelChange(field.id, e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 flex-1 min-w-0"
                    />
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Required Checkbox */}
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={() => handleToggleStandardRequired(field.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 bg-white"
                      />
                      <span className={field.required ? 'font-bold text-amber-700' : 'text-slate-500 font-medium'}>
                        Obrigatório
                      </span>
                    </label>

                    {/* Enabled/Visible Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStandardEnabled(field.id)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                        field.enabled 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      {field.enabled ? 'Visível' : 'Oculto'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CUSTOM FIELDS */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-500" />
                  Campos Personalizados ({config.customFields.length})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Adicione novos campos (produto, peso, QR code, código interno, etc.)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomModal(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Campo
              </button>
            </div>

            {config.customFields.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-500 text-xs font-medium">
                Nenhum campo personalizado cadastrado. Clique no botão acima para criar o seu próprio formulário.
              </div>
            ) : (
              <div className="space-y-2">
                {config.customFields.map((field) => (
                  <div key={field.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 shrink-0">
                        {getTypeIcon(field.type)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block truncate">{field.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Tipo: {field.type} {field.options ? `(${field.options.join(', ')})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {field.required && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-bold border border-amber-200">
                          Obrigatório
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remover campo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (30%): REAL-TIME SMARTPHONE PREVIEW */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500" />
                Preview em Tempo Real
              </h3>
              <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                Ao Vivo
              </span>
            </div>

            {/* SMARTPHONE FRAME CONTAINER */}
            <div className="mx-auto max-w-[320px] bg-slate-900 rounded-[32px] p-3 shadow-2xl border-4 border-slate-800 relative">
              {/* Phone Speaker/Camera Notch */}
              <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
              </div>

              {/* Screen Content */}
              <div className="bg-white rounded-[20px] p-3 space-y-3 text-xs max-h-[520px] overflow-y-auto text-slate-800 border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-900 text-[11px] truncate">Nova Entrega</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                    {company.nome}
                  </span>
                </div>

                <DeliveryForm
                  config={config}
                  company={company}
                  isPreview={true}
                />
              </div>

              {/* Phone Home Bar */}
              <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2"></div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD CUSTOM FIELD */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-1 bg-amber-500/10 text-amber-600 rounded-lg">
                <Plus className="w-4 h-4 text-amber-600" />
              </div>
              Adicionar Campo Personalizado
            </h3>

            <form onSubmit={handleAddCustomField} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nome do Campo (Rótulo) *</label>
                <input
                  type="text"
                  required
                  value={newCustomLabel}
                  onChange={(e) => setNewCustomLabel(e.target.value)}
                  placeholder="Ex: Peso em Kg, Código Interno, Tipo de Produto"
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tipo do Campo *</label>
                <select
                  value={newCustomType}
                  onChange={(e) => setNewCustomType(e.target.value as CustomFieldType)}
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-bold rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                >
                  <option value="texto">Texto Curto</option>
                  <option value="numero">Número</option>
                  <option value="lista">Lista de Opções (Seleção)</option>
                  <option value="data">Data</option>
                  <option value="moeda">Moeda / Valor R$</option>
                  <option value="checkbox">Caixa de Seleção (Sim/Não)</option>
                  <option value="qrcode">QR Code Personalizado</option>
                  <option value="codigo_interno">Código Interno / Barcode</option>
                </select>
              </div>

              {newCustomType === 'lista' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opções da Lista (separadas por vírgula) *</label>
                  <input
                    type="text"
                    required
                    value={newCustomOptions}
                    onChange={(e) => setNewCustomOptions(e.target.value)}
                    placeholder="Ex: Peça leve, Peça pesada, Frágil"
                    className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Texto de Ajuda / Placeholder</label>
                <input
                  type="text"
                  value={newCustomPlaceholder}
                  onChange={(e) => setNewCustomPlaceholder(e.target.value)}
                  placeholder="Ex: Digite o peso estimado..."
                  className="w-full px-3.5 bg-white border border-[#CBD5E1] text-[#0F172A] font-medium rounded-[12px] min-h-[46px] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newCustomRequired}
                  onChange={(e) => setNewCustomRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 bg-white"
                />
                <span className="text-slate-700 font-semibold">Preenchimento obrigatório pelo operador</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Adicionar ao Formulário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
