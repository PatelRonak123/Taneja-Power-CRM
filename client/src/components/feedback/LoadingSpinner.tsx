import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  size = 'md',
}) => {
  return (
    <div className={`loading-container loading-${size}`}>
      <div className="spinner" />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};
