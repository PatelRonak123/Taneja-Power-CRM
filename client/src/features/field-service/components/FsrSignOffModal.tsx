import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { fieldService } from '../services/fieldService';
import { useNotificationStore } from '../../../stores/notificationStore';
import { PenTool, RotateCcw, Upload, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export interface FsrSignOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  fsrId?: string;
  signType?: 'CUSTOMER' | 'FSE';
  type?: 'CUSTOMER' | 'FSE';
  initialContactName?: string;
  fseName?: string;
  fsePhone?: string;
  defaultName?: string;
  defaultNumber?: string;
  onSaveCustomer?: (payload: {
    customerContactName: string;
    customerSignature: string;
    customerStamp?: string | null;
  }) => Promise<void>;
  onSaveFse?: (payload: {
    fseName: string;
    fseNumber?: string | null;
    fseSignature: string;
    fseSignatureDate?: string;
  }) => Promise<void>;
}

export const FsrSignOffModal: React.FC<FsrSignOffModalProps> = ({
  isOpen,
  onClose,
  fsrId,
  signType,
  type: propType,
  initialContactName,
  fseName,
  fsePhone,
  defaultName,
  defaultNumber,
  onSaveCustomer,
  onSaveFse,
}) => {
  const effectiveType = signType || propType || 'CUSTOMER';
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [signatureMode, setSignatureMode] = useState<'DRAW' | 'UPLOAD'>('DRAW');
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [uploadedStamp, setUploadedStamp] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initName = initialContactName || fseName || defaultName || '';
      const initNum = fsePhone || defaultNumber || '';
      setName(initName);
      setNumber(initNum);
      setUploadedSignature(null);
      setUploadedStamp(null);
      setHasDrawn(false);
      setError(null);
      setTimeout(() => clearCanvas(), 50);
    }
  }, [isOpen, initialContactName, fseName, fsePhone, defaultName, defaultNumber]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawn(false);
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else if ('clientX' in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'SIGNATURE' | 'STAMP') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG/JPG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'SIGNATURE') setUploadedSignature(reader.result);
        else setUploadedStamp(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(effectiveType === 'CUSTOMER' ? 'Please enter the customer contact name' : 'Please enter FSE name');
      return;
    }

    let finalSignatureData: string | null = null;
    if (signatureMode === 'DRAW') {
      if (!hasDrawn || !canvasRef.current) {
        setError('Please draw a signature on the canvas');
        return;
      }
      finalSignatureData = canvasRef.current.toDataURL('image/png');
    } else {
      if (!uploadedSignature) {
        setError('Please upload a signature image');
        return;
      }
      finalSignatureData = uploadedSignature;
    }

    setIsSubmitting(true);
    try {
      if (effectiveType === 'CUSTOMER') {
        if (onSaveCustomer) {
          await onSaveCustomer({
            customerContactName: name.trim(),
            customerSignature: finalSignatureData,
            customerStamp: uploadedStamp || null,
          });
        } else if (fsrId) {
          await fieldService.customerSignOff(fsrId, {
            customerContactName: name.trim(),
            customerSignature: finalSignatureData,
            customerStamp: uploadedStamp || undefined,
          });
          addToast({
            type: 'success',
            title: 'Customer Signed Off',
            message: 'Customer digital signature has been recorded.',
          });
          queryClient.invalidateQueries({ queryKey: ['fsr', fsrId] });
          queryClient.invalidateQueries({ queryKey: ['fsr-activity', fsrId] });
          queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
          queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
        }
      } else {
        if (onSaveFse) {
          await onSaveFse({
            fseName: name.trim(),
            fseNumber: number.trim() || null,
            fseSignature: finalSignatureData,
            fseSignatureDate: new Date().toISOString(),
          });
        } else if (fsrId) {
          await fieldService.fseSignOff(fsrId, {
            fseName: name.trim(),
            fseNumber: number.trim() || undefined,
            fseSignature: finalSignatureData,
          });
          addToast({
            type: 'success',
            title: 'FSE Signed Off',
            message: 'Service Engineer signature has been recorded.',
          });
          queryClient.invalidateQueries({ queryKey: ['fsr', fsrId] });
          queryClient.invalidateQueries({ queryKey: ['fsr-activity', fsrId] });
          queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
          queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to record sign-off');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={effectiveType === 'CUSTOMER' ? 'Customer Sign-Off & Stamp' : 'Service Engineer (FSE) Sign-Off'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Name Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {effectiveType === 'CUSTOMER' ? 'Customer Representative Name' : 'Field Engineer Name'}{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={effectiveType === 'CUSTOMER' ? 'e.g. Ramesh Kumar' : 'e.g. Anil Sharma'}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {effectiveType === 'FSE' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Engineer Employee Number / Phone
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. FSE-082 or +91 9876543210"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Signature Mode Toggle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700">Digital Signature</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setSignatureMode('DRAW')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  signatureMode === 'DRAW' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                }`}
              >
                <PenTool className="w-3 h-3 inline mr-1" /> Draw
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('UPLOAD')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  signatureMode === 'UPLOAD' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                }`}
              >
                <Upload className="w-3 h-3 inline mr-1" /> Upload Image
              </button>
            </div>
          </div>

          {signatureMode === 'DRAW' ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="flex items-center justify-between p-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <span>Sign in the box below using touchscreen or mouse</span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-2 py-0.5 text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                className="w-full h-40 touch-none cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => handleFileUpload(e, 'SIGNATURE')}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadedSignature && (
                <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                  <img src={uploadedSignature} alt="Uploaded signature" className="max-h-20 mx-auto" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer Stamp (Customer Sign-Off Only) */}
        {effectiveType === 'CUSTOMER' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Company Stamp Image <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => handleFileUpload(e, 'STAMP')}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
              />
              {uploadedStamp && (
                <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                  <img src={uploadedStamp} alt="Uploaded stamp" className="max-h-20 mx-auto" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Submit Sign-Off
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
