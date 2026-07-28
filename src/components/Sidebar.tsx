import React, { useState } from 'react';
import FastGestaoLogo from './FastGestaoLogo';
import { 
  Package, Shield, Sliders, FileText, Navigation, Settings,
  ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  userRole?: string;
  enabledModules?: any;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  userRole = 'admin',
  enabledModules = {},
  isCollapsed: externalIsCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const navItems = [
    { id: 'entregas', label: 'Entregas', icon: Package, show: enabledModules.entregas !== false },
    { id: 'colaboradores', label: 'Usuários', icon: Shield, show: (userRole === 'admin' || userRole === 'master') && enabledModules.colaboradores !== false },
    { id: 'formConfig', label: 'Formulários', icon: Sliders, show: (userRole === 'admin' || userRole === 'master') && enabledModules.formConfig !== false },
    { id: 'rastreamentoGps', label: 'GPS em Tempo Real', icon: Navigation, show: true },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, show: (userRole === 'admin' || userRole === 'master') && enabledModules.relatorios !== false },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, show: (userRole === 'admin' || userRole === 'master') }
  ].filter(item => item.show);

  return (
    <>
      {/* MOBILE TRIGGER BUTTON */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-50 p-3 bg-amber-500 text-slate-950 rounded-full shadow-2xl hover:bg-amber-400 transition-transform active:scale-95 border-2 border-slate-900"
        title="Abrir Menu Lateral"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 animate-fade-in"
        />
      )}

      {/* DESKTOP & MOBILE SIDEBAR CONTAINER */}
      <aside
        className={`
          fixed md:relative top-0 left-0 bottom-0 z-50
          bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          shrink-0 print:hidden shadow-xl
        `}
      >
        <div>
          {/* SIDEBAR HEADER / BRANDING BLOCK */}
          <div className="p-4 border-b border-slate-800 flex flex-col items-center justify-center relative bg-slate-950/50">
            {/* MOBILE CLOSE BUTTON */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden absolute top-3 right-3 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* BRAND STRUCTURE */}
            {isCollapsed ? (
              <div className="flex flex-col items-center py-1" title="Fast Gestão - Sistema de Entregas">
                <FastGestaoLogo size={38} />
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-1 animate-fade-in">
                <FastGestaoLogo size={80} />
              </div>
            )}
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all
                    ${isActive 
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'}
                    ${isCollapsed ? 'justify-center px-0' : 'justify-start'}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* SIDEBAR FOOTER & TOGGLE BUTTON */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 hidden md:block">
          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold"
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-amber-400" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 text-amber-400" />
                <span>Recolher Menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
