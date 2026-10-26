import React from 'react';
import type { ProformaInvoice } from '../types/proforma-invoice.types';

interface Props {
  invoice: ProformaInvoice;
}

const formatINR = (val: number | string | undefined | null) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function numberToWordsINR(amount: number): string {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    return b[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? a[n % 10] + ' ' : '');
  }

  function convertThreeDigits(n: number): string {
    let s = '';
    if (Math.floor(n / 100) > 0) {
      s += a[Math.floor(n / 100)] + ' Hundred ';
    }
    s += convertTwoDigits(n % 100);
    return s;
  }

  let intVal = Math.floor(amount);
  const paise = Math.round((amount - intVal) * 100);

  if (intVal === 0 && paise === 0) return 'Zero Rupees Only';

  let res = '';
  const crore = Math.floor(intVal / 10000000);
  intVal %= 10000000;
  const lakh = Math.floor(intVal / 100000);
  intVal %= 100000;
  const thousand = Math.floor(intVal / 1000);
  intVal %= 1000;
  const rem = intVal;

  if (crore > 0) res += convertThreeDigits(crore) + 'Crore ';
  if (lakh > 0) res += convertThreeDigits(lakh) + 'Lakh ';
  if (thousand > 0) res += convertThreeDigits(thousand) + 'Thousand ';
  if (rem > 0) res += convertThreeDigits(rem);

  res = res.trim() + ' Rupees';
  if (paise > 0) {
    res += ' and ' + convertTwoDigits(paise).trim() + ' Paise';
  }
  return res + ' Only';
}

