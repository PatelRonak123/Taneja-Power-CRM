import React, { useEffect } from 'react';
import { useModalStore, ModalVariant } from '../../stores/modalStore';
import { AlertTriangle, Trash2, Info, CheckCircle2, X } from 'lucide-react';

interface VariantStyle {
  badgeBg: string;
  badgeBorder: string;
  icon: React.ReactNode;
  confirmBtn: string;
}

const VARIANT_CONFIG: Record<ModalVariant, VariantStyle> = {
  danger: {
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200/80',
    icon: <Trash2 className="w-5 h-5 text-rose-600" strokeWidth={2.2} />,
    confirmBtn:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white focus-visible:ring-rose-500 shadow-xs',
  },
  warning: {
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200/80',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" strokeWidth={2.2} />,
    confirmBtn:
      'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white focus-visible:ring-amber-500 shadow-xs',
  },
  info: {
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200/80',
    icon: <Info className="w-5 h-5 text-blue-600" strokeWidth={2.2} />,
    confirmBtn:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white focus-visible:ring-blue-500 shadow-xs',
  },
  primary: {
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200/80',
    icon: <Info className="w-5 h-5 text-blue-600" strokeWidth={2.2} />,
    confirmBtn:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white focus-visible:ring-blue-500 shadow-xs',
  },
  success: {
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200/80',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={2.2} />,
    confirmBtn:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white focus-visible:ring-emerald-500 shadow-xs',
  },
};

export const ConfirmModalContainer: React.FC = () => {
  const { isOpen, options, closeModal } = useModalStore();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal(false);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Prevent enter on focused cancel button
        if (document.activeElement?.getAttribute('data-action') === 'cancel') {
          return;
        }
        closeModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen || !options) return null;

  const variant = options.variant || 'danger';
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;
  const confirmText = options.confirmText || (options.isAlert ? 'OK' : 'Confirm');
  const cancelText = options.cancelText || 'Cancel';

  return (
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
        onClick={() => closeModal(false)}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-10 animate-toast-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon Badge */}
            <div
              className={`shrink-0 w-10 h-10 rounded-xl border ${config.badgeBorder} ${config.badgeBg} flex items-center justify-center shadow-2xs`}
              aria-hidden="true"
            >
              {config.icon}
            </div>

            {/* Title & Message */}
            <div className="flex-1 min-w-0 pr-6">
              <h3
                id="confirm-modal-title"
                className="text-base font-bold text-slate-900 tracking-tight leading-snug"
              >
                {options.title}
              </h3>
              <div className="text-[13px] text-slate-600 mt-2 leading-relaxed wrap-break-word font-normal">
                {options.message}
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => closeModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-3">
          {!options.isAlert && (
            <button
              type="button"
              data-action="cancel"
              onClick={() => closeModal(false)}
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[13px] transition-all shadow-2xs cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            data-action="confirm"
            onClick={() => closeModal(true)}
            autoFocus
            className={`h-9 px-4 rounded-lg font-medium text-[13px] transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-1 ${config.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModalContainer;
