import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';
import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import { toast } from '../../../utils/toast';

export const SecurityPasswordCard: React.FC = () => {
  // Step 1: Current Password & Verification
  const [currentPassword, setCurrentPassword] = useState('');
  const [isCurrentVerified, setIsCurrentVerified] = useState(false);
  const [verifyingCurrent, setVerifyingCurrent] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Step 2: New Password & Confirmation
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form & Feedback States
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 1. Verify Current Password Step
  const handleVerifyCurrentPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password to continue.');
      toast.warning('Password Required', 'Please enter your current password.');
      return;
    }

    setVerifyingCurrent(true);
    try {
      await apiClient.post('/auth/verify-current-password', { currentPassword });
      setIsCurrentVerified(true);
      toast.success('Password Verified', 'Current password is correct. You can now set your new password.');
    } catch (err: any) {
      setIsCurrentVerified(false);
      const errMsg = err?.message || 'Current password is incorrect. Please try again.';
      setPasswordError(errMsg);
      toast.error('Verification Failed', errMsg);
    } finally {
      setVerifyingCurrent(false);
    }
  };

  // Reset verification to allow re-entering current password
  const handleResetVerification = () => {
    setIsCurrentVerified(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  // 2. Update Password Step
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!isCurrentVerified) {
      setPasswordError('Please verify your current password first.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      toast.warning('Invalid Password', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      toast.warning('Identical Password', 'New password cannot be the same as your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      toast.warning('Password Mismatch', 'New password and confirmation password do not match.');
      return;
    }

    setPasswordUpdating(true);
    try {
      const response = (await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      })) as unknown as ApiEnvelope<{ message: string }>;

      const successMsg = response.message || 'Your security password has been updated successfully! Next time you sign in, use your new password.';
      setPasswordSuccess(successMsg);
      toast.success('Password Updated', 'Your password has been changed. Next time you sign in, use your new password.');

      // Clear all fields & reset to initial clean state
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsCurrentVerified(false);

      setTimeout(() => setPasswordSuccess(null), 8000);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to update password. Please check your inputs and try again.';
      setPasswordError(errMsg);
      toast.error('Update Failed', errMsg);
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Live validation checks for Step 2
  const hasMinLength = newPassword.length >= 6;
  const isDifferentFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && isDifferentFromCurrent && passwordsMatch;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <KeyRound size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Security & Password Settings</h3>
            <p className="text-xs text-slate-500">Update your account authentication credentials</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
          BCRYPT ENCRYPTED
        </span>
      </div>

      {/* Success Alert Banner */}
      {passwordSuccess && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-emerald-900">Password Updated Successfully</p>
            <p className="text-emerald-700">{passwordSuccess}</p>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {passwordError && (
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium animate-fade-in">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{passwordError}</span>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-2 py-1 select-none">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            isCurrentVerified
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {isCurrentVerified ? (
            <Check size={13} className="text-emerald-600 stroke-[3]" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              1
            </span>
          )}
          <span>Verify Current Password</span>
        </div>

        <ArrowRight size={14} className="text-slate-300" />

        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            isCurrentVerified
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'bg-slate-100 text-slate-400 border border-slate-200'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              isCurrentVerified ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
            }`}
          >
            2
          </span>
          <span>Set New Password</span>
        </div>
      </div>

      {/* STEP 1: Current Password Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">Current Password</label>
          {isCurrentVerified && (
            <button
              type="button"
              onClick={handleResetVerification}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Change current password</span>
            </button>
          )}
        </div>

        <div className="relative flex items-center">
          <Lock size={16} className={`absolute left-3.5 pointer-events-none ${isCurrentVerified ? 'text-emerald-500' : 'text-slate-400'}`} />
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            placeholder="Enter your current account password"
            value={currentPassword}
            disabled={isCurrentVerified || verifyingCurrent}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isCurrentVerified) {
                e.preventDefault();
                handleVerifyCurrentPassword();
              }
            }}
            className={`w-full pl-10 pr-24 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
              isCurrentVerified
                ? 'bg-emerald-50/50 border border-emerald-300 text-slate-800 font-medium'
                : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            }`}
          />

          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              title={showCurrentPassword ? 'Hide password' : 'Show password'}
            >
              {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            {!isCurrentVerified && (
              <button
                type="button"
                onClick={() => handleVerifyCurrentPassword()}
                disabled={verifyingCurrent || !currentPassword.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {verifyingCurrent ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify</span>
                )}
              </button>
            )}

            {isCurrentVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                <Check size={12} className="stroke-[3]" />
                <span>Verified</span>
              </span>
            )}
          </div>
        </div>

        {!isCurrentVerified && (
          <p className="text-[11px] text-slate-500">
            For security, please enter and verify your current password before setting a new one.
          </p>
        )}
      </div>

      {/* STEP 2: New Password & Confirm Password (Unlocked when verified) */}
      {isCurrentVerified ? (
        <form onSubmit={handlePasswordChange} className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
          {/* New Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">New Password</label>
            <div className="relative flex items-center">
              <KeyRound size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                autoFocus
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                onClick={() => setShowNewPassword(!showNewPassword)}
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
            <div className="relative flex items-center">
              <KeyRound size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Live Validation Hints */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs select-none">
            <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">Password Requirements</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                {hasMinLength ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                <span>At least 6 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isDifferentFromCurrent ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                {isDifferentFromCurrent ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                <span>Different from current</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                {passwordsMatch ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={passwordUpdating || !isFormValid}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordUpdating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetVerification}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* Disabled placeholder state before Step 1 is verified */
        <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center space-y-1">
          <div className="flex items-center justify-center text-slate-400 gap-1.5 text-xs font-medium">
            <Lock size={14} />
            <span>New password fields will unlock once current password is verified</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityPasswordCard;
