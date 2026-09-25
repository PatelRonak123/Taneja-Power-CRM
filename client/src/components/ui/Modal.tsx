import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  variant?: 'drawer' | 'dialog';
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  variant = 'drawer',
  footer,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const drawerMaxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full',
  };

  const dialogMaxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-4xl',
  };

  if (variant === 'dialog') {
    return createPortal(
      <div
        className="fixed inset-0 z-100 flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={`relative w-full ${dialogMaxWidthClasses[maxWidth]} bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-10 animate-toast-in ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
            <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">{children}</div>
          {footer && (
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // Slide-over drawer variant (default)
  return createPortal(
    <div
      className="fixed inset-0 z-100 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-100">
        <div
          className={`w-screen ${drawerMaxWidthClasses[maxWidth]} bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-y-auto ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-10">
            <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">{children}</div>
          {footer && (
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
