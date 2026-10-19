import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  side?: 'right' | 'left';
  footer?: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  side = 'right',
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

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full',
  };

  const isRight = side === 'right';

  return createPortal(
    <div
      className="fixed inset-0 z-100 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-y-0 ${
          isRight ? 'right-0 pl-10' : 'left-0 pr-10'
        } max-w-full flex z-100`}
      >
        <div
          className={`w-screen ${maxWidthClasses[maxWidth]} bg-white shadow-2xl flex flex-col h-full ${
            isRight ? 'border-l rounded-l-2xl' : 'border-r rounded-r-2xl'
          } border-slate-200 ${
            isRight ? 'animate-slide-in-right' : ''
          } overflow-hidden ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-md shrink-0 sticky top-0 z-10">
              <div className="text-base font-bold text-slate-900 leading-snug">{title}</div>
              <button
                type="button"
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"
                onClick={onClose}
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0 sticky bottom-0 z-10">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Drawer;
