import React, { useState } from 'react';
import { Palette, Sun, Moon, Laptop, Image, Check, RefreshCcw, Sparkles } from 'lucide-react';
import { Empresa, CompanyThemeConfig } from '../types';
import { Database } from '../lib/db';
import { applyThemeMode, applyCompanyTheme, DEFAULT_COMPANY_THEME } from '../lib/themeConfig';

interface ThemeConfigModalProps {
  empresa: Empresa;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedEmpresa: Empresa) => void;
}

const PRESET_THEMES = [
  {
    name: 'Âmbar Dourado (Padrão)',
    primaryColor: '#f59e0b',
    secondaryColor: '#3b82f6',
    buttonColor: '#f59e0b',
    menuColor: '#0f172a',
    cardColor: '#1e293b',
    tagColor: '#334155'
  },
  {
    name: 'Azul Corporativo',
    primaryColor: '#2563eb',
    secondaryColor: '#06b6d4',
    buttonColor: '#2563eb',
    menuColor: '#0f172a',
    cardColor: '#1e293b',
    tagColor: '#1e3a8a'
  },
  {
    name: 'Verde Esmeralda Logística',
    primaryColor: '#10b981',
    secondaryColor: '#f59e0b',
    buttonColor: '#10b981',
    menuColor: '#064e3b',
    cardColor: '#022c22',
    tagColor: '#065f46'
  },
  {
    name: 'Roxo Premium Luxury',
    primaryColor: '#8b5cf6',
    secondaryColor: '#ec4899',
    buttonColor: '#8b5cf6',
    menuColor: '#1e1b4b',
    cardColor: '#2e1065',
    tagColor: '#4c1d95'
  }
];

export default function ThemeConfigModal({ empresa, isOpen, onClose, onSaved }: ThemeConfigModalProps) {
  const currentTheme = empresa.themeConfig || DEFAULT_COMPANY_THEME;

  const [theme, setTheme] = useState<CompanyThemeConfig>({
    logoUrl: currentTheme.logoUrl || '',
    faviconUrl: currentTheme.faviconUrl || '',
    loginBgUrl: currentTheme.loginBgUrl || '',
    bannerUrl: currentTheme.bannerUrl || '',
    primaryColor: currentTheme.primaryColor || '#f59e0b',
    secondaryColor: currentTheme.secondaryColor || '#3b82f6',
    buttonColor: currentTheme.buttonColor || '#f59e0b',
    menuColor: currentTheme.menuColor || '#0f172a',
    cardColor: currentTheme.cardColor || '#1e293b',
    tagColor: currentTheme.tagColor || '#334155',
    darkModePreference: currentTheme.darkModePreference || 'escuro'
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = (field: keyof CompanyThemeConfig, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setTheme(prev => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (preset: typeof PRESET_THEMES[0]) => {
    setTheme(prev => ({
      ...prev,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      buttonColor: preset.buttonColor,
      menuColor: preset.menuColor,
      cardColor: preset.cardColor,
      tagColor: preset.tagColor
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await Database.updateCompanyThemeConfig(empresa.id, theme);
    setSaving(false);

    if (result.success) {
      applyCompanyTheme(theme);
      applyThemeMode(theme.darkModePreference || 'escuro');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);

      const updatedEmpresa: Empresa = {
        ...empresa,
        themeConfig: theme
      };
      onSaved(updatedEmpresa);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-2xl overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.16)] p-6 space-y-6 max-h-[90vh] overflow-y-auto text-[#0F172A]">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                <Palette className="w-5 h-5 text-amber-600" />
              </div>
              <span>Personalização Visual e Identidade da Empresa</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Configure a logo, cores principais, tela de login e modo claro/escuro para a empresa {empresa.nome}.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer">✕</button>
        </div>

        {/* PRESET THEMES */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Paletas de Cores Prontas
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PRESET_THEMES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleApplyPreset(preset)}
                className="bg-[#F8FAFC] border border-slate-200 hover:border-amber-500 p-2.5 rounded-xl text-left transition-all text-xs cursor-pointer"
              >
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: preset.primaryColor }} />
                  <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: preset.secondaryColor }} />
                  <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: preset.buttonColor }} />
                </div>
                <span className="font-bold text-[#0F172A] block text-[11px] truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* LOGO & BRANDING IMAGES */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1">
            <Image className="w-3.5 h-3.5 text-amber-600" /> Upload de Logos & Imagens
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* LOGO */}
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="block font-bold text-[#0F172A]">Logo da Empresa</label>
              {theme.logoUrl && (
                <div className="w-full h-14 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2">
                  <img src={theme.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload('logoUrl', e.target.files[0])}
                className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700"
              />
            </div>

            {/* FAVICON */}
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="block font-bold text-[#0F172A]">Favicon do Navegador</label>
              {theme.faviconUrl && (
                <div className="w-full h-14 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2">
                  <img src={theme.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload('faviconUrl', e.target.files[0])}
                className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700"
              />
            </div>

            {/* LOGIN BG */}
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
              <label className="block font-bold text-[#0F172A]">Imagem de Fundo da Tela de Login (URL ou Upload)</label>
              <input
                type="text"
                placeholder="https://exemplo.com/fundo-login.jpg"
                value={theme.loginBgUrl}
                onChange={(e) => setTheme({ ...theme, loginBgUrl: e.target.value })}
                className="w-full bg-white border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>
        </div>

        {/* CUSTOM COLORS */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Cores Personalizadas da Interface</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Cor Principal</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="w-8 h-8 rounded bg-transparent cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] p-2 text-[#0F172A] font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Cor Secundária</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                  className="w-8 h-8 rounded bg-transparent cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={theme.secondaryColor}
                  onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] p-2 text-[#0F172A] font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Cor dos Botões</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.buttonColor}
                  onChange={(e) => setTheme({ ...theme, buttonColor: e.target.value })}
                  className="w-8 h-8 rounded bg-transparent cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={theme.buttonColor}
                  onChange={(e) => setTheme({ ...theme, buttonColor: e.target.value })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[12px] p-2 text-[#0F172A] font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* DARK / LIGHT MODE PREFERENCE */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Modo de Apresentação (Claro / Escuro)</h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setTheme({ ...theme, darkModePreference: 'claro' });
                applyThemeMode('claro');
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                theme.darkModePreference === 'claro'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>☀ Claro</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme({ ...theme, darkModePreference: 'escuro' });
                applyThemeMode('escuro');
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                theme.darkModePreference === 'escuro'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>🌙 Escuro</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme({ ...theme, darkModePreference: 'sistema' });
                applyThemeMode('sistema');
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                theme.darkModePreference === 'sistema'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>⚙ Seguir Sistema</span>
            </button>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          {successMsg ? (
            <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
              <Check className="w-4 h-4" /> Configurações salvas e aplicadas com sucesso!
            </span>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] disabled:opacity-50 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              {saving ? 'Salvando...' : 'Salvar e Aplicar Tema'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
