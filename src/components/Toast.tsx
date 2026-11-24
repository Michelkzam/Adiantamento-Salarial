import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  isExiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, message, type, isExiting: false }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, isExiting: true } : t));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3500);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, isExiting: true } : t));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  const icons = {
    success: <CheckCircle size={18} className="text-green-500" />,
    error: <AlertTriangle size={18} className="text-red-500" />,
    warning: <AlertTriangle size={18} className="text-yellow-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700',
    error: 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700',
    warning: 'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-700',
    info: 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700',
  };

  const iconBg = {
    success: 'bg-green-100 dark:bg-green-800/50',
    error: 'bg-red-100 dark:bg-red-800/50',
    warning: 'bg-yellow-100 dark:bg-yellow-800/50',
    info: 'bg-blue-100 dark:bg-blue-800/50',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center space-x-3 px-4 py-3.5 rounded-xl border shadow-xl backdrop-blur-sm ${bgColors[toast.type]} ${toast.isExiting ? 'toast-exit' : 'toast-enter'}`}
          >
            <div className={`p-1.5 rounded-lg ${iconBg[toast.type]}`}>
              {icons[toast.type]}
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1">{toast.message}</span>
            <button 
              onClick={() => dismiss(toast.id)} 
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
