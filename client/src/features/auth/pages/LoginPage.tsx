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
    <div className="h-screen w-full flex items-stretch bg-gradient-to-br from-[#f0f6fd] via-[#e5f0fc] to-[#d6e7fc] text-slate-900 relative overflow-hidden">
      {/* Left Column: Brand & Showcase Panel */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[62%] h-full relative overflow-hidden p-6 sm:p-10 lg:p-12 flex-col justify-between">
        <LoginBrandPanel />
      </div>

      {/* Right Column: Premium White Card Panel */}
      <div className="w-full lg:w-[42%] xl:w-[38%] h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 z-20">
        <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default LoginPage;
