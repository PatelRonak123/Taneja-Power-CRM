import React from 'react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: 'products', label: 'Equipment & Inventory', icon: '⚡' },
    { id: 'analytics', label: 'Energy Telemetry', icon: '📊' },
    { id: 'settings', label: 'System Configuration', icon: '⚙️' },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">TP</div>
        <div className="brand-info">
          <h1 className="brand-name">Taneja Power</h1>
          <span className="brand-tag">Industrial Solutions</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">CORE MODULES</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="environment-badge">
          <span className="env-dot"></span>
          <span>PostgreSQL · Drizzle ORM</span>
        </div>
      </div>
    </aside>
  );
};
