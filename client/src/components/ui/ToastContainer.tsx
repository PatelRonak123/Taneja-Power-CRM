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
    bg: 'bg-[#f4faf6]',
    border: 'border-[#bbf7d0]/80',
    bar: 'bg-[#22c55e]',
    badgeBg: 'bg-[#dcfce7]',
    titleColor: 'text-[#15803d]',
    defaultTitle: 'Success',
  },
  error: {
    bg: 'bg-[#fef4f4]',
    border: 'border-[#fecaca]/80',
    bar: 'bg-[#ef4444]',
    badgeBg: 'bg-[#fee2e2]',
    titleColor: 'text-[#b91c1c]',
    defaultTitle: 'Error',
  },
  warning: {
    bg: 'bg-[#fffbeb]',
    border: 'border-[#fde68a]/80',
    bar: 'bg-[#f59e0b]',
    badgeBg: 'bg-[#fef3c7]',
    titleColor: 'text-[#b45309]',
    defaultTitle: 'Warning',
  },
  info: {
    bg: 'bg-[#eff6ff]',
    border: 'border-[#bfdbfe]/80',
    bar: 'bg-[#3b82f6]',
    badgeBg: 'bg-[#dbeafe]',
    titleColor: 'text-[#1d4ed8]',
    defaultTitle: 'Information',
  },
  loading: {
    bg: 'bg-[#eff6ff]',
    border: 'border-[#bfdbfe]/80',
    bar: 'bg-[#3b82f6]',
    badgeBg: 'bg-[#dbeafe]',
    titleColor: 'text-[#1d4ed8]',
    defaultTitle: 'Loading',
  },
};

const SuccessIcon: React.FC = () => (
  <svg
    className="w-5 h-5 text-[#16a34a]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg className="w-5 h-5 text-[#ef4444] fill-current" viewBox="0 0 24 24">
    <path d="M12 4.75a1.25 1.25 0 0 1 1.25 1.25v7a1.25 1.25 0 0 1-2.5 0v-7A1.25 1.25 0 0 1 12 4.75z" />
    <circle cx="12" cy="17.25" r="1.35" />
  </svg>
);

const WarningIcon: React.FC = () => (
  <svg className="w-5 h-5 text-[#d97706]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4.5" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17.25" r="1" fill="#fef3c7" />
  </svg>
);

const InfoIcon: React.FC = () => (
  <svg className="w-5 h-5 text-[#2563eb]" viewBox="0 0 24 24" fill="currentColor">
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
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" strokeWidth={2.5} />;
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

  // If user passed a separate message
  if (toast.message && toast.message.trim().length > 0) {
    return {
      title: toast.title,
      message: toast.message,
    };
  }

  // If user only passed a generic title like "Success" or "Error" with no message
  if (isGenericTitle(toast.title)) {
    return {
      title: theme.defaultTitle,
      message: undefined,
    };
  }

  // If user passed a single message string like toast.success("Quotation created successfully.")
  // Split into standard capitalized category title and descriptive message as shown in design mockup
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
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-[420px] w-full pointer-events-none select-none px-4 sm:px-0"
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
            className={`pointer-events-auto relative overflow-hidden rounded-xl border ${theme.border} ${theme.bg} p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] flex items-start gap-3.5 transition-all duration-300 animate-toast-in`}
          >
            {/* Left vertical accent bar */}
            <div
              className={`absolute inset-y-0 left-0 w-1.5 ${theme.bar}`}
              aria-hidden="true"
            />

            {/* Left Icon Badge */}
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${theme.badgeBg}`}
            >
              {renderToastIcon(toast.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className={`text-[15px] font-bold leading-tight tracking-tight ${theme.titleColor}`}>
                {title}
              </h4>
              {message && (
                <p className="text-[13px] text-slate-600 mt-1 leading-snug break-words font-medium">
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
                className="p-1 -mr-1 -mt-0.5 text-slate-400 hover:text-slate-600 hover:bg-black/5 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
