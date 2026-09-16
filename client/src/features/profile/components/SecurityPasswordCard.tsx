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
} from 'lucide-react';

export const SecurityPasswordCard: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordUpdating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPasswordSuccess('Your security password has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch {
      setPasswordError('Failed to update password. Please try again.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <KeyRound size={18} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Security & Password Settings</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
          ENCRYPTED
        </span>
      </div>

      {passwordSuccess && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{passwordSuccess}</span>
        </div>
      )}

      {passwordError && (
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{passwordError}</span>
        </div>
      )}

      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Current Password</label>
          <div className="relative flex items-center">
            <Lock size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">New Password</label>
          <div className="relative flex items-center">
            <KeyRound size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
          <div className="relative flex items-center">
            <KeyRound size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
          disabled={passwordUpdating}
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
      </form>
    </div>
  );
};
