import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Semantic ERP button variants aligned with Phase 2 tokens
    const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs focus-visible:ring-blue-500',
      secondary:
        'bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white shadow-xs focus-visible:ring-slate-700',
      danger:
        'bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 focus-visible:ring-rose-400',
      destructive:
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs focus-visible:ring-rose-500',
      ghost:
        'bg-transparent hover:bg-slate-100 active:bg-slate-200/70 text-slate-700 focus-visible:ring-slate-400',
      outline:
        'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs focus-visible:ring-blue-500',
    };

    // Standard ERP control heights (32px, 36px, 42px) and typography
    const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
      md: 'h-9 px-3.5 text-[13px] gap-2 rounded-lg',
      lg: 'h-[42px] px-4.5 text-sm gap-2.5 rounded-lg',
    };

    const iconSizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: '[&>svg]:w-3.5 [&>svg]:h-3.5',
      md: '[&>svg]:w-4 [&>svg]:h-4',
      lg: '[&>svg]:w-[18px] [&>svg]:h-[18px]',
    };

    const spinnerSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-center whitespace-nowrap font-medium select-none transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-1 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span
            className={`${spinnerSize} border-2 border-current border-t-transparent rounded-full animate-spin shrink-0`}
            aria-hidden="true"
          />
        ) : (
          leftIcon && (
            <span
              className={`shrink-0 inline-flex items-center justify-center ${iconSizeClasses[size]}`}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )
        )}
        {children}
        {!isLoading && rightIcon && (
          <span
            className={`shrink-0 inline-flex items-center justify-center ${iconSizeClasses[size]}`}
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
