import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { fieldService } from '../services/fieldService';
import { FsrAttachmentCategory } from '../types/field-service.types';
import { useNotificationStore } from '../../../stores/notificationStore';

interface FsrAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fsrId: string;
}

const CATEGORIES: { value: FsrAttachmentCategory; label: string; description: string }[] = [
  { value: 'UPS_PHOTO', label: 'UPS Equipment Photo', description: 'Overall or close-up photo of the UPS unit' },
  { value: 'BATTERY_PHOTO', label: 'Battery Bank Photo', description: 'Photo of battery racks, terminals, or cells' },
  { value: 'SITE_PHOTO', label: 'Site & Room Environment', description: 'Site location, electrical panels, or room conditions' },
  { value: 'PART_PHOTO', label: 'Defective / Replaced Parts', description: 'Old or new component replacement photos' },
  { value: 'SIGNED_DOCUMENT', label: 'Signed Physical Document', description: 'Scanned or photographed customer sign-off sheet' },
  { value: 'OTHER', label: 'Other Attachment', description: 'Supplementary diagrams, reports, or documentation' },
];

export const FsrAttachmentModal: React.FC<FsrAttachmentModalProps> = ({
  isOpen,
  onClose,
  fsrId,
}) => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<FsrAttachmentCategory>('UPS_PHOTO');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Please select a file to upload');

      // Convert file to base64 data URL for persistence and transmission
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(selectedFile);
      const filePathOrData = await base64Promise;

      return fieldService.uploadAttachment(fsrId, {
        category,
        fileName: selectedFile.name,
        fileData: filePathOrData,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'application/octet-stream',
      });
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Attachment Uploaded',
        message: 'File has been uploaded and linked to the FSR successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['fsr', fsrId] });
      queryClient.invalidateQueries({ queryKey: ['fsr-activity', fsrId] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-list'] });
      queryClient.invalidateQueries({ queryKey: ['fsrs-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-fsr-visits'] });
      handleClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to upload attachment';
      setError(msg);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: msg,
      });
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setCategory('UPS_PHOTO');
    setError(null);
    onClose();
  };

  const processFile = (file: File) => {
    setError(null);
    // 15 MB limit
    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum size limit (15MB)');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              Upload FSR Attachment
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Add photos, site readings documentation, or signed proof to this service report.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attachment Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FsrAttachmentCategory)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} — {cat.description}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Upload Zone */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragOver
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
              />
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Click to upload or drag and drop
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PNG, JPG, PDF, or DOCX (Max 15MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3.5 overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                    <FileText className="w-7 h-7" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatBytes(selectedFile.size)} • {selectedFile.type || 'Document'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Caption / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. UPS front display showing battery discharge warning code"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={!selectedFile || uploadMutation.isPending}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Upload Attachment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
