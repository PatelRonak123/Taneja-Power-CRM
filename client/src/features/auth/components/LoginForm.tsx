import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>;
  isLoading: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ email, password });
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (role: 'admin' | 'employee') => {
    if (role === 'admin') {
      setEmail('admin@tanejapower.com');
      setPassword('Admin@123456');
    } else {
      setEmail('employee@tanejapower.com');
      setPassword('Employee@123456');
    }
    setError(null);
  };

  const disabled = isSubmitting || isLoading;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-sm text-slate-500">Sign in to your Taneja Power industrial workspace</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="email-input">
              Work Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 text-slate-400 pointer-events-none" size={18} />
              <input
                id="email-input"
                type="email"
                className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  error ? 'border-rose-300' : 'border-slate-200'
                }`}
                placeholder="admin@tanejapower.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="password-input">
              Account Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-slate-400 pointer-events-none" size={18} />
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  error ? 'border-rose-300' : 'border-slate-200'
                }`}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={disabled}
              />
              <button
                type="button"
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            disabled={disabled}
          >
            {disabled ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Authenticating...
              </span>
            ) : (
              <span>Sign In to System</span>
            )}
          </button>

          {/* Quick Demo Credentials Access */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Quick Demo Access</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg text-slate-700 shadow-2xs transition-colors cursor-pointer"
                  onClick={() => fillDemo('admin')}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg text-slate-700 shadow-2xs transition-colors cursor-pointer"
                  onClick={() => fillDemo('employee')}
                >
                  User
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono bg-white px-3 py-2 rounded-lg border border-slate-100">
              <span>admin@tanejapower.com</span>
              <span>Admin@123456</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
