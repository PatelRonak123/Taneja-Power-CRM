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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">⚠️</span>
        <div>
          <h4 className="text-sm font-bold text-rose-900">{title}</h4>
          <p className="text-xs text-rose-700 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center justify-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
