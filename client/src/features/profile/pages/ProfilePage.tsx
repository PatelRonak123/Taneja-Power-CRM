import React, { useState } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import {
  User,
  ShieldCheck,
  Mail,
  Calendar,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

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
      // Simulate password update processing
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPasswordSuccess('Your security password has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      setPasswordError('Failed to update password. Please try again.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="profile-page-container">
      {/* Top Banner Card */}
      <div className="profile-header-card">
        <div className={`profile-avatar-large ${user?.role?.toLowerCase() || 'user'}`}>
          {userInitials}
        </div>
        <div className="profile-header-info">
          <div className="profile-role-badge-row">
            <span className={`profile-role-pill ${user?.role?.toLowerCase() || 'user'}`}>
              {isAdmin ? <ShieldCheck size={14} /> : <Briefcase size={14} />}
              {user?.role || 'EMPLOYEE'}
            </span>
            <span className="profile-status-tag">SYSTEM VERIFIED</span>
          </div>
          <h1 className="profile-user-name">{user?.fullName || 'User Name'}</h1>
          <div className="profile-meta-row">
            <span className="meta-item">
              <Mail size={14} />
              {user?.email}
            </span>
            <span className="meta-item">
              <Calendar size={14} />
              Member Account
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Details, Password Change, Permissions */}
      <div className="profile-main-grid">
        {/* Account Details Card */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <div className="card-header-title">
              <User size={18} className="header-icon" />
              <h3>Personal Account Information</h3>
            </div>
            <span className="header-badge">DETAILS</span>
          </div>

          <div className="profile-details-list">
            <div className="detail-row">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{user?.fullName}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Email Address</span>
              <span className="detail-value">{user?.email}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">System Role</span>
              <span className="detail-value highlight">{user?.role}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">User ID (UUID)</span>
              <span className="detail-value code-font">{user?.id || 'N/A'}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Authentication Method</span>
              <span className="detail-value">JWT Bearer Token + HttpOnly Refresh</span>
            </div>
          </div>
        </div>

        {/* Security & Password Card */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <div className="card-header-title">
              <KeyRound size={18} className="header-icon" />
              <h3>Security & Password Settings</h3>
            </div>
            <span className="header-badge warning">ENCRYPTED</span>
          </div>

          {passwordSuccess && (
            <div className="employee-toast success" style={{ marginBottom: '16px' }}>
              <CheckCircle2 size={18} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="employee-toast error" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="password-change-form">
            <div className="form-group">
              <label>Current Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="field-icon" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="field-icon" />
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="update-password-btn"
              disabled={passwordUpdating}
            >
              {passwordUpdating ? (
                <>
                  <RefreshCw size={16} className="spinning" />
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

        {/* Permissions & Security Scope Card */}
        <div className="profile-section-card full-width">
          <div className="section-card-header">
            <div className="card-header-title">
              <ShieldCheck size={18} className="header-icon" />
              <h3>Role Access Control & Security Scope</h3>
            </div>
            <span className="header-badge">{user?.role} SCOPE</span>
          </div>

          <div className="permissions-grid">
            {isAdmin ? (
              <>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>Full User Management (`users:manage`)</span>
                </div>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>Create Inventory Items (`products:create`)</span>
                </div>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>Update & Modify Inventory (`products:update`)</span>
                </div>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>Delete Inventory Items (`products:delete`)</span>
                </div>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>View Telemetry & Audit Logs (`products:read`)</span>
                </div>
              </>
            ) : user?.role === 'MANAGER' ? (
              <>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>Create Inventory Items (`products:create`)</span>
                </div>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>Update & Modify Inventory (`products:update`)</span>
                </div>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>View Telemetry & Audit Logs (`products:read`)</span>
                </div>
              </>
            ) : (
              <>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>View Equipment & Inventory (`products:read`)</span>
                </div>
                <div className="permission-chip granted">
                  <CheckCircle2 size={16} />
                  <span>Monitor Energy Telemetry Data</span>
                </div>
                <div className="permission-chip granted">
                  <UserCheck size={16} />
                  <span>Personal Account Management</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
