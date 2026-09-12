import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Activity, Cpu } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, isAuthenticated, isInitialized, initializeAuth, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isAuthenticated && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (role: 'admin' | 'employee') => {
    if (role === 'admin') {
      setEmail('admin@tanejapower.com');
      setPassword('Admin@123456');
    } else {
      setEmail('employee@tanejapower.com');
      setPassword('Employee@123456');
    }
    setError(null);
  };

  if (!isInitialized) {
    return (
      <div className="login-loading-screen">
        <div className="spinner" />
        <p className="loading-text">Connecting to Taneja Power System...</p>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      <div className="login-wrapper">
        {/* Left Column: Taneja Power Brand Showcase */}
        <div className="login-brand-panel">
          <div className="brand-glow-effect" />

          <div className="brand-header">
            <img
              src="/logo.png"
              alt="Taneja Power Logo"
              className="brand-logo-img"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
            />
            {/* <div className="brand-logo-large">
              TP
            </div> */}
            <div className="brand-title-group">
              <h1 className="brand-title">TANEJA POWER</h1>
              <span className="brand-badge">ENTERPRISE CRM</span>
            </div>
          </div>

          <div className="brand-content">
            <h2 className="brand-headline">
              Industrial Power Grid & CRM Management Portal
            </h2>
            <p className="brand-description">
              Streamline enterprise power asset tracking, equipment inventory control, staff management, and real-time telemetry diagnostics.
            </p>

            <div className="brand-features">
              <div className="feature-item">
                <div className="feature-icon">
                  <ShieldCheck size={20} />
                </div>
                <div className="feature-text">
                  <strong>Role-Based Access Control</strong>
                  <span>Enterprise JWT authentication with RBAC user permission enforcement</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <Cpu size={20} />
                </div>
                <div className="feature-text">
                  <strong>Heavy Power Equipment Catalog</strong>
                  <span>Real-time monitoring of generators, transformers & industrial switchgear</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <Activity size={20} />
                </div>
                <div className="feature-text">
                  <strong>Live Energy Telemetry</strong>
                  <span>Grid load analytics, fault diagnostics, and status synchronization</span>
                </div>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>&copy; {new Date().getFullYear()} Taneja Power Systems Inc.</span>
          </div>
        </div>

        {/* Right Column: Full-Height Clean Corporate Form Panel */}
        <div className="login-form-panel">
          <div className="form-card">
            <div className="form-header">
              <h2 className="form-title">Welcome Back</h2>
              <p className="form-subtitle">Sign in to your Taneja Power industrial workspace</p>
            </div>

            {error && (
              <div className="form-error-alert" role="alert">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label className="input-label" htmlFor="email-input">
                  Work Email Address
                </label>
                <div className="input-with-icon">
                  <Mail className="field-icon" size={18} />
                  <input
                    id="email-input"
                    type="email"
                    className={`input-control ${error ? 'is-error' : ''}`}
                    placeholder="admin@tanejapower.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={isSubmitting || isLoading}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="password-input">
                  Account Password
                </label>
                <div className="input-with-icon">
                  <Lock className="field-icon" size={18} />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    className={`input-control ${error ? 'is-error' : ''}`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isSubmitting || isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-login-primary"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading ? (
                  <span className="btn-loading-content">
                    <span className="spinner-sm" /> Authenticating...
                  </span>
                ) : (
                  <span>Sign In to System</span>
                )}
              </button>

              {/* Quick Demo Credentials Access */}
              <div className="demo-credentials-box">
                <div className="demo-credentials-title">
                  <span>Quick Demo Access</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="demo-fill-btn"
                      onClick={() => fillDemo('admin')}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      className="demo-fill-btn"
                      onClick={() => fillDemo('employee')}
                    >
                      User
                    </button>
                  </div>
                </div>
                <div className="demo-credentials-info">
                  <span>admin@tanejapower.com</span>
                  <span>Admin@123456</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
