import React from 'react';
import FastGestaoLogo from './FastGestaoLogo';

interface SplashScreenProps {
  isLoading?: boolean;
}

export default function SplashScreen({ isLoading = true }: SplashScreenProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      <div className="flex flex-col items-center text-center animate-pulse">
        <FastGestaoLogo size={180} />
        
        <div className="mt-8 flex items-center gap-2 text-sky-400 text-xs font-semibold tracking-wider">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Carregando ecossistema...</span>
        </div>
      </div>
    </div>
  );
}

