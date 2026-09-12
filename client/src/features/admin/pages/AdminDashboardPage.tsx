import React from 'react';
import { navigate } from '../../../app/router/navigation';
import { ShieldCheck, Activity, Users, Lock } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {

  return (
    <div className="admin-dashboard-page">
      {/* Admin Dashboard Header */}
      <div className="admin-dashboard-header">
        <div className="admin-header-title-group">
          <div className="admin-badge-row">
            <span className="admin-badge">
              <ShieldCheck size={14} /> ADMIN PRIVILEGES ACTIVE
            </span>
          </div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">
            System administration control center for workspace policies, user roles, and platform telemetry.
          </p>
        </div>
      </div>

      {/* Dashboard Canvas Container */}
      <div className="admin-dashboard-canvas">
        <div
          className="admin-widget-card clickable-widget"
          onClick={() => navigate('/employees')}
          style={{ cursor: 'pointer' }}
        >
          <div className="widget-header">
            <div className="widget-title-group">
              <Users size={18} className="widget-icon" />
              <h3>Employee Management & User Controls</h3>
            </div>
            <span className="widget-tag active-tag">Manage Staff</span>
          </div>
          <div className="widget-placeholder-body">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              View employee roster, add new staff credentials to DB, assign user roles (Admin, Manager, User), and manage system access.
            </p>
            <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 600 }}>
              Open Employee Management →
            </div>
          </div>
        </div>

        <div className="admin-widget-card empty-widget">
          <div className="widget-header">
            <div className="widget-title-group">
              <Activity size={18} className="widget-icon" />
              <h3>System Performance & Activity</h3>
            </div>
            <span className="widget-tag">Ready</span>
          </div>
          <div className="widget-placeholder-body">
            <p>Admin telemetry and system activity metrics.</p>
          </div>
        </div>

        <div className="admin-widget-card empty-widget">
          <div className="widget-header">
            <div className="widget-title-group">
              <Lock size={18} className="widget-icon" />
              <h3>Security & Audit Logs</h3>
            </div>
            <span className="widget-tag">Ready</span>
          </div>
          <div className="widget-placeholder-body">
            <p>Security logs space</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
