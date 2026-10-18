import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
  }, []);

  const push = useCallback(
    (message, type = 'success') => {
      const id = ++idCounter;
      setToasts((t) => [...t, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), 4500);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  };

  const TYPE_STYLE = {
    error: { cls: 'bg-red-600 dark:bg-red-700', icon: 'bi-exclamation-triangle-fill' },
    info: { cls: 'bg-green-800 dark:bg-green-700', icon: 'bi-info-circle-fill' },
    success: { cls: 'bg-green-600 dark:bg-green-700', icon: 'bi-check-circle-fill' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 no-print">
        {toasts.map((t) => {
          const style = TYPE_STYLE[t.type] || TYPE_STYLE.success;
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              className={`pointer-events-auto animate-fade-up cursor-pointer rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${style.cls}`}
            >
              <span className="flex items-start gap-2">
                <i className={`bi ${style.icon} mt-0.5 shrink-0`} />
                <span className="min-w-0 break-words">{t.message}</span>
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
