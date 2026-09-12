import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { navigate, useCurrentPath } from '../../app/router/navigation';
import {
  ShieldCheck,
  Users,
  Home,
  Zap,
  BarChart3,
  Settings,
  User,
  MessageSquare,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user } = useAuthStore();
  const currentPath = useCurrentPath();
  const isAdmin = user?.role === 'ADMIN';

  const handleNavClick = (path: string) => {
    navigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const coreNavItems = [
    ...(!isAdmin
      ? [{ id: 'employee-dashboard', path: '/employee/dashboard', label: 'Employee Dashboard', icon: Home }]
      : []),
    { id: 'products', path: '/products', label: 'Equipment & Inventory', icon: Zap },
    { id: 'analytics', path: '/analytics', label: 'Energy Telemetry', icon: BarChart3 },
    { id: 'settings', path: '/settings', label: 'System Configuration', icon: Settings },
    { id: 'profile', path: '/profile', label: 'My Profile', icon: User },
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'is-mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo-badge">
          <img
            src="/logo.png"
            alt="Taneja Power Logo"
            className="sidebar-logo-img"
            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
          />
        </div>
        {/* <div className="brand-logo">TP</div> */}
        <div className="brand-info">
          <h1 className="brand-name">Taneja Power</h1>
          <span className="brand-tag">Industrial Solutions</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {isAdmin && (
          <>
            <div className="nav-section-title">ADMINISTRATION</div>
            <button
              key="admin-dashboard"
              className={`nav-link ${currentPath === '/admin/dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('/admin/dashboard')}
            >
              <ShieldCheck size={18} className="nav-icon" />
              <span className="nav-label">Admin Dashboard</span>
            </button>
            <button
              key="employee-management"
              className={`nav-link ${currentPath === '/employees' || currentPath === '/admin/employees' ? 'active' : ''}`}
              onClick={() => handleNavClick('/employees')}
            >
              <Users size={18} className="nav-icon" />
              <span className="nav-label">Employee Management</span>
            </button>
            <button
              key="whatsapp-integration"
              className={`nav-link ${currentPath === '/admin/whatsapp' || currentPath === '/whatsapp' ? 'active' : ''}`}
              onClick={() => handleNavClick('/admin/whatsapp')}
            >
              <MessageSquare size={18} className="nav-icon" />
              <span className="nav-label">WhatsApp Integration</span>
            </button>
          </>
        )}

        <div className="nav-section-title">CORE MODULES</div>
        {coreNavItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-link ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path)}
            >
              <IconComponent size={18} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
