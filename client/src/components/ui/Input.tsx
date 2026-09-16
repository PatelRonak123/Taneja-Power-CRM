import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 block">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && <span className="absolute left-3.5 text-slate-400 pointer-events-none">{leftIcon}</span>}
        <input
          id={inputId}
          className={`w-full py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            leftIcon ? 'pl-10 pr-3.5' : 'px-3.5'
          } ${error ? 'border-rose-300' : 'border-slate-200'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};
