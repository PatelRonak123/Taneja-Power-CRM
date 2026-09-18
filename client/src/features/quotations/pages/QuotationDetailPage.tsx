import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationService } from '../services/quotationService';
import { useCurrentPath, navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { QuotationStatusBadge } from '../components/QuotationStatusBadge';
import { QuotationTypeBadge } from '../components/QuotationTypeBadge';
import { QuotationApprovalModal } from '../components/QuotationApprovalModal';
import { QuotationRevisionModal } from '../components/QuotationRevisionModal';
import { QuotationRevisionViewer } from '../components/QuotationRevisionViewer';
import { QuotationApprovalHistory } from '../components/QuotationApprovalHistory';
import { QuotationActivityTimeline } from '../components/QuotationActivityTimeline';
import { QuotationPdfModal } from '../components/QuotationPdfModal';
import { QuotationPrintDocument } from '../components/QuotationPrintDocument';
import { QuotationRevision, QuotationItem } from '../types/quotation.types';
import {
  ArrowLeft,
  Edit,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  GitBranch,
  Building2,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  Activity,
  Layers,
  Eye,
  Loader2,
  AlertCircle,
  Printer,
  Download,
} from 'lucide-react';

const formatINR = (val: number | string | undefined) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const QuotationDetailPage: React.FC = () => {
  const currentPath = useCurrentPath();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Extract ID from /quotations/:id
  const match = currentPath.match(/^\/quotations\/([^/]+)$/);
  const quotationId = match ? match[1] : null;

  const [activeTab, setActiveTab] = useState<'revisions' | 'approvals' | 'activity'>('revisions');
  const [approvalModalAction, setApprovalModalAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [viewingRevisionNumber, setViewingRevisionNumber] = useState<number | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalRevision, setPdfModalRevision] = useState<QuotationRevision | null>(null);

  const { data: quotationRes, isLoading, error } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => quotationService.getQuotationById(quotationId!),
    enabled: !!quotationId,
  });

  const { data: revisionsRes } = useQuery({
    queryKey: ['quotation-revisions', quotationId],
    queryFn: () => quotationService.getRevisions(quotationId!),
    enabled: !!quotationId,
  });

  const quotation = quotationRes?.data;
  const revisionsList = revisionsRes?.data || [];

  // Submit / Withdraw Mutations
  const submitApprovalMutation = useMutation({
    mutationFn: () => quotationService.submitQuotation(quotationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to submit for approval');
    },
  });

  const withdrawApprovalMutation = useMutation({
    mutationFn: () => quotationService.withdrawQuotation(quotationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to withdraw approval');
    },
  });

  if (!quotationId) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
        <p className="text-red-600 font-medium">Invalid quotation identifier.</p>
        <button
          onClick={() => navigate('/quotations')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          Return to Quotations
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-gray-200">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-gray-500 font-medium text-sm">Loading quotation details...</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-red-200">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900">Failed to load quotation</h3>
        <p className="text-gray-500 text-sm mt-1">{(error as any)?.message || 'Quotation not found or inaccessible.'}</p>
        <button
          onClick={() => navigate('/quotations')}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          Back to List
        </button>
      </div>
    );
  }

  const activeRev = quotation.currentRevision;
  const isManagerOrAdmin = user?.role === 'ADMIN' || (user as any)?.role === 'SALES_MANAGER' || (user as any)?.role === 'SUPER_ADMIN';
  const canEdit = quotation.status === 'DRAFT' || quotation.status === 'PENDING_APPROVAL' || quotation.status === 'REJECTED';
  const canSubmitApproval = quotation.status === 'DRAFT' || quotation.status === 'REJECTED';
  const canWithdrawApproval = quotation.status === 'PENDING_APPROVAL';
  const canApproveOrReject = quotation.status === 'PENDING_APPROVAL' && isManagerOrAdmin;
  const canCreateRevision = ['APPROVED', 'SENT', 'REJECTED', 'EXPIRED', 'ACCEPTED'].includes(quotation.status);

  // Check if Intra-State (CGST + SGST) vs Inter-State (IGST)
  const isIntraState = Number(activeRev?.cgstAmount || 0) > 0 || Number(activeRev?.sgstAmount || 0) > 0;

  const handleApprovalSubmit = async (comments: string) => {
    if (approvalModalAction === 'APPROVE') {
      await quotationService.approveQuotation(quotation.id, { comments });
    } else if (approvalModalAction === 'REJECT') {
      await quotationService.rejectQuotation(quotation.id, { rejectionReason: comments });
    }
    queryClient.invalidateQueries({ queryKey: ['quotation', quotation.id] });
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
  };

  const handleCreateRevisionSubmit = async (reason: string) => {
    await quotationService.createRevision(quotation.id, { revisionReason: reason });
    queryClient.invalidateQueries({ queryKey: ['quotation', quotation.id] });
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/quotations')}
              className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Quotations List
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {quotation.quotationNumber}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                Rev {activeRev?.revisionNumber ?? quotation.currentRevisionNumber}
              </span>
              <QuotationStatusBadge status={quotation.status} size="md" />
              <QuotationTypeBadge type={quotation.quotationType} size="md" />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Created on {formatDate(quotation.createdAt)} • Valid until {formatDate(activeRev?.validUntil)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canEdit && (
              <button
                onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
                className="inline-flex items-center px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
              >
                <Edit className="w-4 h-4 mr-1.5 text-gray-500" />
                Edit
              </button>
            )}

            {canSubmitApproval && (
              <button
                onClick={() => submitApprovalMutation.mutate()}
                disabled={submitApprovalMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {submitApprovalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Submit for Approval
              </button>
            )}

            {canWithdrawApproval && (
              <button
                onClick={() => withdrawApprovalMutation.mutate()}
                disabled={withdrawApprovalMutation.isPending}
                className="inline-flex items-center px-3.5 py-2 border border-amber-300 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-sm transition-colors disabled:opacity-50"
              >
                {withdrawApprovalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                )}
                Withdraw
              </button>
            )}

            {canApproveOrReject && (
              <>
                <button
                  onClick={() => setApprovalModalAction('APPROVE')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Approve
                </button>
                <button
                  onClick={() => setApprovalModalAction('REJECT')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject
                </button>
              </>
            )}

            {canCreateRevision && (
              <button
                onClick={() => setIsRevisionModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 shadow-sm transition-colors"
              >
                <GitBranch className="w-4 h-4 mr-1.5" />
                Create Revision (Rev {(activeRev?.revisionNumber ?? quotation.currentRevisionNumber) + 1})
              </button>
            )}

            {/* Document & Print Actions */}
            <button
              onClick={() => {
                setPdfModalRevision(activeRev || null);
                setIsPdfModalOpen(true);
              }}
              className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors"
              title="Preview official commercial proposal PDF"
            >
              <FileText className="w-4 h-4 mr-1.5 text-blue-600" />
              Preview PDF
            </button>

            <button
              onClick={() => quotationService.downloadQuotationPdf(quotation.id, quotation.quotationNumber, activeRev?.revisionNumber)}
              className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors"
              title="Download official PDF document directly"
            >
              <Download className="w-4 h-4 mr-1.5 text-slate-600" />
              Download PDF
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors"
              title="Print quotation document"
            >
              <Printer className="w-4 h-4 mr-1.5 text-slate-600" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Info: Customer Info & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Customer Details</h2>
          </div>
          <div className="space-y-2.5 text-sm">
            <div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Customer</span>
              <p className="font-semibold text-gray-900">{quotation.customer?.name || activeRev?.customerName || '—'}</p>
            </div>
            {quotation.customer?.companyName && (
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Company</span>
                <p className="text-gray-800">{quotation.customer.companyName}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Phone</span>
                <p className="text-gray-800">{quotation.customer?.phone || activeRev?.customerPhone || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Email</span>
                <p className="text-gray-800 truncate">{quotation.customer?.email || activeRev?.customerEmail || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">GSTIN</span>
                <p className="text-gray-800 font-mono text-xs font-semibold">{activeRev?.customerGstin || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">State</span>
                <p className="text-gray-800">{quotation.customer?.state || activeRev?.billingState || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Site Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Destination Site</h2>
          </div>
          {quotation.destination ? (
            <div className="space-y-2 text-sm">
              <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                {quotation.destination.name}
              </span>
              <p className="text-gray-800 font-medium">{quotation.destination.address || '—'}</p>
              <p className="text-gray-600">
                {quotation.destination.city}, {quotation.destination.state} - {quotation.destination.pincode}
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic py-4">
              No specific destination site specified. Customer billing address applies.
            </div>
          )}
        </div>

        {/* Commercial Metadata Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Proposal Metadata</h2>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Sales Representative</span>
              <span className="font-semibold text-gray-900">{quotation.salesperson?.fullName || quotation.createdByUser?.fullName || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Currency</span>
              <span className="font-semibold text-gray-900">{activeRev?.currency || 'INR'} (₹)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Tax Type</span>
              <span className="font-semibold text-gray-900">
                {isIntraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Validity Period</span>
              <span className="font-semibold text-indigo-600">{activeRev?.validityDays || 30} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Line Items & Bill of Materials</h2>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Revision {activeRev?.revisionNumber ?? quotation.currentRevisionNumber} ({activeRev?.items?.length || 0} items)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100/70 text-xs uppercase font-semibold text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[240px]">Product / Description</th>
                <th className="py-3 px-4 w-20 text-right">Qty</th>
                <th className="py-3 px-4 w-28 text-right">Unit Price</th>
                <th className="py-3 px-4 w-20 text-right">Disc %</th>
                <th className="py-3 px-4 w-28 text-right">Taxable</th>
                <th className="py-3 px-4 w-28 text-right">GST Rate</th>
                <th className="py-3 px-4 w-28 text-right">GST Amount</th>
                <th className="py-3 px-4 w-32 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-normal">
              {activeRev?.items?.map((item: QuotationItem, idx: number) => {
                return (
                  <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-medium text-gray-400">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{item.productName}</div>
                      {item.productSku && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          SKU: <span className="font-mono">{item.productSku}</span> {item.make ? `• ${item.make}` : ''}
                        </div>
                      )}
                      {item.description && item.description !== item.productName && (
                        <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                      )}
                      {item.technicalSpecifications && (
                        <div className="text-xs text-indigo-700 bg-indigo-50/70 rounded px-2 py-0.5 mt-1.5 inline-block">
                          Specs: {item.technicalSpecifications}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-gray-900">{item.quantity} {item.unit}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{formatINR(item.unitPrice)}</td>
                    <td className="py-3.5 px-4 text-right text-gray-500">
                      {Number(item.discountPercent) > 0 ? `${item.discountPercent}%` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-800">{formatINR(item.taxableAmount)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-block px-1.5 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                        {item.gstRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-600">{formatINR(item.totalTax)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">{formatINR(item.lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Commercial Totals Card */}
        <div className="p-6 bg-gray-50/70 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            {/* Amount In Words & Notes */}
            <div className="space-y-4 max-w-lg">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Amount in Words
                </span>
                <p className="text-sm font-medium text-gray-800 bg-white p-3 rounded-lg border border-gray-200 italic">
                  "{activeRev?.amountInWords || 'Indian Rupees Only'}"
                </p>
              </div>

              {(activeRev?.notes || activeRev?.internalRemarks) && (
                <div className="space-y-2">
                  {activeRev.notes && (
                    <div className="text-xs text-gray-600 bg-white p-2.5 rounded border border-gray-200">
                      <strong className="text-gray-900">Notes:</strong> {activeRev.notes}
                    </div>
                  )}
                  {activeRev.internalRemarks && (
                    <div className="text-xs text-amber-800 bg-amber-50/80 p-2.5 rounded border border-amber-200">
                      <strong className="text-amber-900">Internal Audit Note:</strong> {activeRev.internalRemarks}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Financial Summary Breakdown */}
            <div className="w-full md:w-80 bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Base):</span>
                <span className="font-mono">{formatINR(activeRev?.subtotal)}</span>
              </div>
              {Number(activeRev?.totalDiscount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Total Discount:</span>
                  <span className="font-mono">- {formatINR(activeRev?.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-800 font-medium pt-1 border-t border-gray-100">
                <span>Taxable Amount:</span>
                <span className="font-mono">{formatINR(activeRev?.taxableAmount)}</span>
              </div>

              {isIntraState ? (
                <>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>CGST:</span>
                    <span className="font-mono">{formatINR(activeRev?.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>SGST:</span>
                    <span className="font-mono">{formatINR(activeRev?.sgstAmount)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>IGST:</span>
                  <span className="font-mono">{formatINR(activeRev?.igstAmount)}</span>
                </div>
              )}

              {Number(activeRev?.roundOff || 0) !== 0 && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Roundoff:</span>
                  <span className="font-mono">{Number(activeRev?.roundOff) > 0 ? '+' : ''}{activeRev?.roundOff}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-900">
                <span className="text-base font-bold text-gray-900">Grand Total:</span>
                <span className="text-xl font-bold text-indigo-700 font-mono">
                  {formatINR(activeRev?.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Commercial Terms & Conditions Accordion / Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-900">Commercial Terms & Conditions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Payment Terms</span>
            <p className="font-medium text-gray-800">{activeRev?.paymentTerms || '100% Advance with Order'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Delivery Terms</span>
            <p className="font-medium text-gray-800">{activeRev?.deliveryTerms || '2-4 Weeks from advance receipt'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block">Warranty Terms</span>
            <p className="font-medium text-gray-800">{activeRev?.warrantyTerms || '12 Months standard manufacturer warranty'}</p>
          </div>
        </div>
      </div>

      {/* Tabs for Revisions, Approvals, and Activity Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('revisions')}
            className={`flex items-center px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'revisions'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            <GitBranch className="w-4 h-4 mr-2" />
            Revision History ({revisionsList.length || 1})
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'approvals'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Approval Trail ({quotation.approvals?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            <Activity className="w-4 h-4 mr-2" />
            Audit & Activity Logs
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'revisions' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Revision</th>
                      <th className="py-2.5 px-4">Items</th>
                      <th className="py-2.5 px-4">Taxable</th>
                      <th className="py-2.5 px-4">Grand Total</th>
                      <th className="py-2.5 px-4">Reason / Notes</th>
                      <th className="py-2.5 px-4">Created Date</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {revisionsList.map((r: QuotationRevision) => {
                      const isActive = r.revisionNumber === quotation.currentRevisionNumber;
                      return (
                        <tr key={r.id} className={isActive ? 'bg-indigo-50/40 font-medium' : 'hover:bg-gray-50'}>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900">Rev {r.revisionNumber}</span>
                            {isActive && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700 uppercase">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">{r.items?.length || 0} items</td>
                          <td className="py-3 px-4 font-mono">{formatINR(r.taxableAmount)}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-gray-900">{formatINR(r.grandTotal)}</td>
                          <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{r.revisionReason || 'Initial Proposal'}</td>
                          <td className="py-3 px-4 text-gray-500">{formatDate(r.createdAt)}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingRevisionNumber(r.revisionNumber)}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                title="View historical revision snapshot"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setPdfModalRevision(r);
                                  setIsPdfModalOpen(true);
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                title="Preview PDF for this specific historical revision"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <QuotationApprovalHistory approvals={quotation.approvals || []} />
          )}

          {activeTab === 'activity' && (
            <QuotationActivityTimeline activityLogs={quotation.activityLogs || []} />
          )}
        </div>
      </div>

      {/* Approval / Rejection Modal */}
      {approvalModalAction && (
        <QuotationApprovalModal
          isOpen={!!approvalModalAction}
          mode={approvalModalAction}
          quotationNumber={quotation.quotationNumber}
          revisionNumber={activeRev?.revisionNumber ?? quotation.currentRevisionNumber}
          onClose={() => setApprovalModalAction(null)}
          onSubmit={handleApprovalSubmit}
        />
      )}

      {/* Formal Revision Modal */}
      {isRevisionModalOpen && (
        <QuotationRevisionModal
          isOpen={isRevisionModalOpen}
          quotationNumber={quotation.quotationNumber}
          currentRevisionNumber={activeRev?.revisionNumber ?? quotation.currentRevisionNumber}
          onClose={() => setIsRevisionModalOpen(false)}
          onSubmit={handleCreateRevisionSubmit}
        />
      )}

      {/* Snapshot Revision Viewer Modal */}
      {viewingRevisionNumber !== null && (
        <QuotationRevisionViewer
          quotationId={quotation.id}
          revisionNumber={viewingRevisionNumber}
          onClose={() => setViewingRevisionNumber(null)}
        />
      )}

      {/* PDF Document Preview & Print Modal */}
      {isPdfModalOpen && (
        <QuotationPdfModal
          isOpen={isPdfModalOpen}
          quotation={quotation}
          revision={pdfModalRevision}
          onClose={() => {
            setIsPdfModalOpen(false);
            setPdfModalRevision(null);
          }}
        />
      )}

      {/* Standalone hidden print container for direct browser window.print() */}
      <div className="print-only hidden">
        <QuotationPrintDocument quotation={quotation} revisionOverride={pdfModalRevision} />
      </div>
    </div>
  );
};
