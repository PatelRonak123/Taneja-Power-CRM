import React, { useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { LoginBrandPanel } from '../components/LoginBrandPanel';
import { LoginForm } from '../components/LoginForm';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, isAuthenticated, isInitialized, initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isAuthenticated && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  const handleLoginSubmit = async (credentials: { email: string; password: string }) => {
    await login(credentials);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Connecting to Taneja Power System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-950">
      {/* Left Column: Brand & Info Showcase Panel */}
      <div className="lg:col-span-6 xl:col-span-7 bg-slate-950 text-white relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-slate-800/80">
        <LoginBrandPanel />
      </div>

      {/* Right Column: Premium Dark Form Panel */}
      <div className="lg:col-span-6 xl:col-span-5 bg-[#090d16] flex items-center justify-center p-6 sm:p-12 lg:p-14 min-h-screen">
        <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default LoginPage;



