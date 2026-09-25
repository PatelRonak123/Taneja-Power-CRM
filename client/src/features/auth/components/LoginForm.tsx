import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from '../../../utils/toast';

interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>;
  isLoading: boolean;
}

type ViewState = 'LOGIN' | 'FORGOT_EMAIL' | 'VERIFY_OTP' | 'RESET_PASSWORD';

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading }) => {
  const [viewState, setViewState] = useState<ViewState>('LOGIN');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [otpStatus, setOtpStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const resetOtp = () => {
    setOtpDigits(['', '', '', '']);
    setOtpStatus('idle');
  };

  // Focus the first OTP box when entering VERIFY_OTP view
  useEffect(() => {
    if (viewState === 'VERIFY_OTP') {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [viewState]);

  // 1. Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      toast.warning('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      toast.warning('Password Required', 'Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ email, password });
      toast.success('Signed In Successfully', 'Welcome back to Taneja Power Systems');
    } catch (err: any) {
      const errMsg = err?.message || 'Invalid email or password.';
      setError(errMsg);
      toast.error('Authentication Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Send OTP Handler (Forgot Password)
  const handleSendOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email || !email.includes('@')) {
      setError('Please enter your valid registered email address.');
      toast.warning('Invalid Email', 'Please enter your valid registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to send OTP code.');
      }

      // NO AUTO-FILL: Keep OTP boxes empty
      resetOtp();
      setViewState('VERIFY_OTP');
      const msg =
        data?.data?.message ||
        data?.message ||
        `A 4-digit verification code has been sent to ${email}`;
      setSuccessMessage(msg);
      toast.success('OTP Code Sent', `A 4-digit verification code has been sent to ${email}`);
    } catch (err: any) {
      const errMsg = err?.message || 'Unable to send OTP. Please check your email.';
      setError(errMsg);
      toast.error('Failed to Send OTP', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP Box Key/Change Handlers
  const handleOtpChange = (index: number, val: string) => {
    const rawVal = val.replace(/\D/g, '');
    const updated = [...otpDigits];

    // If user pasted or entered multiple numbers into a box
    if (rawVal.length > 1) {
      const chars = rawVal.slice(0, 4).split('');
      chars.forEach((c, i) => {
        if (index + i < 4) updated[index + i] = c;
      });
      setOtpDigits(updated);
      setOtpStatus('idle');
      setError(null);
      const targetIdx = Math.min(index + chars.length, 3);
      inputRefs.current[targetIdx]?.focus();
      return;
    }

    updated[index] = rawVal.slice(-1);
    setOtpDigits(updated);
    setOtpStatus('idle');
    setError(null);

    // Auto-advance to next box if character was entered
    if (rawVal && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const updated = [...otpDigits];
        updated[index - 1] = '';
        setOtpDigits(updated);
        setOtpStatus('idle');
        setError(null);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const updated = ['', '', '', ''];
    pasted.split('').forEach((char, idx) => {
      updated[idx] = char;
    });
    setOtpDigits(updated);
    setOtpStatus('idle');
    setError(null);

    const focusIdx = Math.min(pasted.length, 3);
    inputRefs.current[focusIdx]?.focus();
  };

  // 3. Verify OTP Handler
  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetMessages();

    const otpCode = otpDigits.join('');
    if (!otpCode || otpCode.length !== 4) {
      setOtpStatus('invalid');
      setError('Please enter the 4-digit OTP code sent to your email.');
      toast.warning('Incomplete Code', 'Please enter all 4 digits of the OTP code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        setOtpStatus('invalid');
        throw new Error(data?.message || 'Invalid OTP code.');
      }

      setOtpStatus('valid');
      setSuccessMessage('OTP code verified successfully!');
      toast.success('OTP Verified', 'Verification code confirmed. You can now reset your password.');

      // Give a brief moment to show green confirmation before navigating
      setTimeout(() => {
        setViewState('RESET_PASSWORD');
        setSuccessMessage('OTP code verified successfully! Enter your new password below.');
      }, 700);
    } catch (err: any) {
      setOtpStatus('invalid');
      const errMsg = err?.message || 'Invalid 4-digit OTP code.';
      setError(errMsg);
      toast.error('Verification Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Reset Password Handler
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      toast.warning('Password Too Short', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter.');
      toast.error('Passwords Do Not Match', 'Please ensure both password fields match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpDigits.join(''), newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to reset password.');
      }

      setViewState('LOGIN');
      setPassword('');
      resetOtp();
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password updated successfully! Please sign in with your new password.');
      toast.success('Password Updated', 'Your password has been changed successfully. Please sign in.');
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to update password.';
      setError(errMsg);
      toast.error('Password Update Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isSubmitting || isLoading;

  // View: FORGOT_EMAIL (Matches user's screenshot layout)
  if (viewState === 'FORGOT_EMAIL') {
    return (
      <div className="w-full max-w-105 mx-auto flex flex-col gap-5 p-6 sm:p-8 bg-white border border-slate-100 rounded-4xl shadow-2xl shadow-blue-900/10 animate-fade-in">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Forgot password?
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            Enter your email and we'll send a 4-digit verification OTP.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSendOtpSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block" htmlFor="forgot-email-input">
              Email Address
            </label>
            <div className="relative flex items-center w-full h-12">
              <Mail className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
              <input
                id="forgot-email-input"
                type="email"
                style={{ paddingLeft: '46px' }}
                className="w-full h-12 pr-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all font-medium"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            <span className="text-[11px] text-slate-400 font-normal">
              Enter the email address associated with your account
            </span>
          </div>

          <button
            type="submit"
            className="w-full h-12 mt-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-2xl text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer border border-blue-500/30 disabled:opacity-50"
            disabled={disabled}
          >
            {disabled ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending OTP...
              </span>
            ) : (
              <span>Send OTP</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              resetOtp();
              setViewState('LOGIN');
            }}
            className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors py-1 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back to Login</span>
          </button>
        </form>

        {/* Security Notice Box */}
        <div className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex flex-col gap-2 mt-1">
          <h4 className="text-xs font-bold text-slate-800">Security Notice</h4>
          <ul className="text-[11px] text-slate-500 space-y-1 leading-relaxed">
            <li>• OTP is valid for 5 minutes only</li>
            <li>• If you don't have an account, no email will be sent</li>
            <li>• Check your spam folder if you don't see the email</li>
            <li>• Contact support if you continue having issues</li>
          </ul>
        </div>
      </div>
    );
  }

  // View: VERIFY_OTP (Step 2: 4-Digit OTP Code Verification)
  if (viewState === 'VERIFY_OTP') {
    return (
      <div className="w-full max-w-105 mx-auto flex flex-col gap-5 p-6 sm:p-8 bg-white border border-slate-100 rounded-4xl shadow-2xl shadow-blue-900/10 animate-fade-in">
        <div className="flex flex-col gap-1.5 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify OTP
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            Enter the 4-digit code sent to <br />
            <strong className="text-slate-800 break-all">{email}</strong>
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2" role="alert">
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 items-center">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block self-start sm:self-center">
              4-DIGIT VERIFICATION CODE
            </label>

            {/* 4 small boxes */}
            <div className={`flex items-center justify-center gap-3 sm:gap-4 my-1 ${otpStatus === 'invalid' ? 'animate-shake' : ''}`}>
              {otpDigits.map((digit, idx) => {
                let boxClasses = 'border-slate-200 bg-slate-50/80 text-slate-800 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/15';

                if (otpStatus === 'valid') {
                  boxClasses = 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/20';
                } else if (otpStatus === 'invalid') {
                  boxClasses = 'border-rose-500 bg-rose-50 text-rose-600 ring-4 ring-rose-500/20';
                } else if (digit) {
                  boxClasses = 'border-blue-600 bg-white text-slate-900 ring-2 ring-blue-600/10 shadow-xs';
                }

                return (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    disabled={disabled}
                    className={`w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl font-black text-center rounded-2xl border-2 transition-all duration-200 outline-none select-none ${boxClasses} disabled:opacity-50`}
                  />
                );
              })}
            </div>

            <span className="text-[11px] text-slate-400 font-normal text-center">
              Code is valid for 5 minutes
            </span>
          </div>

          <button
            type="submit"
            className={`w-full h-12 mt-1 flex items-center justify-center gap-2 text-white font-bold rounded-2xl text-sm shadow-md transition-all cursor-pointer border disabled:opacity-50 ${
              otpStatus === 'valid'
                ? 'bg-emerald-600 border-emerald-500 shadow-emerald-600/20'
                : otpStatus === 'invalid'
                ? 'bg-rose-600 border-rose-500 shadow-rose-600/20'
                : 'bg-blue-600 hover:bg-blue-700 border-blue-500/30 shadow-blue-600/20 active:scale-[0.99]'
            }`}
            disabled={disabled || otpDigits.join('').length !== 4}
          >
            {disabled ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...
              </span>
            ) : otpStatus === 'valid' ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} /> Verified
              </span>
            ) : (
              <>
                <span>Verify OTP</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs font-semibold pt-1">
            <button
              type="button"
              onClick={handleSendOtpSubmit}
              className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              disabled={disabled}
            >
              Resend Code
            </button>
            <button
              type="button"
              onClick={() => {
                resetMessages();
                resetOtp();
                setViewState('LOGIN');
              }}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Login</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // View: RESET_PASSWORD (Step 3: New Password Entry)
  if (viewState === 'RESET_PASSWORD') {
    return (
      <div className="w-full max-w-105 mx-auto flex flex-col gap-5 p-6 sm:p-8 bg-white border border-slate-100 rounded-4xl shadow-2xl shadow-blue-900/10 animate-fade-in">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Set New Password
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            Create a strong new password for your account
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block" htmlFor="new-password-input">
              NEW PASSWORD
            </label>
            <div className="relative flex items-center w-full h-12">
              <Lock className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
              <input
                id="new-password-input"
                type={showNewPassword ? 'text' : 'password'}
                style={{ paddingLeft: '46px', paddingRight: '46px' }}
                className="w-full h-12 bg-slate-50 border border-slate-200/90 rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all font-medium"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={disabled}
              />
              <button
                type="button"
                className="absolute right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors z-10"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block" htmlFor="confirm-password-input">
              CONFIRM PASSWORD
            </label>
            <div className="relative flex items-center w-full h-12">
              <Lock className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
              <input
                id="confirm-password-input"
                type={showNewPassword ? 'text' : 'password'}
                style={{ paddingLeft: '46px' }}
                className="w-full h-12 pr-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all font-medium"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={disabled}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-2xl text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer border border-blue-500/30 disabled:opacity-50"
            disabled={disabled}
          >
            {disabled ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating Password...
              </span>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              setViewState('LOGIN');
            }}
            className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back to Login</span>
          </button>
        </form>
      </div>
    );
  }

  // View: LOGIN (Default view)
  return (
    <div className="w-full max-w-105 mx-auto flex flex-col gap-5 p-6 sm:p-8 bg-white border border-slate-100 rounded-4xl shadow-2xl shadow-blue-900/10">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome <span className="text-blue-600">Back</span>
        </h2>
        <p className="text-sm font-medium text-slate-500">Sign in to your Taneja Power workspace</p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2" role="alert">
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block" htmlFor="email-input">
            WORK EMAIL ADDRESS
          </label>
          <div className="relative flex items-center w-full h-12">
            <Mail className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
            <input
              id="email-input"
              type="email"
              style={{ paddingLeft: '46px' }}
              className={`w-full h-12 pr-4 bg-slate-50 border rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all font-medium ${error ? 'border-rose-400' : 'border-slate-200/80 hover:border-slate-300'
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

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block" htmlFor="password-input">
            ACCOUNT PASSWORD
          </label>
          <div className="relative flex items-center w-full h-12">
            <Lock className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              style={{ paddingLeft: '46px', paddingRight: '46px' }}
              className={`w-full h-12 bg-slate-50 border rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all font-medium ${error ? 'border-rose-400' : 'border-slate-200/80 hover:border-slate-300'
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
              className="absolute right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors z-10"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">Keep me signed in</span>
          </label>
          <button
            type="button"
            onClick={() => {
              resetMessages();
              setViewState('FORGOT_EMAIL');
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          className="w-full h-12 mt-2 flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 active:scale-[0.99] text-white font-bold rounded-2xl text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer border border-blue-500/30 disabled:opacity-50"
          disabled={disabled}
        >
          {disabled ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Authenticating...
            </span>
          ) : (
            <>
              <span>Sign In to System</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};




