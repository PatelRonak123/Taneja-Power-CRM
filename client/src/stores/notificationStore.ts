import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dedupeKey?: string;
  createdAt: number;
}

interface NotificationState {
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'createdAt'>) => string;
  updateToast: (id: string, updates: Partial<Omit<ToastNotification, 'id' | 'createdAt'>>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();
const recentDedupeMap = new Map<string, number>();

const getDefaultDuration = (type: ToastType): number => {
  switch (type) {
    case 'loading':
      return 0; // Stays active until dismissed or updated
    case 'error':
      return 5000; // 5 seconds for errors so users can read
    case 'warning':
      return 4000; // 4 seconds for warnings
    case 'success':
    case 'info':
    default:
      return 3500; // 3.5 seconds for success and info
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const dedupeKey = toast.dedupeKey || `${toast.type}:${toast.title}:${toast.message || ''}`;
    const now = Date.now();
    const lastShown = recentDedupeMap.get(dedupeKey);

    // Suppress duplicate toasts within 1.5 seconds to prevent spam from parallel requests
    if (lastShown && now - lastShown < 1500) {
      const existing = get().toasts.find(
        (t) => t.dedupeKey === dedupeKey || `${t.type}:${t.title}:${t.message || ''}` === dedupeKey
      );
      if (existing) {
        return existing.id;
      }
    }
    recentDedupeMap.set(dedupeKey, now);

    // Clean up stale dedupe keys
    if (recentDedupeMap.size > 50) {
      for (const [k, ts] of recentDedupeMap.entries()) {
        if (now - ts > 10000) recentDedupeMap.delete(k);
      }
    }

    const id = `toast-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotification = {
      ...toast,
      id,
      dedupeKey,
      createdAt: now,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    const duration = toast.duration !== undefined ? toast.duration : getDefaultDuration(toast.type);
    if (duration > 0) {
      const timer = setTimeout(() => {
        get().removeToast(id);
      }, duration);
      timeoutMap.set(id, timer);
    }

    return id;
  },

  updateToast: (id, updates) => {
    // Clear previous timer for this toast if one existed
    const existingTimer = timeoutMap.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timeoutMap.delete(id);
    }

    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    const updatedToast = get().toasts.find((t) => t.id === id);
    if (updatedToast) {
      const duration =
        updates.duration !== undefined ? updates.duration : getDefaultDuration(updatedToast.type);

      if (duration > 0) {
        const timer = setTimeout(() => {
          get().removeToast(id);
        }, duration);
        timeoutMap.set(id, timer);
      }
    }
  },

  removeToast: (id) => {
    const timer = timeoutMap.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutMap.delete(id);
    }

    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    timeoutMap.forEach((timer) => clearTimeout(timer));
    timeoutMap.clear();
    set({ toasts: [] });
  },
}));
