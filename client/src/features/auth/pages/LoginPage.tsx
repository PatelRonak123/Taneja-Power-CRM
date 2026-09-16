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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Connecting to Taneja Power System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800/40">
        {/* Left Column: Taneja Power Brand Showcase */}
        <div className="lg:col-span-6 bg-slate-900 text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          <LoginBrandPanel />
        </div>

        {/* Right Column: Clean Corporate Form Panel */}
        <div className="lg:col-span-6 p-8 sm:p-12 bg-white flex items-center justify-center">
          <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
