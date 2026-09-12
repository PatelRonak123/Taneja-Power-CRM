import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';

interface WhatsAppQRCardProps {
  qrCode: string;
  onCancel?: () => void;
  isConnecting?: boolean;
}

export const WhatsAppQRCard: React.FC<WhatsAppQRCardProps> = ({
  qrCode,
  onCancel,
  isConnecting,
}) => {
  return (
    <div className="whatsapp-qr-card">
      <div className="whatsapp-qr-header">
        <div className="whatsapp-qr-title-row">
          <div className="whatsapp-icon-circle pulsing">
            <Smartphone size={22} className="whatsapp-icon-active" />
          </div>
          <div>
            <h3 className="whatsapp-qr-heading">Scan QR Code with WhatsApp</h3>
            <p className="whatsapp-qr-subheading">
              Link the Taneja Power central administration account
            </p>
          </div>
        </div>
      </div>

      <div className="whatsapp-qr-body">
        {/* QR Code Container with High Contrast & Scanner Overlay */}
        <div className="whatsapp-qr-code-wrapper">
          <div className="whatsapp-qr-frame">
            <QRCodeSVG
              value={qrCode}
              size={240}
              level="M"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#111827"
              className="whatsapp-qr-canvas"
            />
            <div className="whatsapp-scan-laser" />
          </div>

          <div className="whatsapp-qr-timer-note">
            <RefreshCw size={13} className="spin-slow" />
            <span>QR code refreshes automatically for security</span>
          </div>
        </div>

        {/* Step-by-step Visual Instructions */}
        <div className="whatsapp-steps-container">
          <h4 className="whatsapp-steps-title">How to connect:</h4>

          <ol className="whatsapp-steps-list">
            <li className="whatsapp-step-item">
              <span className="step-number">1</span>
              <div className="step-content">
                <strong>Open WhatsApp</strong> on your mobile device
              </div>
            </li>
            <li className="whatsapp-step-item">
              <span className="step-number">2</span>
              <div className="step-content">
                Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings (⚙️)</strong> on iPhone
              </div>
            </li>
            <li className="whatsapp-step-item">
              <span className="step-number">3</span>
              <div className="step-content">
                Select <strong>Linked Devices</strong> and tap <strong>Link a Device</strong>
              </div>
            </li>
            <li className="whatsapp-step-item">
              <span className="step-number">4</span>
              <div className="step-content">
                Point your phone camera at this screen to scan the QR code
              </div>
            </li>
          </ol>

          <div className="whatsapp-qr-actions">
            {onCancel && (
              <button
                type="button"
                className="btn-cancel-connection"
                onClick={onCancel}
                disabled={isConnecting}
              >
                <XCircle size={16} />
                <span>Cancel Connection</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="whatsapp-qr-footer">
        <CheckCircle2 size={16} className="text-emerald-500" />
        <span>End-to-end encrypted direct session with WhatsApp servers</span>
      </div>
    </div>
  );
};
