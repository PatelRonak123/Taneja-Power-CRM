import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { navigate, useCurrentPath } from '../../app/router/navigation';
import {
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuthStore();
  const currentPath = useCurrentPath();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  const getPageTitle = (path: string): string => {
    if (path === '/admin/dashboard' || path === '/admin') return 'Admin Dashboard';
    if (path === '/employees' || path === '/admin/employees') return 'Employee Management';
    if (path === '/employee/dashboard' || path === '/dashboard') return 'Employee Dashboard';
    if (path === '/products') return 'Equipment & Inventory';
    if (path === '/analytics') return 'Energy Telemetry';
    if (path === '/settings') return 'System Configuration';
    if (path === '/profile') return 'My Profile';
    return isAdmin ? 'Admin Dashboard' : 'Employee Dashboard';
  };

  const pageTitle = getPageTitle(currentPath);

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        {onToggleMobileMenu && (
          <button
            className="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <Menu size={20} />
          </button>
        )}
        <h2 className="header-title">{pageTitle}</h2>
      </div>
      <div className="header-right">

        {user ? (
          <div className="header-user-dropdown-wrapper" ref={dropdownRef}>
            <button
              className="user-profile-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className={`user-avatar-small ${user.role?.toLowerCase()}`}>
                {userInitials}
              </div>
              <div className="user-info">
                <span className="user-name">{user.fullName}</span>
                <span className="user-role">{user.role}</span>
              </div>
              <ChevronDown
                size={16}
                className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="header-dropdown-menu">
                <div className="dropdown-user-header">
                  <div className={`dropdown-avatar ${user.role?.toLowerCase()}`}>
                    {userInitials}
                  </div>
                  <div className="dropdown-user-details">
                    <span className="dropdown-name">{user.fullName}</span>
                    <span className="dropdown-email">{user.email}</span>
                    <span className={`dropdown-role-pill ${user.role?.toLowerCase()}`}>
                      {isAdmin ? <ShieldCheck size={12} /> : <Zap size={12} />}
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-menu-list">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate(isAdmin ? '/admin/dashboard' : '/employee/dashboard');
                    }}
                  >
                    <LayoutDashboard size={16} className="item-icon" />
                    <span>{isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}</span>
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/profile');
                    }}
                  >
                    <User size={16} className="item-icon" />
                    <span>My Profile</span>
                  </button>
                </div>

                <div className="dropdown-divider"></div>

                <button onClick={handleLogout} className="dropdown-item logout">
                  <LogOut size={16} className="item-icon" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="guest-badge">Demo Mode</div>
        )}
      </div>
    </header>
  );
};
