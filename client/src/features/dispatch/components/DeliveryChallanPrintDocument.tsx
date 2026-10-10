import React from 'react';
import type { Dispatch } from '../types/dispatch.types';

interface Props {
  dispatch: Dispatch;
}

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const DeliveryChallanPrintDocument: React.FC<Props> = ({ dispatch }) => {
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 font-sans text-slate-800 text-xs">
      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              TANEJA POWER GENERATION PVT. LTD.
            </h1>
            <p className="text-slate-600 text-xs mt-0.5">
              Power Generation, Diesel Generators & Electrical Engineering Solutions
            </p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Plot No. 42, Industrial Area, Phase II, New Delhi - 110020
            </p>
            <p className="text-slate-500 text-[11px]">
              GSTIN: <span className="font-mono font-medium">07AAAAA0000A1Z5</span> | Phone: +91 11 4567 8900
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-slate-900 text-white px-3 py-1 font-bold tracking-wider text-sm rounded mb-2">
              DELIVERY CHALLAN
            </div>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-slate-500">DC No:</span>{' '}
                <strong className="text-slate-900 font-mono text-xs">
                  {dispatch.deliveryChallanNumber || dispatch.dispatchNumber}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Dispatch Date:</span>{' '}
                <strong className="text-slate-900">{formatDate(dispatch.dispatchDate)}</strong>
              </div>
              {(dispatch.salesOrder?.salesOrderNumber || dispatch.salesOrder?.orderNumber) && (
                <div>
                  <span className="text-slate-500">SO Ref:</span>{' '}
                  <strong className="text-slate-800">
                    {dispatch.salesOrder.salesOrderNumber || dispatch.salesOrder.orderNumber}
                  </strong>
                </div>
              )}
              {dispatch.salesInvoice?.invoiceNumber && (
                <div>
                  <span className="text-slate-500">Invoice Ref:</span>{' '}
                  <strong className="text-slate-800">{dispatch.salesInvoice.invoiceNumber}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consignee / Shipping & Transport Information */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Consignee / Delivery Address */}
        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            DELIVERY TO (CONSIGNEE)
          </h2>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-slate-900 text-sm">{dispatch.customerNameSnapshot}</p>
            {dispatch.customerGstinSnapshot && (
              <p className="text-slate-600 font-medium">
                GSTIN:{' '}
                <span className="font-mono text-slate-900">{dispatch.customerGstinSnapshot}</span>
              </p>
            )}
            <p className="text-slate-600 mt-1">
              {[
                dispatch.destinationAddressSnapshot,
                dispatch.shippingCitySnapshot,
                dispatch.shippingStateSnapshot,
                dispatch.shippingPincodeSnapshot,
              ]
                .filter(Boolean)
                .join(', ') || 'Customer delivery address'}
            </p>
          </div>
        </div>

        {/* Dispatch & Transport Details */}
        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            TRANSPORT & LOGISTICS DETAILS
          </h2>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <div>
              <span className="text-slate-500">Transporter:</span>
              <p className="font-semibold text-slate-800">
                {dispatch.transporterName || 'Self / Own Fleet'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Vehicle No:</span>
              <p className="font-mono font-semibold text-slate-800">
                {dispatch.vehicleNumber || '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Driver Name:</span>
              <p className="font-medium text-slate-800">{dispatch.driverName || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Driver Phone:</span>
              <p className="font-medium text-slate-800">{dispatch.driverPhone || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatched Goods Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 text-[10px] font-bold border-b border-slate-200">
              <th className="py-2.5 px-3 text-center w-8">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3 text-center">SKU / Part No.</th>
              <th className="py-2.5 px-3 text-center">HSN/SAC</th>
              <th className="py-2.5 px-3 text-center">Unit</th>
              <th className="py-2.5 px-3 text-right">Dispatched Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            {(dispatch.items || []).map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-slate-900">{item.productNameSnapshot}</div>
                  {item.descriptionSnapshot && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {item.descriptionSnapshot}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                  {item.skuSnapshot || '—'}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                  {item.hsnSacSnapshot || '—'}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-600">
                  {item.unitSnapshot || 'NOS'}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900 text-sm">
                  {item.dispatchQuantity}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-xs">
              <td colSpan={5} className="py-2 px-3 text-right text-slate-700">
                Total Dispatched Items / Quantity:
              </td>
              <td className="py-2 px-3 text-right font-bold text-slate-900 text-sm">
                {(dispatch.items || []).reduce(
                  (acc, item) => acc + (Number(item.dispatchQuantity) || 0),
                  0
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Special Instructions / Notes */}
      {dispatch.notes && (
        <div className="mb-6 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
          <span className="font-semibold text-slate-700">Instructions / Remarks:</span>
          <p className="text-slate-600 mt-0.5">{dispatch.notes}</p>
        </div>
      )}

      {/* Declarations & Signature Section */}
      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 mt-6">
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            RECEIVER'S ACKNOWLEDGEMENT
          </h3>
          <p className="text-[10px] text-slate-500 mb-8">
            Received the above mentioned goods in good condition, complete quantity, and without any damage.
          </p>
          <div className="pt-2 border-t border-dashed border-slate-300">
            <p className="text-slate-700 font-semibold text-xs">Receiver's Signature & Company Stamp</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Date & Time of Delivery: ___________________</p>
          </div>
        </div>

        <div className="text-right flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              FOR TANEJA POWER GENERATION PVT. LTD.
            </h3>
            <p className="text-[10px] text-slate-400">Stores & Dispatch Department</p>
          </div>
          <div className="pt-2 border-t border-dashed border-slate-300 mt-12">
            <p className="text-slate-700 font-semibold text-xs">Authorized Dispatch Signatory</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Goods Dispatched & Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
};
