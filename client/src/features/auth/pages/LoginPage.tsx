import React, { useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { LoginBrandPanel } from '../components/LoginBrandPanel';
import { LoginForm } from '../components/LoginForm';
import { ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, logout, user, isAuthenticated, isInitialized, initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.workType === 'FIELD' && user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
        logout();
      } else if (onLoginSuccess) {
        onLoginSuccess();
      }
    }
  }, [isAuthenticated, user, onLoginSuccess, logout]);

  const handleLoginSubmit = async (credentials: { email: string; password: string }) => {
    const authenticatedUser = await login(credentials);
    if (
      authenticatedUser?.workType === 'FIELD' &&
      authenticatedUser?.role !== 'ADMIN' &&
      authenticatedUser?.role !== 'MANAGER'
    ) {
      await logout();
      throw new Error(
        'Access restricted: Field personnel must use the Taneja Power Mobile Application. Access to the Web CRM portal is restricted to OFFICE staff.'
      );
    }
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-5 p-8 max-w-sm text-center">
          <div className="relative flex items-center justify-center">
            <div className="h-16 px-3 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-blue-600/20 border border-slate-200/20 overflow-hidden z-10">
              <img
                src="/logo.png"
                alt="Taneja Power Logo"
                className="h-11 w-auto object-contain"
                onError={(e) => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <div className="absolute -inset-3 border-2 border-blue-500/25 border-t-blue-500 rounded-3xl animate-spin pointer-events-none" />
          </div>

          <div className="space-y-2 mt-2">
            <h3 className="text-xl font-black text-white tracking-tight">Taneja Power CRM</h3>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-400 bg-blue-950/70 border border-blue-800/60 px-4 py-1.5 rounded-full shadow-inner">
              <ShieldCheck size={14} className="animate-pulse text-blue-400" />
              <span>Verifying authentication session...</span>
            </div>
          </div>

          <div className="w-44 h-1 bg-slate-800/80 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 w-2/3 rounded-full animate-pulse" />
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            Validating security tokens & permissions
          </p>
        </div>
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
