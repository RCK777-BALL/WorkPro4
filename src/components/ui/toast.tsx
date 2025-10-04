import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastVariant = 'default' | 'success' | 'error';

type ToastAction = {
  label: string;
  onClick: () => void;
};

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: ToastOptions[];
  showToast: (toast: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function getVariantClasses(variant: ToastVariant = 'default'): string {
  switch (variant) {
    case 'success':
      return 'border-emerald-200 bg-emerald-600/90 text-white';
    case 'error':
      return 'border-red-200 bg-red-600/90 text-white';
    default:
      return 'border-border bg-surface text-fg';
  }
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastOptions) => {
      const id = toast.id ?? `toast-${++toastCounter}`;
      setToasts((current) => [...current, { ...toast, id }]);

      const duration = toast.duration ?? 4000;
      if (duration > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(() => ({ toasts, showToast, dismissToast }), [dismissToast, showToast, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[999] flex flex-col items-center gap-3 px-4 sm:items-end sm:px-6">
        {toasts.map((toast) => {
          const variantClasses = getVariantClasses(toast.variant);
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-2xl ring-1 ring-black/5 backdrop-blur',
                variantClasses,
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  {toast.title && <p className="text-sm font-semibold leading-tight">{toast.title}</p>}
                  {toast.description && <p className="mt-1 text-xs leading-relaxed text-white/80 sm:text-sm">{toast.description}</p>}
                  {toast.action && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.action?.onClick();
                        dismissToast(toast.id!);
                      }}
                      className="mt-3 text-xs font-semibold uppercase tracking-wide text-white underline"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                  onClick={() => toast.id && dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Pick<ToastContextValue, 'showToast' | 'dismissToast'> {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return { showToast: context.showToast, dismissToast: context.dismissToast };
}
