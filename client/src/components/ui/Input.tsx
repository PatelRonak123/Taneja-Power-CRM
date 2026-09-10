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
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper">
        {leftIcon && <span className="input-left-icon">{leftIcon}</span>}
        <input
          id={inputId}
          className={`input-control ${leftIcon ? 'has-left-icon' : ''} ${error ? 'is-error' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="input-error">{error}</p>}
      {!error && helperText && <p className="input-helper">{helperText}</p>}
    </div>
  );
};
