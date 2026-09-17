import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { ShieldCheck } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectToLogin?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectToLogin }) => {
  const { isAuthenticated, isInitialized, initializeAuth } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated && redirectToLogin) {
      redirectToLogin();
    }
  }, [isInitialized, isAuthenticated, redirectToLogin]);

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white select-none">
        {/* Subtle Background Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-5 p-8 max-w-sm text-center">
          {/* Company Logo Container matching Sidebar Header */}
          <div className="relative flex items-center justify-center">
            <div className="h-16 px-3 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-blue-600/20 border border-slate-200/20 overflow-hidden z-10">
              <img
                src="/logo.png"
                alt="Taneja Power Logo"
                className="h-11 w-auto object-contain"
                onError={(e) => {
                  // Fallback icon if image fails to load
                  const target = e.currentTarget as HTMLElement;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.innerHTML = '<div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>';
                  }
                }}
              />
            </div>
            <div className="absolute -inset-3 border-2 border-blue-500/25 border-t-blue-500 rounded-3xl animate-spin pointer-events-none" />
          </div>

          {/* Title & Status Info */}
          <div className="space-y-2 mt-2">
            <h3 className="text-xl font-black text-white tracking-tight">Taneja Power CRM</h3>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-400 bg-blue-950/70 border border-blue-800/60 px-4 py-1.5 rounded-full shadow-inner">
              <ShieldCheck size={14} className="animate-pulse text-blue-400" />
              <span>Verifying authentication session...</span>
            </div>
          </div>

          {/* Smooth Loading Indicator */}
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

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
