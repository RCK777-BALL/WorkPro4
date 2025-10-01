import { useEffect } from 'react';
import { X } from 'lucide-react';

import { useToastStore } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const variantStyles = {
  default: 'border-gray-200 bg-white text-gray-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

function ToastItem({ toast }) {
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast.duration || toast.duration === Infinity) {
      return undefined;
    }

    const timer = setTimeout(() => {
      dismissToast(toast.id);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [dismissToast, toast.duration, toast.id]);

  return (
    <div
      className={cn(
        'relative flex w-full min-w-[280px] max-w-sm flex-col gap-1 rounded-lg border px-4 py-3 shadow-lg backdrop-blur',
        variantStyles[toast.variant] || variantStyles.default,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
          {toast.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="rounded-md p-1 text-gray-500 hover:bg-black/5 hover:text-gray-700"
          onClick={() => dismissToast(toast.id)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastViewport() {
  const { toasts } = useToastStore((state) => ({ toasts: state.toasts }));

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex flex-col items-center space-y-3 px-4 sm:items-end sm:px-6">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
