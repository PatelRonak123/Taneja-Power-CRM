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
    <div className="flex flex-col space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl animate-pulse">
          <Smartphone size={22} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Scan QR Code with WhatsApp</h3>
          <p className="text-xs text-slate-500">
            Link the Taneja Power central administration account
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* QR Code Container with High Contrast */}
        <div className="md:col-span-5 flex flex-col items-center gap-3">
          <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
            <QRCodeSVG
              value={qrCode}
              size={200}
              level="M"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#0f172a"
              className="rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <RefreshCw size={12} className="animate-spin text-slate-400" />
            <span>QR code refreshes automatically for security</span>
          </div>
        </div>

        {/* Step-by-step Visual Instructions */}
        <div className="md:col-span-7 space-y-4">
          <h4 className="text-sm font-bold text-slate-800">How to connect:</h4>

          <ol className="space-y-2.5">
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                1
              </span>
              <div className="text-xs text-slate-600">
                <strong className="text-slate-800 font-semibold">Open WhatsApp</strong> on your mobile device
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                2
              </span>
              <div className="text-xs text-slate-600">
                Tap <strong className="text-slate-800 font-semibold">Menu (⋮)</strong> on Android or <strong className="text-slate-800 font-semibold">Settings (⚙️)</strong> on iPhone
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                3
              </span>
              <div className="text-xs text-slate-600">
                Select <strong className="text-slate-800 font-semibold">Linked Devices</strong> and tap <strong className="text-slate-800 font-semibold">Link a Device</strong>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                4
              </span>
              <div className="text-xs text-slate-600">
                Point your phone camera at this screen to scan the QR code
              </div>
            </li>
          </ol>

          {onCancel && (
            <div className="pt-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                onClick={onCancel}
                disabled={isConnecting}
              >
                <XCircle size={15} />
                <span>Cancel Connection</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
        <span>End-to-end encrypted direct session with WhatsApp servers</span>
      </div>
    </div>
  );
};
