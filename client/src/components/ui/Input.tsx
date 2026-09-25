import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const sizeClasses = {
      sm: 'h-8 text-xs px-2.5',
      md: 'h-9 text-[13px] px-3',
      lg: 'h-[42px] text-sm px-3.5',
    };

    const iconPaddingLeft = {
      sm: 'pl-8',
      md: 'pl-9',
      lg: 'pl-10',
    };

    const iconPaddingRight = {
      sm: 'pr-8',
      md: 'pr-9',
      lg: 'pr-10',
    };

    const iconPositionLeft = {
      sm: 'left-2.5',
      md: 'left-3',
      lg: 'left-3.5',
    };

    const iconPositionRight = {
      sm: 'right-2.5',
      md: 'right-3',
      lg: 'right-3.5',
    };

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 block">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span
              className={`absolute ${iconPositionLeft[inputSize]} text-slate-400 pointer-events-none flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4`}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed read-only:bg-slate-50 ${
              sizeClasses[inputSize]
            } ${leftIcon ? iconPaddingLeft[inputSize] : ''} ${
              rightIcon ? iconPaddingRight[inputSize] : ''
            } ${
              error
                ? 'border-rose-300 text-rose-900 placeholder:text-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <span
              className={`absolute ${iconPositionRight[inputSize]} text-slate-400 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4`}
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
