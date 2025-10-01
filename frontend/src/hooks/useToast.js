import { create } from 'zustand';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const DEFAULT_DURATION = 4000;

export const useToastStore = create((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = toast.id ?? generateId();
    const duration =
      typeof toast.duration === 'number' && toast.duration > 0
        ? toast.duration
        : DEFAULT_DURATION;

    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          title: toast.title,
          description: toast.description,
          variant: toast.variant || 'default',
          duration,
        },
      ],
    }));

    if (duration !== Infinity) {
      const timeoutId = setTimeout(() => {
        const toastExists = get().toasts.some((item) => item.id === id);
        if (toastExists) {
          set((state) => ({
            toasts: state.toasts.filter((item) => item.id !== id),
          }));
        }
      }, duration);

      return { id, timeoutId };
    }

    return { id };
  },
  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  const dismiss = useToastStore((state) => state.dismiss);

  return {
    toast: (toast) => {
      const result = addToast(toast);
      return result.id;
    },
    dismiss,
  };
}
