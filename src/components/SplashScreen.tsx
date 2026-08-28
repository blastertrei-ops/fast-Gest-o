import React from 'react';
import BrandLogo from './BrandLogo';

interface SplashScreenProps {
  isLoading?: boolean;
}

export default function SplashScreen({ isLoading = true }: SplashScreenProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      <div className="flex flex-col items-center text-center animate-pulse">
        <BrandLogo size={120} className="w-[120px] h-[120px] object-contain mb-4" />
        <h1 className="text-xl font-black text-white tracking-widest uppercase">FAST</h1>
        <p className="text-xs font-semibold text-sky-400 mt-1">Gestão de Entregas</p>
        
        <div className="mt-8 flex items-center gap-2 text-sky-400 text-xs font-semibold tracking-wider">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Carregando ecossistema...</span>
        </div>
      </div>
    </div>
  );
}

