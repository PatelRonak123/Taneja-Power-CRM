import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './app/providers/queryClient';
import { AppRouter } from './app/router';
import { useAuthStore } from './stores/authStore';
import { ToastContainer } from './components/ui/ToastContainer';
import { ConfirmModalContainer } from './components/ui/ConfirmModalContainer';

const AppContent: React.FC = () => {
  const { isInitialized, initializeAuth } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  return <AppRouter />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <ToastContainer />
      <ConfirmModalContainer />
    </QueryClientProvider>
  );
};

export default App;
