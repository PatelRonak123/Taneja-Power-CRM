import { useNotificationStore, ToastNotification } from '../stores/notificationStore';

export interface ToastOptions {
  message?: string;
  duration?: number;
  dedupeKey?: string;
}

export const toast = {
  success: (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): string => {
    let message: string | undefined;
    let opts: ToastOptions | undefined;

    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
      opts = options;
    } else if (typeof messageOrOptions === 'object') {
      opts = messageOrOptions;
      message = opts.message;
    }

    return useNotificationStore.getState().addToast({
      type: 'success',
      title,
      message,
      duration: opts?.duration,
      dedupeKey: opts?.dedupeKey,
    });
  },

  error: (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): string => {
    let message: string | undefined;
    let opts: ToastOptions | undefined;

    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
      opts = options;
    } else if (typeof messageOrOptions === 'object') {
      opts = messageOrOptions;
      message = opts.message;
    }

    return useNotificationStore.getState().addToast({
      type: 'error',
      title,
      message,
      duration: opts?.duration,
      dedupeKey: opts?.dedupeKey,
    });
  },

  warning: (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): string => {
    let message: string | undefined;
    let opts: ToastOptions | undefined;

    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
      opts = options;
    } else if (typeof messageOrOptions === 'object') {
      opts = messageOrOptions;
      message = opts.message;
    }

    return useNotificationStore.getState().addToast({
      type: 'warning',
      title,
      message,
      duration: opts?.duration,
      dedupeKey: opts?.dedupeKey,
    });
  },

  info: (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): string => {
    let message: string | undefined;
    let opts: ToastOptions | undefined;

    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
      opts = options;
    } else if (typeof messageOrOptions === 'object') {
      opts = messageOrOptions;
      message = opts.message;
    }

    return useNotificationStore.getState().addToast({
      type: 'info',
      title,
      message,
      duration: opts?.duration,
      dedupeKey: opts?.dedupeKey,
    });
  },

  loading: (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): string => {
    let message: string | undefined;
    let opts: ToastOptions | undefined;

    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
      opts = options;
    } else if (typeof messageOrOptions === 'object') {
      opts = messageOrOptions;
      message = opts.message;
    }

    return useNotificationStore.getState().addToast({
      type: 'loading',
      title,
      message,
      duration: opts?.duration !== undefined ? opts.duration : 0,
      dedupeKey: opts?.dedupeKey,
    });
  },

  dismiss: (id: string): void => {
    useNotificationStore.getState().removeToast(id);
  },

  clear: (): void => {
    useNotificationStore.getState().clearToasts();
  },

  update: (id: string, updates: Partial<Omit<ToastNotification, 'id' | 'createdAt'>>): void => {
    useNotificationStore.getState().updateToast(id, updates);
  },

  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    },
    options?: ToastOptions
  ): Promise<T> => {
    const toastId = toast.loading(messages.loading, undefined, options);
    try {
      const data = await promise;
      const successTitle =
        typeof messages.success === 'function' ? messages.success(data) : messages.success;
      toast.update(toastId, {
        type: 'success',
        title: successTitle,
        duration: 3500,
      });
      return data;
    } catch (err: any) {
      const errorTitle =
        typeof messages.error === 'function' ? messages.error(err) : messages.error;
      const errorMessage =
        err?.message && err.message !== errorTitle ? err.message : undefined;
      toast.update(toastId, {
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        duration: 5000,
      });
      throw err;
    }
  },

  // Standard entity convenience helpers
  createSuccess: (entityName: string, detail?: string) =>
    toast.success(`${entityName} created successfully`, detail),
  updateSuccess: (entityName: string, detail?: string) =>
    toast.success(`${entityName} updated successfully`, detail),
  deleteSuccess: (entityName: string, detail?: string) =>
    toast.success(`${entityName} deleted successfully`, detail),
  saveError: (entityName: string, err?: any) =>
    toast.error(
      `Failed to save ${entityName.toLowerCase()}`,
      err?.message || 'Please check your connection and try again.'
    ),
  loadError: (entityName: string, err?: any) =>
    toast.error(
      `Failed to load ${entityName.toLowerCase()}`,
      err?.message || 'Please check your connection and try again.'
    ),
};

export default toast;
