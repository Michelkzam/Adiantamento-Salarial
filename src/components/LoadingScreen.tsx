import React from 'react';
import { COMPANY } from '../config/company';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center z-50">
      <div className="text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full animate-pulse-soft" />
          <img
            src={COMPANY.logoPath}
            alt={`Logo ${COMPANY.name}`}
            className="h-28 w-auto mx-auto relative z-10 drop-shadow-2xl"
          />
        </div>
        
        {/* Company Name */}
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          {COMPANY.name}
        </h1>
        <p className="text-blue-200 text-sm mb-8">
          {COMPANY.fullName}
        </p>
        
        {/* Loading Bar */}
        <div className="w-64 mx-auto">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full loading-bar" />
          </div>
          <p className="text-blue-200 text-xs mt-3 animate-pulse-soft">
            Carregando sistema...
          </p>
        </div>
      </div>
    </div>
  );
}
