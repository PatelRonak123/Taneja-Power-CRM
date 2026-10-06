import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Download,
  ExternalLink,
  Wrench,
  Building2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Package,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react';
import { fieldService } from '../services/fieldService';
import { FsrPdfModal } from './FsrPdfModal';
import { FsrStatusBadge } from './FsrStatusBadge';
import { FsrCallTypeBadge } from './FsrCallTypeBadge';
import { navigate } from '../../../app/router/navigation';
import { env } from '../../../app/config/env';
import { toast } from '../../../utils/toast';

interface FsrReportModalProps {
  fsrId: string;
  isOpen: boolean;
  onClose: () => void;
}

const resolveImageUrl = (filePath?: string | null): string => {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:')
  ) {
    return filePath;
  }
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const serverRoot = env.API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${serverRoot}${cleanPath}`;
};

export const FsrReportModal: React.FC<FsrReportModalProps> = ({
  fsrId,
  isOpen,
  onClose,
}) => {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['field-service-report-modal', fsrId],
    queryFn: () => fieldService.getFsrById(fsrId),
    enabled: isOpen && Boolean(fsrId),
  });

  if (!isOpen) return null;

  const fsrData = response?.data;
  const fsr = fsrData?.fsr;
  const customer = fsrData?.customer;
  const destination = fsrData?.destination;
  const serviceEngineer = fsrData?.serviceEngineer;
  const siteObservation = fsrData?.siteObservation;
  const parts = fsrData?.parts || [];

  const handleDownloadPdf = async () => {
    if (!fsr) return;
    try {
      setIsDownloading(true);
      await fieldService.downloadFsrPdf(fsr.id, fsr.fsrNumber);
      toast.success('FSR PDF downloaded successfully');
    } catch (err: any) {
      toast.error('Failed to download PDF', err?.response?.data?.error?.message || err?.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs select-none">
      <div
        className="relative w-full max-w-4xl h-[92vh] max-h-[920px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[101]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Wrench size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Field Service Report
                </h3>
                {fsr && (
                  <>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {fsr.fsrNumber}
                    </span>
                    <FsrCallTypeBadge callType={fsr.callType} />
                    <FsrStatusBadge status={fsr.status} />
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Technical job card & on-site resolution report submitted by Field Engineer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fsr && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  title="Download Official PDF"
                >
                  {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/field-service/${fsr.id}`);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                  title="Open Full Screen View"
                >
                  <ExternalLink size={13} />
                  <span>Full View</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-amber-600" />
              <p className="text-xs font-semibold">Loading Field Service Report details...</p>
            </div>
          )}

          {error && (
            <div className="p-6 text-center bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              Failed to load Field Service Report details.
            </div>
          )}

          {fsr && (
            <>
              {/* Overview Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Visit Date</span>
                  <span className="font-bold text-slate-900">
                    {new Date(fsr.visitDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Field Engineer</span>
                  <span className="font-bold text-slate-900">
                    {fsr.fseName || serviceEngineer?.fullName || 'Assigned Engineer'}
                  </span>
                  {serviceEngineer?.phone && (
                    <span className="text-[11px] text-slate-500 block">{serviceEngineer.phone}</span>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Equipment Condition</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                    fsr.equipmentStatus === 'WORKING' || fsr.equipmentStatus === 'OPERATIONAL'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : fsr.equipmentStatus === 'NOT_WORKING' || fsr.equipmentStatus === 'FAULTY'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {fsr.equipmentStatus || 'OPERATIONAL'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Coverage & Billing</span>
                  <span className="font-bold text-emerald-700">
                    {fsr.billingStatus === 'FREE_SERVICE' || fsr.warrantyStatus === 'AMC' ? 'AMC Covered' : fsr.billingStatus}
                  </span>
                </div>
              </div>

              {/* Customer & Location Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  <Building2 size={14} className="text-blue-600" />
                  <span>Customer &amp; Site Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Company / Client</span>
                    <span className="font-bold text-slate-900">{fsr.companyName || fsr.customerName || customer?.companyName || customer?.name}</span>
                    {(fsr.customerAddress || destination?.address || customer?.address) && (
                      <p className="text-slate-600 mt-0.5 flex items-start gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>{fsr.customerAddress || destination?.address || customer?.address}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Representative</span>
                    <span className="font-semibold text-slate-900">
                      {fsr.customerContactName || fsr.customerName || customer?.name}
                    </span>
                    {(fsr.customerPhone || customer?.phone) && (
                      <p className="text-slate-600 mt-0.5 flex items-center gap-1">
                        <Phone size={12} className="text-slate-400" />
                        <span>{fsr.customerPhone || customer?.phone}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment Technical Snapshot */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Equipment Technical Snapshot</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Model / Rating</span>
                    <span className="font-bold text-slate-900">{fsr.productModel || 'Heavy Power Equipment'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Manufacturer / Make</span>
                    <span className="font-medium text-slate-800">{fsr.productMake || 'TANEJA POWER'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Serial Number</span>
                    <span className="font-mono text-slate-700">{fsr.productSerialNumber || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Diagnosis, Problem & Work Execution */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  <Wrench size={14} className="text-amber-600" />
                  <span>Fault Diagnosis &amp; Service Execution</span>
                </div>

                {fsr.problemReported && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Problem Reported</span>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap mt-0.5">{fsr.problemReported}</p>
                  </div>
                )}

                {fsr.reasonForVisit && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Service Work Carried Out</span>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap mt-0.5">{fsr.reasonForVisit}</p>
                  </div>
                )}

                {fsr.fseFeedback && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Engineer Remarks / Technical Findings</span>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap mt-0.5">{fsr.fseFeedback}</p>
                  </div>
                )}

                {siteObservation?.observationsNotes && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Site Observations</span>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap mt-0.5">{siteObservation.observationsNotes}</p>
                  </div>
                )}
              </div>

              {/* Spares / Parts Used */}
              {parts.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                    <Package size={14} className="text-purple-600" />
                    <span>Replaced Spares / Materials Used ({parts.length})</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {parts.map((p, idx) => (
                      <div key={p.id || idx} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{p.partName}</span>
                          {p.partNumber && <span className="text-slate-500 ml-1.5 font-mono">({p.partNumber})</span>}
                          {p.replacementDetails && (
                            <p className="text-[11px] text-slate-600">{p.replacementDetails}</p>
                          )}
                        </div>
                        <span className="font-bold text-slate-800">Qty: {p.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital Signatures & Sign-off Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Digital Sign-offs &amp; Acceptance</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Customer Sign-off */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer Representative</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {fsr.customerContactName || fsr.customerName}
                      </span>
                      {fsr.customerSignedAt && (
                        <span className="text-[11px] text-slate-500 block">
                          Signed on: {new Date(fsr.customerSignedAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col items-center justify-center min-h-[90px]">
                      {fsr.customerSignature ? (
                        <img
                          src={resolveImageUrl(fsr.customerSignature)}
                          alt="Customer Signature"
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Signature not recorded</span>
                      )}
                    </div>
                  </div>

                  {/* FSE Sign-off */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Field Service Engineer</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {fsr.fseName || serviceEngineer?.fullName || 'Field Engineer'}
                      </span>
                      {fsr.fseSignatureDate && (
                        <span className="text-[11px] text-slate-500 block">
                          Signed on: {new Date(fsr.fseSignatureDate).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col items-center justify-center min-h-[90px]">
                      {fsr.fseSignature ? (
                        <img
                          src={resolveImageUrl(fsr.fseSignature)}
                          alt="FSE Signature"
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Signature not recorded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between sticky bottom-0 z-10">
          <div>
            {fsr && (
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <FileText size={13} />
                <span>View Official Signed PDF</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* PDF Modal */}
      {isPdfModalOpen && fsrData && (
        <FsrPdfModal
          isOpen={isPdfModalOpen}
          fsrData={fsrData}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}
    </div>,
    document.body
  );
};