export const ProformaInvoicePrintDocument: React.FC<Props> = ({ invoice }) => {
  const isIntraState =
    Number(invoice.cgstAmount || 0) > 0 || Number(invoice.sgstAmount || 0) > 0;

  const totalAmountNum = Number(invoice.totalAmount || 0);
  const advanceRequestedNum = Number(invoice.advanceAmountRequested || 0);
  const paidAmountNum = Number(invoice.paidAmount || 0);
  const remainingPayableNum = Math.max(0, totalAmountNum - paidAmountNum);

  return (
    <div className="invoice-print-container bg-white text-slate-900 p-4 sm:p-8 max-w-[210mm] w-full mx-auto relative font-sans text-xs leading-normal print:p-0 print:max-w-full">
      {/* Header with Company Logo & Document Banner */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          {/* Logo & Company Details */}
          <div className="flex flex-col gap-1 w-full sm:max-w-[58%]">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Taneja Power"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                  TANEJA POWER SYSTEMS
                </h1>
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                  Industrial Heavy Engineering & Power Solutions
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
              29, 4th Floor, Earth Alfa, Vasna - Bhayli Main Rd, opp. Nilamber Bunglow,
              Ashwamegh Nagar, Tandalja, Vadodara, Gujarat 390020
              <br />
              <span className="font-semibold text-slate-800">GSTIN:</span> 24AABCT1234F1Z5 •{' '}
              <span className="font-semibold text-slate-800">State:</span> Gujarat (24) •{' '}
              <span className="font-semibold text-slate-800">Email:</span> billing@tanejapower.com
            </p>
          </div>

          {/* Pro Forma Metadata Banner */}
          <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-sm font-black text-indigo-800 tracking-wider uppercase bg-indigo-50 px-3 py-1 rounded-md border border-indigo-300 shadow-xs">
                PRO FORMA INVOICE
              </span>
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                Preliminary Commercial Document
              </span>
            </div>
            <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-left sm:text-right text-[11px] space-y-1 w-full sm:min-w-[210px]">
              <div>
                <span className="text-slate-500">PI Number:</span>{' '}
                <strong className="text-slate-900 font-mono text-xs">{invoice.proformaInvoiceNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500">PI Date:</span>{' '}
                <strong className="text-slate-900">{formatDate(invoice.proformaInvoiceDate)}</strong>
              </div>
              {invoice.validityDate && (
                <div>
                  <span className="text-slate-500">Valid Until:</span>{' '}
                  <strong className="text-slate-900">{formatDate(invoice.validityDate)}</strong>
                </div>
              )}
              {invoice.salesOrder?.salesOrderNumber && (
                <div>
                  <span className="text-slate-500">SO Ref:</span>{' '}
                  <strong className="text-indigo-700 font-mono">{invoice.salesOrder.salesOrderNumber}</strong>
                </div>
              )}
              {invoice.salesOrder?.customerPoNumber && (
                <div>
                  <span className="text-slate-500">Customer PO:</span>{' '}
                  <strong className="text-slate-800">{invoice.salesOrder.customerPoNumber}</strong>
                </div>
              )}
              <div>
                <span className="text-slate-500">Document Status:</span>{' '}
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : invoice.status === 'PARTIALLY_PAID'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-200 text-slate-800'
                }`}>
                  {invoice.status === 'PAID' ? 'PAID (ADVANCE MET)' : invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preliminary Commercial Notice Disclaimer */}
      <div className="mb-4 bg-indigo-50/70 border border-indigo-200 rounded-lg p-2.5 text-[11px] text-indigo-950 flex items-start gap-2">
        <span className="font-bold text-indigo-700 shrink-0 uppercase tracking-wider text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded">
          Notice
        </span>
        <span className="leading-snug">
          This Pro Forma Invoice is issued for preliminary commercial and payment-reference purposes. It is not a substitute for the applicable Tax Invoice.
        </span>
      </div>

      {/* Bill To & Ship To Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
        <div>
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            BILL TO (CUSTOMER)
          </h2>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-slate-900 text-sm">
              {invoice.customerName || invoice.customer?.name || 'Customer'}
            </p>
            {(invoice.legalName || invoice.customer?.companyName) && (
              <p className="font-semibold text-slate-700">
                {invoice.legalName || invoice.customer?.companyName}
              </p>
            )}
            <p className="text-slate-600">
              {[invoice.billingAddress, invoice.billingCity, invoice.billingState, invoice.billingPincode]
                .filter(Boolean)
                .join(', ') || 'Address on file'}
            </p>
            {invoice.gstin && (
              <p className="text-slate-700 font-semibold pt-1">
                GSTIN / UIN:{' '}
                <span className="font-mono text-slate-900">{invoice.gstin}</span>
              </p>
            )}
            {invoice.customerEmail && (
              <p className="text-slate-600 text-[10px]">
                Email: {invoice.customerEmail} {invoice.customerPhone ? `• Phone: ${invoice.customerPhone}` : ''}
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            SHIP TO (CONSIGNEE)
          </h2>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-slate-900">
              {invoice.shippingName || invoice.customerName || 'Same as Billing'}
            </p>
            <p className="text-slate-600">
              {[invoice.shippingAddress, invoice.shippingCity, invoice.shippingState, invoice.shippingPincode]
                .filter(Boolean)
                .join(', ') || [invoice.billingAddress, invoice.billingCity, invoice.billingState, invoice.billingPincode].filter(Boolean).join(', ') || 'Same as billing address'}
            </p>
            {invoice.expectedDeliveryTimeline && (
              <p className="text-slate-700 font-medium pt-1 text-[11px]">
                Delivery Timeline:{' '}
                <span className="text-slate-900 font-semibold">{invoice.expectedDeliveryTimeline}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4">
        <table className="w-full min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 text-[10px] font-bold border-b border-slate-200">
              <th className="py-2 px-2 text-center w-8">#</th>
              <th className="py-2 px-3">Description &amp; Item</th>
              <th className="py-2 px-2 text-center">HSN/SAC</th>
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-right">Unit Rate</th>
              <th className="py-2 px-2 text-right">Taxable Amt</th>
              {isIntraState ? (
                <>
                  <th className="py-2 px-2 text-right">CGST (9%)</th>
                  <th className="py-2 px-2 text-right">SGST (9%)</th>
                </>
              ) : (
                <th className="py-2 px-2 text-right">IGST (18%)</th>
              )}
              <th className="py-2 px-3 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            {(invoice.items || []).map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/50">
                <td className="py-2 px-2 text-center text-slate-500">{idx + 1}</td>
                <td className="py-2 px-3">
                  <div className="font-semibold text-slate-900">{item.productNameSnapshot}</div>
                  {item.skuSnapshot && (
                    <div className="text-[10px] font-mono text-slate-500">SKU: {item.skuSnapshot}</div>
                  )}
                  {item.descriptionSnapshot && (
                    <div className="text-[10px] text-slate-500">{item.descriptionSnapshot}</div>
                  )}
                </td>
                <td className="py-2 px-2 text-center font-mono text-slate-600">
                  {item.hsnSacSnapshot || '8504'}
                </td>
                <td className="py-2 px-2 text-right font-semibold">
                  {Number(item.quantity).toLocaleString()} {item.unitSnapshot || 'NOS'}
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-700">
                  {formatINR(item.unitPrice)}
                </td>
                <td className="py-2 px-2 text-right font-mono font-medium text-slate-900">
                  {formatINR(item.taxableAmount)}
                </td>
                {isIntraState ? (
                  <>
                    <td className="py-2 px-2 text-right font-mono text-slate-600">
                      {formatINR(item.cgstAmount)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600">
                      {formatINR(item.sgstAmount)}
                    </td>
                  </>
                ) : (
                  <td className="py-2 px-2 text-right font-mono text-slate-600">
                    {formatINR(item.igstAmount)}
                  </td>
                )}
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                  {formatINR(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Summary & Commercial Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
        <div className="col-span-1 lg:col-span-7 space-y-3">
          {/* Amount in words */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              AMOUNT IN WORDS
            </h2>
            <p className="text-xs font-semibold text-slate-900 italic">
              {numberToWordsINR(Number(invoice.totalAmount))}
            </p>
          </div>

          {/* Payment Terms & Advance Details Box */}
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-800">
            <h2 className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider">
              Commercial &amp; Payment Schedule
            </h2>
            {invoice.paymentTerms && (
              <div>
                <span className="text-slate-500 font-medium">Agreed Terms:</span>{' '}
                <span className="font-semibold text-slate-900">{invoice.paymentTerms}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-indigo-100">
              <div>
                <span className="text-[10px] text-slate-500 block">Advance Requested</span>
                <span className="font-bold font-mono text-amber-700">
                  ₹{formatINR(advanceRequestedNum)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Advance Received</span>
                <span className="font-bold font-mono text-emerald-700">
                  ₹{formatINR(paidAmountNum)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Balance Payable</span>
                <span className="font-bold font-mono text-slate-900">
                  ₹{formatINR(remainingPayableNum)}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Instructions */}
          <div className="text-[10px] text-slate-600 space-y-1 p-2.5 border border-dashed border-slate-200 rounded-lg">
            <h2 className="font-bold text-slate-700">Bank Details for RTGS / NEFT / IMPS:</h2>
            <p>Bank: HDFC Bank Ltd • Branch: Alkapuri, Vadodara</p>
            <p>Account Name: Taneja Power Systems • A/C No: 50200012345678</p>
            <p>IFSC Code: HDFC0000123</p>
          </div>
        </div>

        {/* Totals Table */}
        <div className="col-span-1 lg:col-span-5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (Taxable):</span>
              <span className="font-mono">{formatINR(invoice.taxableAmount || invoice.subtotal)}</span>
            </div>

            {Number(invoice.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span className="font-mono">- {formatINR(invoice.discountAmount)}</span>
              </div>
            )}

            {isIntraState ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span className="font-mono">{formatINR(invoice.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span className="font-mono">{formatINR(invoice.sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-600">
                <span>IGST (18%):</span>
                <span className="font-mono">{formatINR(invoice.igstAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Total Tax:</span>
              <span className="font-mono">{formatINR(invoice.totalTax)}</span>
            </div>

            {Number(invoice.roundOff || 0) !== 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Round Off:</span>
                <span className="font-mono">{formatINR(invoice.roundOff)}</span>
              </div>
            )}

            <div className="pt-2 border-t-2 border-slate-300 flex justify-between font-black text-slate-950 text-sm">
              <span>Estimated Total:</span>
              <span className="font-mono text-indigo-900">{formatINR(invoice.totalAmount)}</span>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between text-amber-800 font-semibold">
                <span>Advance Required:</span>
                <span className="font-mono">₹{formatINR(advanceRequestedNum)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Advance Paid:</span>
                <span className="font-mono">₹{formatINR(paidAmountNum)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1">
                <span>Remaining Payable:</span>
                <span className="font-mono">₹{formatINR(remainingPayableNum)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Signatory */}
      <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[10px] text-slate-500">
        <div className="w-full sm:max-w-[50%] space-y-1">
          <h2 className="font-bold text-slate-700">Terms &amp; Conditions:</h2>
          <ol className="list-decimal pl-3 space-y-0.5">
            <li>This document is a Pro Forma Invoice and does not convey title to goods.</li>
            <li>Tax Invoice will be issued upon dispatch/delivery according to GST regulations.</li>
            <li>Advance payment receipt will be issued upon realization of remittance.</li>
            <li>Subject to Vadodara jurisdiction only.</li>
          </ol>
        </div>

        <div className="w-full sm:w-auto text-left sm:text-right space-y-6 sm:space-y-8">
          <p className="font-bold text-slate-800">For TANEJA POWER SYSTEMS</p>
          <div className="pt-4 border-t border-slate-300 min-w-[160px] w-fit sm:ml-auto">
            <p className="font-semibold text-slate-700">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};
