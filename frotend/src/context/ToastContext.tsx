import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          let bgClass = 'bg-slate-900 text-white border-slate-800';
          let indicatorClass = 'bg-blue-500';

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-950 text-emerald-100 border-emerald-800';
            indicatorClass = 'bg-emerald-400';
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-950 text-rose-100 border-rose-800';
            indicatorClass = 'bg-rose-400';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-950 text-amber-100 border-amber-800';
            indicatorClass = 'bg-amber-400';
          }

          return (
            <div
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-lg border shadow-lg text-sm transition-all cursor-pointer transform translate-y-0 ${bgClass}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${indicatorClass}`} />
                <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
              </div>
              <button
                type="button"
                className="opacity-60 hover:opacity-100 text-xs px-1"
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
