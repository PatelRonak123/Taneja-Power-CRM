import React from 'react';
import { useNotificationStore, ToastNotification, ToastType } from '../../stores/notificationStore';
import { X, Loader2 } from 'lucide-react';

interface ToastTheme {
  bg: string;
  border: string;
  bar: string;
  badgeBg: string;
  titleColor: string;
  defaultTitle: string;
}

const TOAST_THEMES: Record<ToastType, ToastTheme> = {
  success: {
    bg: 'bg-emerald-50/90',
    border: 'border-emerald-200/90',
    bar: 'bg-emerald-600',
    badgeBg: 'bg-emerald-100',
    titleColor: 'text-emerald-900',
    defaultTitle: 'Success',
  },
  error: {
    bg: 'bg-rose-50/90',
    border: 'border-rose-200/90',
    bar: 'bg-rose-600',
    badgeBg: 'bg-rose-100',
    titleColor: 'text-rose-900',
    defaultTitle: 'Error',
  },
  warning: {
    bg: 'bg-amber-50/90',
    border: 'border-amber-200/90',
    bar: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
    titleColor: 'text-amber-900',
    defaultTitle: 'Warning',
  },
  info: {
    bg: 'bg-blue-50/90',
    border: 'border-blue-200/90',
    bar: 'bg-blue-600',
    badgeBg: 'bg-blue-100',
    titleColor: 'text-blue-900',
    defaultTitle: 'Information',
  },
  loading: {
    bg: 'bg-blue-50/90',
    border: 'border-blue-200/90',
    bar: 'bg-blue-600',
    badgeBg: 'bg-blue-100',
    titleColor: 'text-blue-900',
    defaultTitle: 'Loading',
  },
};

const SuccessIcon: React.FC = () => (
  <svg
    className="w-4 h-4 text-emerald-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg className="w-4 h-4 text-rose-600 fill-current" viewBox="0 0 24 24">
    <path d="M12 4.75a1.25 1.25 0 0 1 1.25 1.25v7a1.25 1.25 0 0 1-2.5 0v-7A1.25 1.25 0 0 1 12 4.75z" />
    <circle cx="12" cy="17.25" r="1.35" />
  </svg>
);

const WarningIcon: React.FC = () => (
  <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4.5" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17.25" r="1" fill="#fef3c7" />
  </svg>
);

const InfoIcon: React.FC = () => (
  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="7.75" r="1.15" fill="#eff6ff" />
    <path d="M12 11a1 1 0 0 1 1 1v4.5a1 1 0 1 1-2 0V12a1 1 0 0 1 1-1z" fill="#eff6ff" />
  </svg>
);

const renderToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <SuccessIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'warning':
      return <WarningIcon />;
    case 'info':
      return <InfoIcon />;
    case 'loading':
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" strokeWidth={2.5} />;
  }
};

const resolveTitleAndMessage = (toast: ToastNotification) => {
  const theme = TOAST_THEMES[toast.type] || TOAST_THEMES.info;

  const isGenericTitle = (title: string) => {
    const t = title.trim().toLowerCase();
    return (
      t === 'success' ||
      t === 'error' ||
      t === 'warning' ||
      t === 'info' ||
      t === 'information' ||
      t === 'loading' ||
      t === theme.defaultTitle.toLowerCase()
    );
  };

  if (toast.message && toast.message.trim().length > 0) {
    return {
      title: toast.title,
      message: toast.message,
    };
  }

  if (isGenericTitle(toast.title)) {
    return {
      title: theme.defaultTitle,
      message: undefined,
    };
  }

  return {
    title: theme.defaultTitle,
    message: toast.title,
  };
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-9999 flex flex-col gap-2.5 max-w-100 w-full pointer-events-none select-none px-4 sm:px-0"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const theme = TOAST_THEMES[toast.type] || TOAST_THEMES.info;
        const { title, message } = resolveTitleAndMessage(toast);
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isLoading = toast.type === 'loading';

        return (
          <div
            key={toast.id}
            role={isError || isWarning ? 'alert' : 'status'}
            className={`pointer-events-auto relative overflow-hidden rounded-xl border ${theme.border} ${theme.bg} p-3.5 shadow-lg backdrop-blur-xs flex items-start gap-3 transition-all duration-200 animate-toast-in`}
          >
            {/* Left vertical accent bar */}
            <div
              className={`absolute inset-y-0 left-0 w-1 ${theme.bar}`}
              aria-hidden="true"
            />

            {/* Left Icon Badge */}
            <div
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${theme.badgeBg}`}
              aria-hidden="true"
            >
              {renderToastIcon(toast.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className={`text-[13px] font-bold leading-tight tracking-tight ${theme.titleColor}`}>
                {title}
              </h4>
              {message && (
                <p className="text-xs text-slate-600 mt-1 leading-snug wrap-break-word font-medium">
                  {message}
                </p>
              )}
            </div>

            {/* Close button */}
            {!isLoading && (
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => removeToast(toast.id)}
                className="p-1 -mr-1 -mt-0.5 text-slate-400 hover:text-slate-600 hover:bg-black/5 rounded-lg transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
