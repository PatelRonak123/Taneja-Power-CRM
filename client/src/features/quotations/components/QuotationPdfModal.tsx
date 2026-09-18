import React, { useState, useEffect } from 'react';
import { quotationService } from '../services/quotationService';
import { QuotationDetailedView, QuotationRevision } from '../types/quotation.types';
import { QuotationPrintDocument } from './QuotationPrintDocument';
import { Download, Printer, X, Loader2, FileText, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  quotation: QuotationDetailedView;
  revision?: QuotationRevision | null;
  onClose: () => void;
}

export const QuotationPdfModal: React.FC<Props> = ({
  isOpen,
  quotation,
  revision,
  onClose,
}) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const activeRev = revision || quotation.currentRevision;
  const revisionNumber = activeRev?.revisionNumber ?? quotation.currentRevisionNumber;

  useEffect(() => {
    if (!isOpen) return;

    let objectUrl: string | null = null;

    const loadPdfBlob = async () => {
      try {
        setLoadingPdf(true);
        setError(null);
        const blob = await quotationService.getQuotationPdfBlob(quotation.id, revisionNumber);
        objectUrl = window.URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
      } catch (err: any) {
        console.error('Failed to load PDF preview stream:', err);
        setError(err?.message || 'Failed to generate PDF document stream.');
      } finally {
        setLoadingPdf(false);
      }
    };

    loadPdfBlob();

    return () => {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, quotation.id, revisionNumber]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await quotationService.downloadQuotationPdf(quotation.id, quotation.quotationNumber, revisionNumber);
    } catch (err: any) {
      alert(err?.message || 'Failed to download PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Screen Interactive Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs no-print">
        <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Commercial Proposal Document
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {quotation.quotationNumber} (Rev {revisionNumber})
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Authoritative PDF preview and print-ready commercial proposal.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Viewer */}
          <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center">
            {loadingPdf && (
              <div className="flex flex-col items-center gap-2 py-16">
                <Loader2 size={32} className="text-blue-600 animate-spin" />
                <p className="text-xs font-medium text-slate-500">
                  Generating high-resolution authoritative quotation PDF...
                </p>
              </div>
            )}

            {error && (
              <div className="max-w-md p-6 bg-white rounded-2xl border border-rose-200 text-center shadow-lg">
                <AlertCircle size={36} className="text-rose-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900">PDF Generation Notice</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
                <p className="text-xs text-slate-600">
                  You can still print the HTML document directly using your browser print engine.
                </p>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl"
                >
                  Print via Browser
                </button>
              </div>
            )}

            {!loadingPdf && !error && pdfBlobUrl && (
              <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full rounded-xl border border-slate-300 shadow-md bg-white"
                title={`Quotation PDF ${quotation.quotationNumber}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Hidden container that only becomes visible during browser @media print */}
      <div className="print-only hidden">
        <QuotationPrintDocument quotation={quotation} revisionOverride={revision} />
      </div>
    </>
  );
};
