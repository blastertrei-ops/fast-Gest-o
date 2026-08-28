import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA instalado com sucesso pelo usuário');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white border border-[#E2E8F0] p-4 rounded-[18px] shadow-[0_8px_30px_rgba(15,23,42,0.12)] max-w-sm flex items-center justify-between gap-3 animate-slide-up text-[#0F172A]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
          <Smartphone className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-bold text-[#0F172A] text-xs">Instalar Aplicativo</h4>
          <p className="text-[11px] text-slate-500 font-medium">Instale no celular para usar offline e com acesso direto.</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-[#FF9800] hover:bg-[#f59e0b] text-[#111827] font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
