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

  const disabled = isSubmitting || isLoading;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-6 p-6 sm:p-8 bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-2xl backdrop-blur-2xl">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Welcome Back</h2>
        <p className="text-sm font-medium text-slate-400">Sign in to your Taneja Power workspace</p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium flex items-center gap-2.5" role="alert">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1" htmlFor="email-input">
            Work Email Address
          </label>
          <div className="relative flex items-center w-full h-12">
            <Mail className="absolute left-3.5 text-slate-400 pointer-events-none z-10" size={18} />
            <input
              id="email-input"
              type="email"
              style={{ paddingLeft: '44px' }}
              className={`w-full h-12 pr-4 bg-slate-950/80 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium ${
                error ? 'border-rose-500/60' : 'border-slate-800 hover:border-slate-700'
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

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1" htmlFor="password-input">
            Account Password
          </label>
          <div className="relative flex items-center w-full h-12">
            <Lock className="absolute left-3.5 text-slate-400 pointer-events-none z-10" size={18} />
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              style={{ paddingLeft: '44px', paddingRight: '44px' }}
              className={`w-full h-12 bg-slate-950/80 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium ${
                error ? 'border-rose-500/60' : 'border-slate-800 hover:border-slate-700'
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
              className="absolute right-3.5 text-slate-400 hover:text-slate-200 p-1 cursor-pointer transition-colors z-10"
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
          className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer border border-blue-500/30 disabled:opacity-50 mt-1"
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
      </form>
    </div>
  );
};




