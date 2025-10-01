import { create } from 'zustand';

let toastId = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = toast?.id ?? `toast-${Date.now()}-${++toastId}`;
    const nextToast = {
      id,
      title: '',
      description: '',
      variant: 'default',
      duration: 4000,
      ...toast,
    };

    set((state) => ({ toasts: [...state.toasts, nextToast] }));

    return id;
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return {
    toast: addToast,
    dismiss: dismissToast,
  };
}
