import React from 'react';
import { QuotationDetailedView, QuotationRevision, QuotationItem } from '../types/quotation.types';

interface Props {
  quotation: QuotationDetailedView;
  revisionOverride?: QuotationRevision | null;
}

const formatINR = (val: number | string | undefined) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
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

export const QuotationPrintDocument: React.FC<Props> = ({ quotation, revisionOverride }) => {
  const rev = revisionOverride || quotation.currentRevision;
  if (!rev) return null;

  const isIntraState = Number(rev.cgstAmount || 0) > 0 || Number(rev.sgstAmount || 0) > 0;

  const approvedAction = quotation.approvals?.find((a) => a.action === 'APPROVED');
  const salesRep = quotation.salesperson?.fullName || quotation.createdByUser?.fullName || 'Sales Representative';
  const approverName = approvedAction?.reviewedBy?.fullName || (quotation.status === 'APPROVED' ? 'Management Authority' : 'Pending Formal Authorization');

  return (
    <div className="quotation-print-container bg-white text-slate-900 p-8 max-w-[210mm] mx-auto relative font-sans text-xs leading-normal">
      {/* Header with Company Logo & Document Banner */}
      <div className="relative z-10 border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex justify-between items-start">
          {/* Logo & Company Details */}
          <div className="flex flex-col gap-1 max-w-[60%]">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Taneja Power Logo"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                  TANEJA POWER SYSTEMS
                </h1>
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                  Industrial Heavy Engineering & Energy Division
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              GIDC Industrial Estate, Vadodara, Gujarat 390010, India<br />
              <span className="font-semibold text-slate-800">GSTIN:</span> 24AABCT1234F1Z5 • <span className="font-semibold text-slate-800">Email:</span> sales@tanejapower.com • <span className="font-semibold text-slate-800">Phone:</span> +91 98765 43210
            </p>
          </div>

          {/* Quotation Metadata Banner */}
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-blue-700 tracking-wider uppercase bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
              COMMERCIAL QUOTATION
            </span>
            <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-right text-[11px] space-y-0.5 min-w-[180px]">
              <div>
                <span className="text-slate-500">Quotation No:</span>{' '}
                <strong className="text-slate-900 font-mono">{quotation.quotationNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500">Revision:</span>{' '}
                <strong className="text-blue-700 font-bold">Rev {rev.revisionNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500">Date:</span>{' '}
                <span className="text-slate-800">{formatDate(rev.quotationDate || quotation.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-500">Valid Until:</span>{' '}
                <strong className="text-slate-900">{formatDate(rev.validUntil)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Destination / AMC Metadata Grid */}
      <div className="relative z-10 grid grid-cols-2 gap-4 mb-4">
        {/* Bill To */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 text-[11px]">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            CUSTOMER / BILL TO:
          </span>
          <p className="font-bold text-slate-950 text-xs">{rev.companyName || rev.customerName}</p>
          {rev.customerName && rev.customerName !== rev.companyName && (
            <p className="text-slate-700">Attn: {rev.customerName}</p>
          )}
          <p className="text-slate-600 mt-0.5">
            {[rev.billingAddress || undefined, rev.billingCity || undefined, rev.billingState || undefined, rev.billingPincode || undefined].filter(Boolean).join(', ') || 'Address on file'}
          </p>
          {(rev.customerGstin || rev.customerPan) && (
            <p className="text-[10px] text-slate-700 font-mono mt-1.5 pt-1 border-t border-slate-200">
              {rev.customerGstin && <span><strong>GSTIN:</strong> {rev.customerGstin}</span>}
              {rev.customerGstin && rev.customerPan && <span>  |  </span>}
              {rev.customerPan && <span><strong>PAN:</strong> {rev.customerPan}</span>}
            </p>
          )}
        </div>

        {/* Ship To / AMC Identifiers */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 text-[11px]">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            {quotation.quotationType === 'AMC' ? 'AMC CONTRACT METADATA:' : 'DELIVERY DESTINATION / SITE:'}
          </span>
          {quotation.quotationType === 'AMC' ? (
            <div className="space-y-0.5 text-[10.5px]">
              <div><strong className="text-slate-900">AMC Plan:</strong> <span className="text-blue-700 font-bold">{rev.amcPlan || 'Ultra Care (UC)'}</span></div>
              <div><strong className="text-slate-900">End User:</strong> {rev.endUser || rev.companyName || '—'}</div>
              <div><strong className="text-slate-900">Contract Period:</strong> {formatDate(rev.amcStartDate || undefined)} to {formatDate(rev.amcEndDate || undefined)}</div>
              <div><strong className="text-slate-900">Visits:</strong> {rev.amcServiceFrequency || 'Quarterly'} ({rev.amcScheduledVisits ?? 4} Preventive, {rev.amcBreakdownVisitType || 'UNLIMITED'} Breakdown)</div>
              {(rev.customerCode || rev.branch || rev.zone) && (
                <p className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-200">
                  Code: {rev.customerCode || '—'} | Branch: {rev.branch || '—'} | Zone: {rev.zone || '—'}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="font-bold text-slate-950 text-xs">
                {rev.shippingName || quotation.destination?.name || 'Customer Facility Address'}
              </p>
              <p className="text-slate-600 mt-0.5">
                {[(rev.shippingAddress || quotation.destination?.address) || undefined, (rev.shippingCity || quotation.destination?.city) || undefined, (rev.shippingState || quotation.destination?.state) || undefined, (rev.shippingPincode || quotation.destination?.pincode) || undefined].filter(Boolean).join(', ') || 'As per billing address'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200">
                <strong>Sales Representative:</strong> {salesRep}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Subject Line */}
      {rev.subject && (
        <div className="relative z-10 mb-3 bg-slate-100/60 px-3 py-1.5 rounded border border-slate-200 text-[11px]">
          <strong className="text-slate-900">Subject:</strong> <span className="text-slate-800">{rev.subject}</span>
        </div>
      )}

      {/* Bill of Materials Line Items Table */}
      <div className="relative z-10 mb-4 overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full text-left text-[10.5px] border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[9px] uppercase font-bold tracking-wider">
              <th className="py-2 px-2 text-center w-8">#</th>
              <th className="py-2 px-2.5 min-w-[160px]">Product / Description</th>
              <th className="py-2 px-2 text-center w-16">HSN/SAC</th>
              <th className="py-2 px-2 text-right w-14">Qty</th>
              <th className="py-2 px-2 text-right w-18">
                {quotation.quotationType === 'AMC' ? 'AMC Amount' : 'Rate (₹)'}
              </th>
              <th className="py-2 px-2 text-right w-12">Disc</th>
              <th className="py-2 px-2 text-right w-18">Taxable</th>
              <th className="py-2 px-2 text-right w-12">GST</th>
              <th className="py-2 px-2.5 text-right w-22">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rev.items?.map((item: QuotationItem, idx: number) => (
              <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="py-2 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                <td className="py-2 px-2.5">
                  <div className="font-bold text-slate-900">{item.productName}</div>
                  {(item.equipmentType || item.equipmentConfiguration || item.equipmentRating) && (
                    <div className="text-[9px] text-blue-800 font-semibold">
                      {[item.equipmentType ? `Type: ${item.equipmentType}` : null, item.equipmentConfiguration ? `Config: ${item.equipmentConfiguration}` : null, item.equipmentRating ? `Rating: ${item.equipmentRating}` : null].filter(Boolean).join(' • ')}
                    </div>
                  )}
                  {(item.productSku || item.make) && (
                    <div className="text-[9px] text-slate-500">
                      {[item.productSku ? `SKU: ${item.productSku}` : null, item.make ? `Make: ${item.make}` : null].filter(Boolean).join(' • ')}
                    </div>
                  )}
                  {item.description && item.description !== item.productName && (
                    <div className="text-[9.5px] text-slate-600 mt-0.5">{item.description}</div>
                  )}
                </td>
                <td className="py-2 px-2 text-center text-slate-600 font-mono text-[9px]">{item.hsnSac || '—'}</td>
                <td className="py-2 px-2 text-right text-slate-900 font-medium">{item.quantity} {item.unit || ''}</td>
                <td className="py-2 px-2 text-right font-mono text-slate-700">{formatINR(item.unitPrice)}</td>
                <td className="py-2 px-2 text-right text-slate-500">{Number(item.discountPercent) > 0 ? `${item.discountPercent}%` : '—'}</td>
                <td className="py-2 px-2 text-right font-mono text-slate-800">{formatINR(item.taxableAmount)}</td>
                <td className="py-2 px-2 text-right font-medium text-slate-700">{item.gstRate}%</td>
                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-950">{formatINR(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scope of Work & Exclusions Block for AMC */}
      {quotation.quotationType === 'AMC' && (
        <div className="relative z-10 grid grid-cols-2 gap-4 mb-4 text-[10px]">
          {/* Scope */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <strong className="text-blue-900 block text-[9.5px] font-bold uppercase mb-1">AMC Scope of Work:</strong>
            {rev.amcScope && rev.amcScope.length > 0 ? (
              <ol className="list-decimal list-inside space-y-0.5 text-slate-800">
                {rev.amcScope.map((s: any, idx: number) => (
                  <li key={s.id || idx}>{s.description}</li>
                ))}
              </ol>
            ) : (
              <p className="text-slate-500 italic">Standard Preventive Scope Applies</p>
            )}
          </div>

          {/* Exclusions */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-2.5">
            <strong className="text-rose-900 block text-[9.5px] font-bold uppercase mb-1">Excluded Components:</strong>
            {rev.amcExclusions && rev.amcExclusions.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5 text-rose-800 font-semibold">
                {rev.amcExclusions.map((ex: any, idx: number) => (
                  <li key={ex.id || idx}>{ex.description}</li>
                ))}
              </ul>
            ) : (
              <p className="text-rose-600 italic">Standard Plan Exclusions Apply</p>
            )}
          </div>
        </div>
      )}

      {/* Technical Specifications Section */}
      {rev.items?.some((i) => i.technicalSpecifications && i.technicalSpecifications.trim().length > 0) && (
        <div className="relative z-10 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px]">
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Technical Specifications & Scope Notes:
          </span>
          <div className="space-y-1 text-slate-800">
            {rev.items
              .filter((i) => i.technicalSpecifications && i.technicalSpecifications.trim().length > 0)
              .map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="font-bold text-blue-700 shrink-0">Item {idx + 1} ({it.productName}):</span>
                  <span>{it.technicalSpecifications}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Commercial Summary & Amount in Words */}
      <div className="relative z-10 grid grid-cols-2 gap-4 mb-4 items-start">
        {/* Left: Amount in Words */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 text-[10.5px] space-y-1.5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
            AMOUNT IN WORDS (INR):
          </span>
          <p className="font-semibold text-slate-900 italic bg-white p-2 rounded border border-slate-200">
            "{rev.amountInWords || 'Indian Rupees Only'}"
          </p>
          {(rev.notes || rev.internalRemarks || rev.specialClauses) && (
            <div className="text-[9.5px] text-slate-600 pt-1 space-y-1">
              {rev.specialClauses && <p className="text-amber-900 font-medium"><strong>Special Clause:</strong> {rev.specialClauses}</p>}
              {rev.notes && <p><strong>Notes:</strong> {rev.notes}</p>}
            </div>
          )}
        </div>

        {/* Right: Authoritative Calculation Totals */}
        <div className="bg-white border border-slate-300 rounded-lg p-3 text-[11px] space-y-1 shadow-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal (Base Value):</span>
            <span className="font-mono">₹ {formatINR(rev.subtotal)}</span>
          </div>
          {Number(rev.totalDiscount || 0) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Total Discount:</span>
              <span className="font-mono">- ₹ {formatINR(rev.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-100">
            <span>Taxable Value:</span>
            <span className="font-mono">₹ {formatINR(rev.taxableAmount)}</span>
          </div>
          {isIntraState ? (
            <>
              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>CGST Total:</span>
                <span className="font-mono">₹ {formatINR(rev.cgstAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>SGST Total:</span>
                <span className="font-mono">₹ {formatINR(rev.sgstAmount)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-600 text-[10px]">
              <span>IGST Total:</span>
              <span className="font-mono">₹ {formatINR(rev.igstAmount)}</span>
            </div>
          )}
          {Number(rev.freightCharges || 0) > 0 && (
            <div className="flex justify-between text-slate-600 text-[10px]">
              <span>Freight & Insurance:</span>
              <span className="font-mono">₹ {formatINR(rev.freightCharges)}</span>
            </div>
          )}
          {Number(rev.roundOff || 0) !== 0 && (
            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>Round Off:</span>
              <span className="font-mono">₹ {rev.roundOff}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t-2 border-slate-950 font-bold text-sm text-slate-950">
            <span>GRAND TOTAL:</span>
            <span className="text-blue-700 font-mono text-base">₹ {formatINR(rev.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Commercial Terms & Conditions */}
      <div className="relative z-10 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px]">
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
          Commercial Terms & Conditions:
        </span>
        <div className="grid grid-cols-3 gap-3 text-slate-800">
          <div>
            <strong className="text-slate-900 block text-[9px]">PAYMENT TERMS:</strong>
            <p>{rev.amcPaymentTerms || rev.paymentTerms || '100% Advance with order'}</p>
          </div>
          <div>
            <strong className="text-slate-900 block text-[9px]">DELIVERY TERMS:</strong>
            <p>{rev.deliveryTerms || '2-3 Weeks from order confirmation'}</p>
          </div>
          <div>
            <strong className="text-slate-900 block text-[9px]">WARRANTY:</strong>
            <p>{rev.warrantyTerms || '12 Months standard warranty'}</p>
          </div>
        </div>
        {rev.termsAndConditions && (
          <div className="mt-2 pt-1.5 border-t border-slate-200 text-[9px] text-slate-600">
            <strong>Terms & Conditions:</strong> {rev.termsAndConditions.replace(/\n/g, '  |  ')}
          </div>
        )}
      </div>

      {/* Signature & Verification Block */}
      <div className="relative z-10 pt-3 border-t border-slate-300 grid grid-cols-2 text-[10px]">
        <div>
          <span className="text-slate-500 block text-[9px]">PREPARED BY:</span>
          <p className="font-bold text-slate-900 mt-0.5">{salesRep}</p>
          <p className="text-slate-500 text-[9px]">Date: {formatDate(quotation.createdAt)}</p>
        </div>
        <div className="text-right">
          <span className="text-slate-500 block text-[9px]">FOR TANEJA POWER SYSTEMS</span>
          <p className="font-bold text-slate-900 mt-0.5">{approverName}</p>
          <p className="text-slate-500 text-[9px]">
            {approvedAction ? `Approved on ${formatDate(approvedAction.actionAt)}` : 'Authorized Signatory'}
          </p>
        </div>
      </div>
    </div>
  );
};
