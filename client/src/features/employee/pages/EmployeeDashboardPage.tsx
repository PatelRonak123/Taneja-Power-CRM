import React from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { navigate } from '../../../app/router/navigation';
import {
  Zap,
  Activity,
  PackageCheck,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'EMP';

  return (
    <div className="employee-dashboard-page">
      {/* Welcome Banner Header */}
      <div className="employee-welcome-banner">
        <div className="welcome-avatar-badge">{userInitials}</div>
        <div className="welcome-text-content">
          <div className="welcome-badge-row">
            <span className="status-badge-online">
              <span className="pulse-green-dot"></span> OPERATIONAL SESSION ACTIVE
            </span>
          </div>
          <h1 className="welcome-title">Welcome back, {user?.fullName || 'Employee'}!</h1>
          <p className="welcome-subtitle">
            Taneja Power Operations & Equipment Management Portal. Monitoring grid assets, stock inventory, and telemetry diagnostics.
          </p>
        </div>

        <button
          className="welcome-profile-btn"
          onClick={() => navigate('/profile')}
        >
          <User size={16} />
          <span>My Profile</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="employee-metrics-grid">
        <div className="metric-card clickable" onClick={() => navigate('/products')}>
          <div className="metric-icon-bg total">
            <Zap size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Equipment Inventory</span>
            <span className="metric-value">Active Grid</span>
          </div>
          <ArrowRight size={16} className="metric-arrow" />
        </div>

        <div className="metric-card">
          <div className="metric-icon-bg user">
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">System Health</span>
            <span className="metric-value">99.8% Nominal</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-bg manager">
            <Activity size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Power Telemetry</span>
            <span className="metric-value">50.02 Hz</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-bg admin">
            <ShieldCheck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Security Tier</span>
            <span className="metric-value">Level 2 Verified</span>
          </div>
        </div>
      </div>

      {/* Dashboard Content Grid */}
      <div className="employee-dashboard-grid">
        {/* Quick Actions Card */}
        <div className="dashboard-section-card">
          <div className="section-card-header">
            <div className="card-header-title">
              <Zap size={18} className="header-icon" />
              <h3>Operations & Quick Actions</h3>
            </div>
            <span className="header-badge">Shortcuts</span>
          </div>

          <div className="quick-actions-grid">
            <button
              className="action-tile-btn"
              onClick={() => navigate('/products')}
            >
              <div className="tile-icon-wrapper">
                <PackageCheck size={20} />
              </div>
              <div className="tile-text">
                <span className="tile-title">Browse Inventory</span>
                <span className="tile-desc">Search equipment, transformers & power units</span>
              </div>
              <ArrowRight size={16} className="tile-arrow" />
            </button>

            <button
              className="action-tile-btn"
              onClick={() => navigate('/analytics')}
            >
              <div className="tile-icon-wrapper analytics">
                <TrendingUp size={20} />
              </div>
              <div className="tile-text">
                <span className="tile-title">Energy Telemetry</span>
                <span className="tile-desc">Monitor real-time load analytics & frequency</span>
              </div>
              <ArrowRight size={16} className="tile-arrow" />
            </button>

            <button
              className="action-tile-btn"
              onClick={() => navigate('/profile')}
            >
              <div className="tile-icon-wrapper profile">
                <User size={20} />
              </div>
              <div className="tile-text">
                <span className="tile-title">Account & Security</span>
                <span className="tile-desc">Manage profile details & change password</span>
              </div>
              <ArrowRight size={16} className="tile-arrow" />
            </button>
          </div>
        </div>

        {/* Recent Activity & System Logs Feed */}
        <div className="dashboard-section-card">
          <div className="section-card-header">
            <div className="card-header-title">
              <Clock size={18} className="header-icon" />
              <h3>System Activity & Logs</h3>
            </div>
            <span className="header-badge live">LIVE FEED</span>
          </div>

          <div className="activity-feed-list">
            <div className="feed-item">
              <div className="feed-dot active"></div>
              <div className="feed-content">
                <div className="feed-title">User Authentication Validated</div>
                <div className="feed-desc">Session established for {user?.email}</div>
                <div className="feed-time">Just now</div>
              </div>
            </div>

            <div className="feed-item">
              <div className="feed-dot info"></div>
              <div className="feed-content">
                <div className="feed-title">Database Sync Operational</div>
                <div className="feed-desc">PostgreSQL connection pool healthy (Drizzle ORM)</div>
                <div className="feed-time">10 mins ago</div>
              </div>
            </div>

            <div className="feed-item">
              <div className="feed-dot info"></div>
              <div className="feed-content">
                <div className="feed-title">Inventory Catalog Refreshed</div>
                <div className="feed-desc">Power equipment records synchronized</div>
                <div className="feed-time">1 hour ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
