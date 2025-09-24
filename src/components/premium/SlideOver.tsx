import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SlideOverProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  width?: 'md' | 'lg';
  children: ReactNode;
}

export function SlideOver({ open, title, description, onClose, width = 'md', children }: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-xl';

  return createPortal(
    <div className="fixed inset-0 z-[998] flex justify-end bg-black/40 backdrop-blur-sm">
      <div className={`flex h-full w-full max-w-full flex-col bg-bg shadow-2xl transition-transform duration-300 ease-out sm:w-auto ${widthClass}`}>
        <header className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">{title}</h2>
            {description && <p className="mt-1 text-sm text-mutedfg">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-xl border border-border p-2 text-mutedfg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
