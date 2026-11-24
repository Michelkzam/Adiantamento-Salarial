import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { COMPANY } from '../config/company';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack, showBackButton = false }) => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-all duration-200 transform active:scale-95"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <div className="flex items-center space-x-3">
              <img
                src={COMPANY.logoPath}
                alt={`Logo ${COMPANY.name}`}
                className="h-11 w-auto drop-shadow-md"
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                <p className="text-xs text-blue-100 opacity-90">
                  {COMPANY.fullName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
