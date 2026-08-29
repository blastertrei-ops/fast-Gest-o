import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { 
  Package, Shield, Sliders, FileText, Navigation, Settings,
  ChevronLeft, ChevronRight, Menu, X, Building2, Bell
} from 'lucide-react';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  userRole?: string;
  enabledModules?: any;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  companyName?: string;
  userName?: string;
  userRoleName?: string;
  unreadNotificationsCount?: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  userRole = 'admin',
  enabledModules = {},
  isCollapsed: externalIsCollapsed,
  onToggleCollapse,
  companyName = 'Acrílico Brasil',
  userName = 'Jaqueline',
  userRoleName = 'Administrador',
  unreadNotificationsCount = 8
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
    { id: 'notificacoes', label: 'Notificações', icon: Bell, badge: unreadNotificationsCount || undefined, show: true },
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
          className="md:hidden fixed inset-0 z-50 animate-fade-in"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}
        />
      )}

      {/* DESKTOP & MOBILE SIDEBAR CONTAINER */}
      <aside
        className={`
          fixed md:relative top-0 left-0 bottom-0 z-50
          bg-[#132238] border-r border-slate-800 flex flex-col justify-between transition-all duration-300
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          shrink-0 print:hidden shadow-xl text-white select-none
        `}
      >
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* SIDEBAR HEADER / BRANDING BLOCK */}
            <div className="p-4 border-b border-slate-800/80 flex flex-col items-center justify-center relative bg-[#0c1827]">
              {/* MOBILE CLOSE BUTTON */}
              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden absolute top-3 right-3 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {/* BRAND STRUCTURE */}
              {isCollapsed ? (
                <div className="flex flex-col items-center py-1" title="FAST - Gestão de Entregas">
                  <BrandLogo size={44} className="w-[44px] h-[44px] object-contain shrink-0" />
                </div>
              ) : (
                <div className="flex items-center gap-3 py-1 animate-fade-in">
                  <BrandLogo size={44} className="w-[44px] h-[44px] object-contain shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-black text-white tracking-wider uppercase leading-none">FAST</span>
                    <span className="text-[10px] font-semibold text-sky-400 tracking-wide mt-1">Gestão de Entregas</span>
                  </div>
                </div>
              )}
            </div>

            {/* NAVIGATION LINKS */}
            <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
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
                      w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all relative
                      ${isActive 
                        ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}
                      ${isCollapsed ? 'justify-center px-0' : 'justify-start'}
                    `}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-300'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    
                    {!isCollapsed && (item as any).badge ? (
                      <span className="ml-auto bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                        {(item as any).badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* FOOTER USER & COMPANY PILL CARDS (MATCHING REFERENCE IMAGE) */}
          {!isCollapsed && (
            <div className="p-3 border-t border-slate-800/80 bg-[#0c1827] space-y-2">
              {/* Empresa Active Pill */}
              <div className="bg-[#192a42] border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 border border-slate-700">
                    <Building2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-xs truncate leading-tight">{companyName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-semibold">Empresa ativa</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Logged Pill */}
              <div className="bg-[#192a42] border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 bg-amber-500 text-slate-950 rounded-full font-black flex items-center justify-center shrink-0 text-xs">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-xs truncate leading-tight">{userName}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{userRoleName}</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
              </div>

              {/* Toggle Collapse button */}
              <button
                onClick={handleToggle}
                className="w-full flex items-center justify-center gap-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors text-xs font-semibold"
                title="Recolher Menu"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
                <span className="text-[11px]">Recolher Menu</span>
              </button>
            </div>
          )}

          {isCollapsed && (
            <div className="p-3 border-t border-slate-800 bg-[#0c1827] flex justify-center">
              <button
                onClick={handleToggle}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                title="Expandir Menu"
              >
                <ChevronRight className="w-5 h-5 text-amber-400" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

