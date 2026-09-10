import React from 'react';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
}) => {
  return (
    <div className="error-alert">
      <div className="error-alert-content">
        <div className="error-alert-icon">⚠️</div>
        <div>
          <h4 className="error-alert-title">{title}</h4>
          <p className="error-alert-message">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="error-retry-btn">
          Try Again
        </button>
      )}
    </div>
  );
};
