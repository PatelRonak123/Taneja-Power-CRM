import React from 'react';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WhatsAppQRCard } from '../components/WhatsAppQRCard';
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Radio,
  Power,
  RefreshCw,
  Info,
  Smartphone,
} from 'lucide-react';

export const WhatsAppIntegrationPage: React.FC = () => {
  const {
    status,
    phoneNumber,
    name,
    qrCode,
    connectedAt,
    error,
    isLoading,
    isConnecting,
    isDisconnecting,
    connect,
    disconnect,
    refetch,
  } = useWhatsApp();

  const formatPhoneNumber = (num?: string | null) => {
    if (!num) return 'Not available';
    // Remove non-digit characters
    const clean = num.replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
      return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return `+${clean}`;
  };

  const formatConnectedTime = (isoString?: string | null) => {
    if (!isoString) return 'Active session';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="whatsapp-page-container">
      {/* Header Bar */}
      <div className="admin-dashboard-header">
        <div className="admin-header-title-group">
          <div className="admin-badge-row">
            <span className="admin-badge">
              <ShieldCheck size={14} /> ADMIN MODULE
            </span>
            <span
              className={`whatsapp-status-pill status-${status}`}
            >
              <Radio size={12} className={status === 'connected' || status === 'connecting' ? 'pulse-live' : ''} />
              {status === 'connected' && 'CONNECTED'}
              {status === 'connecting' && 'CONNECTING...'}
              {status === 'qr' && 'AWAITING SCAN'}
              {status === 'disconnected' && 'DISCONNECTED'}
              {status === 'error' && 'ERROR'}
            </span>
          </div>
          <h1 className="admin-title">WhatsApp Integration</h1>
          <p className="admin-subtitle">
            Connect the primary Taneja Power administrative WhatsApp account for real-time messaging, customer inquiries, and system notifications.
          </p>
        </div>

        <div className="whatsapp-header-actions">
          <button
            type="button"
            className="btn-refresh-status"
            onClick={() => refetch()}
            title="Refresh Status"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="whatsapp-content-grid">
        {/* Connection Management Card */}
        <div className="whatsapp-main-card">
          {isLoading && (
            <div className="whatsapp-state-box loading-state">
              <Loader2 size={36} className="spin-animate text-primary" />
              <p>Fetching WhatsApp connection status...</p>
            </div>
          )}

          {/* STATE: ERROR */}
          {!isLoading && status === 'error' && (
            <div className="whatsapp-state-box error-state">
              <div className="whatsapp-icon-circle error-circle">
                <AlertTriangle size={32} />
              </div>
              <h3 className="whatsapp-state-title">Connection Error</h3>
              <p className="whatsapp-state-desc">
                {error || 'An error occurred while communicating with the WhatsApp client.'}
              </p>
              <div className="whatsapp-btn-group">
                <button
                  type="button"
                  className="whatsapp-btn btn-primary"
                  onClick={connect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={16} className="spin-animate" />
                      <span>Retrying...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      <span>Retry Connection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STATE: DISCONNECTED */}
          {!isLoading && status === 'disconnected' && (
            <div className="whatsapp-state-box disconnected-state">
              <div className="whatsapp-icon-circle neutral-circle">
                <MessageSquare size={36} />
              </div>
              <h3 className="whatsapp-state-title">WhatsApp Disconnected</h3>
              <p className="whatsapp-state-desc">
                Connect your business WhatsApp account to start sending alerts, receiving client queries, and enabling instant notifications.
              </p>

              <div className="whatsapp-action-section">
                <button
                  type="button"
                  className="whatsapp-btn btn-connect"
                  onClick={connect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={18} className="spin-animate" />
                      <span>Initializing Connection...</span>
                    </>
                  ) : (
                    <>
                      <Power size={18} />
                      <span>Connect WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STATE: CONNECTING (Without QR yet) */}
          {!isLoading && status === 'connecting' && (
            <div className="whatsapp-state-box connecting-state">
              <div className="whatsapp-icon-circle connecting-circle">
                <Loader2 size={36} className="spin-animate text-amber" />
              </div>
              <h3 className="whatsapp-state-title">Connecting to WhatsApp...</h3>
              <p className="whatsapp-state-desc">
                Initializing Baileys authentication socket and preparing session credentials. Please wait a moment.
              </p>
              <div className="connecting-progress-bar">
                <div className="progress-fill" />
              </div>
            </div>
          )}

          {/* STATE: QR CODE READY */}
          {!isLoading && status === 'qr' && qrCode && (
            <WhatsAppQRCard
              qrCode={qrCode}
              onCancel={disconnect}
              isConnecting={isConnecting}
            />
          )}

          {/* STATE: CONNECTED */}
          {!isLoading && status === 'connected' && (
            <div className="whatsapp-connected-view">
              <div className="whatsapp-connected-header">
                <div className="connected-badge-row">
                  <div className="whatsapp-icon-circle success-circle">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h2 className="connected-title">WhatsApp Connected ✅</h2>
                    <p className="connected-subtitle">
                      Your WhatsApp session is active and linked to Taneja Power.
                    </p>
                  </div>
                </div>
              </div>

              <div className="whatsapp-info-cards-grid">
                <div className="info-item-card">
                  <span className="info-label">Connected Phone Number</span>
                  <div className="info-value-row">
                    <Smartphone size={18} className="info-icon" />
                    <span className="info-value phone-highlight">
                      {formatPhoneNumber(phoneNumber)}
                    </span>
                  </div>
                </div>

                <div className="info-item-card">
                  <span className="info-label">Account / Display Name</span>
                  <div className="info-value-row">
                    <span className="info-value">{name || 'Taneja Power Admin'}</span>
                  </div>
                </div>

                <div className="info-item-card">
                  <span className="info-label">Connection Status</span>
                  <div className="info-value-row">
                    <span className="status-indicator-dot online" />
                    <span className="info-value text-emerald">Online & Active</span>
                  </div>
                </div>

                <div className="info-item-card">
                  <span className="info-label">Session Established</span>
                  <div className="info-value-row">
                    <span className="info-value time-val">
                      {formatConnectedTime(connectedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="whatsapp-connected-footer">
                <button
                  type="button"
                  className="whatsapp-btn btn-disconnect"
                  onClick={disconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 size={16} className="spin-animate" />
                      <span>Disconnecting...</span>
                    </>
                  ) : (
                    <>
                      <Power size={16} />
                      <span>Disconnect WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Panels */}
        <div className="whatsapp-side-column">
          {/* Persistence & Architecture Card */}
          <div className="whatsapp-side-card">
            <div className="side-card-header">
              <ShieldCheck size={18} className="text-primary" />
              <h4>Session Persistence</h4>
            </div>
            <p className="side-card-text">
              Authentication keys are securely saved on the local backend file system (<code className="code-badge">./whatsapp-auth</code>).
            </p>
            <ul className="side-card-checklist">
              <li>
                <CheckCircle2 size={14} className="check-icon" />
                <span>Automatic reconnection on backend restart</span>
              </li>
              <li>
                <CheckCircle2 size={14} className="check-icon" />
                <span>No need to re-scan QR after server reboots</span>
              </li>
              <li>
                <CheckCircle2 size={14} className="check-icon" />
                <span>Dedicated admin-only singleton connection</span>
              </li>
            </ul>
          </div>

          {/* Security & Access Card */}
          <div className="whatsapp-side-card">
            <div className="side-card-header">
              <Info size={18} className="text-accent" />
              <h4>Security & Scope (Phase 1)</h4>
            </div>
            <p className="side-card-text">
              This integration connects one dedicated administrative WhatsApp account. Employee access, multi-tenant sessions, and automated chatbots are scheduled for upcoming phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppIntegrationPage;
