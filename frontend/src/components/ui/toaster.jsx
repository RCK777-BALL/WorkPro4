import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToastStore } from '@/hooks/useToast';

const variantStyles = {
  default: 'border-gray-200 bg-white text-gray-900',
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

export function Toaster() {
  const [mounted, setMounted] = useState(false);
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    setMounted(true);
  }, []);

  const container = useMemo(() => {
    if (typeof document === 'undefined') return null;
    let element = document.getElementById('toast-root');
    if (!element) {
      element = document.createElement('div');
      element.setAttribute('id', 'toast-root');
      document.body.appendChild(element);
    }
    return element;
  }, []);

  if (!mounted || !container) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const style = variantStyles[toast.variant] || variantStyles.default;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border p-4 shadow-lg transition-all ${style}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                {toast.title && (
                  <p className="text-sm font-semibold">{toast.title}</p>
                )}
                {toast.description && (
                  <p className="text-sm text-gray-600">{toast.description}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-700"
                onClick={() => dismiss(toast.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>,
    container,
  );
}
