import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './app/providers/queryClient';
import { Layout } from './components/layout/Layout';
import { AppRouter } from './app/router';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <AppRouter />
      </Layout>
    </QueryClientProvider>
  );
};

export default App;
