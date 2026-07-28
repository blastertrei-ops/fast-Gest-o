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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            Configuração do Formulário de Entrega — {company.nome}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalize quais campos aparecem ao criar ou editar uma entrega. Ative, reordene, torne obrigatório ou adicione novos campos personalizados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfig(DEFAULT_DELIVERY_FORM_CONFIG)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
            title="Restaurar padrão"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? 'Configuração Salva!' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: STANDARD & CUSTOM FIELDS SETTINGS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STANDARD FIELDS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Campos Padrões do Sistema ({config.standardFields.length})
              </h3>
              <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                Lógica padrão + exibição dinâmica
              </span>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {config.standardFields.map((field, idx) => (
                <div 
                  key={field.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    field.enabled ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-950/30 border-slate-900 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveStandard(idx, 'up')}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-white disabled:opacity-20 p-0.5"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveStandard(idx, 'down')}
                        disabled={idx === config.standardFields.length - 1}
                        className="text-slate-500 hover:text-white disabled:opacity-20 p-0.5"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleStandardLabelChange(field.id, e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 flex-1 min-w-0"
                    />
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Required Checkbox */}
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={() => handleToggleStandardRequired(field.id)}
                        className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                      />
                      <span className={field.required ? 'font-bold text-amber-400' : 'text-slate-500'}>
                        Obrigatório
                      </span>
                    </label>

                    {/* Enabled/Visible Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStandardEnabled(field.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                        field.enabled 
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60' 
                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Campos Personalizados ({config.customFields.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adicione novos campos (produto, peso, QR code, código interno, etc.)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomModal(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Adicionar Campo
              </button>
            </div>

            {config.customFields.length === 0 ? (
              <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
                Nenhum campo personalizado cadastrado. Clique no botão acima para criar o seu próprio formulário.
              </div>
            ) : (
              <div className="space-y-2">
                {config.customFields.map((field) => (
                  <div key={field.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getTypeIcon(field.type)}
                      <div>
                        <span className="font-bold text-white block truncate">{field.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Tipo: {field.type} {field.options ? `(${field.options.join(', ')})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {field.required && (
                        <span className="text-[10px] bg-amber-950/60 text-amber-400 px-2 py-0.5 rounded font-bold border border-amber-900/60">
                          Obrigatório
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
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

        {/* RIGHT COLUMN: REAL-TIME FORM PREVIEW */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visualização em Tempo Real do Formulário
              </h3>
              <span className="text-[10px] bg-amber-950/60 text-amber-400 font-bold px-2.5 py-0.5 rounded-full border border-amber-800">
                Preview Ao Vivo
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs max-h-[600px] overflow-y-auto">
              <h4 className="font-bold text-white text-xs border-b border-slate-800 pb-2">
                Nova Entrega — {company.nome}
              </h4>

              <DeliveryForm
                config={config}
                company={company}
                isPreview={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD CUSTOM FIELD */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
              <Plus className="w-4 h-4 text-amber-500" />
              Adicionar Campo Personalizado
            </h3>

            <form onSubmit={handleAddCustomField} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome do Campo (Rótulo) *</label>
                <input
                  type="text"
                  required
                  value={newCustomLabel}
                  onChange={(e) => setNewCustomLabel(e.target.value)}
                  placeholder="Ex: Peso em Kg, Código Interno, Tipo de Produto"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tipo do Campo *</label>
                <select
                  value={newCustomType}
                  onChange={(e) => setNewCustomType(e.target.value as CustomFieldType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-amber-500"
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
                  <label className="block text-slate-400 font-semibold mb-1">Opções da Lista (separadas por vírgula) *</label>
                  <input
                    type="text"
                    required
                    value={newCustomOptions}
                    onChange={(e) => setNewCustomOptions(e.target.value)}
                    placeholder="Ex: Peça leve, Peça pesada, Frágil"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Texto de Ajuda / Placeholder</label>
                <input
                  type="text"
                  value={newCustomPlaceholder}
                  onChange={(e) => setNewCustomPlaceholder(e.target.value)}
                  placeholder="Ex: Digite o peso estimado..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newCustomRequired}
                  onChange={(e) => setNewCustomRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950"
                />
                <span className="text-slate-300 font-semibold">Preenchimento obrigatório pelo operador</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition-colors"
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
