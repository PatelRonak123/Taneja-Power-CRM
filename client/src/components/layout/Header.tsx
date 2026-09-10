import React from 'react';
import { useAuthStore } from '../../stores/authStore';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <header className="app-header">
      <div className="header-left">
        <h2 className="header-title">Enterprise Power Asset Management</h2>
      </div>
      <div className="header-right">
        <div className="system-status-pill">
          <span className="status-dot"></span>
          <span className="status-text">Grid Connected</span>
        </div>
        {user ? (
          <div className="user-profile-menu">
            <div className="user-info">
              <span className="user-name">{user.fullName}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <button onClick={logout} className="logout-btn">
              Sign Out
            </button>
          </div>
        ) : (
          <div className="guest-badge">Demo Mode</div>
        )}
      </div>
    </header>
  );
};
