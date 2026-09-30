import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Eye,
  Send,
  RefreshCw,
  X,
  Printer,
  AlertTriangle,
  PackageCheck,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import type {
  DispatchStatus,
  CreateDispatchPayload,
} from '../types/dispatch.types';
import {
  useDispatches,
  useDispatch,
  useDispatchableItems,
  useCreateDispatch,
  useSubmitDispatch,
  useConfirmDispatch,
  useCancelDispatch,
} from '../hooks';
import { useSalesOrders } from '../../sales-orders/hooks';
import { DeliveryChallanPrintDocument } from '../components/DeliveryChallanPrintDocument';

// ─── Status Badges ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DispatchStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  PENDING_DISPATCH: { label: 'Pending Dispatch', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  DISPATCHED: { label: 'Dispatched (Stock OUT)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function StatusBadge({ status }: { status: DispatchStatus }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Create Dispatch Modal ───────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  initialSalesOrderId?: string;
}

const CreateDispatchModal: React.FC<CreateModalProps> = ({ onClose, initialSalesOrderId }) => {
  const [selectedSoId, setSelectedSoId] = useState<string>(initialSalesOrderId || '');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [transporterContact, setTransporterContact] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Sales Orders eligible for dispatch
  const { data: soRes, isLoading: loadingSOs } = useSalesOrders();
  const salesOrders = (soRes?.data || []).filter(
    (so: any) =>
      ['CONFIRMED', 'PARTIALLY_INVOICED', 'FULLY_INVOICED'].includes(so.status) &&
      so.dispatchStatus !== 'FULLY_DISPATCHED'
  );

  // Dispatchable items query for selected SO
  const { data: dispatchable, isLoading: loadingItems } = useDispatchableItems(selectedSoId);

  const createDispatchMutation = useCreateDispatch();

  const handleQtyChange = (itemId: string, maxQty: number, maxStock: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      setQuantities((prev) => ({ ...prev, [itemId]: 0 }));
      return;
    }
    // Limit to remaining SO quantity and available stock
    const safeMax = Math.min(maxQty, maxStock);
    const clamped = Math.min(num, safeMax);
    setQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSoId) return;

    if (!dispatchable?.items?.length) {
      return;
    }

    const itemsToDispatch = dispatchable.items
      .map((it) => ({
        salesOrderItemId: it.salesOrderItemId,
        dispatchQuantity: quantities[it.salesOrderItemId] !== undefined ? quantities[it.salesOrderItemId] : Math.min(it.remainingDispatchableQuantity, it.currentPhysicalStock),
      }))
      .filter((it) => it.dispatchQuantity > 0);

    if (itemsToDispatch.length === 0) {
      alert('Please enter a dispatch quantity greater than 0 for at least one item with stock available.');
      return;
    }

    const payload: CreateDispatchPayload = {
      salesOrderId: selectedSoId,
      vehicleNumber: vehicleNumber.trim() || undefined,
      transporterName: transporterName.trim() || undefined,
      transporterContact: transporterContact.trim() || undefined,
      driverName: driverName.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      destinationAddressSnapshot: dispatchable.shippingAddress,
      shippingCitySnapshot: dispatchable.shippingCity,
      shippingStateSnapshot: dispatchable.shippingState,
      shippingPincodeSnapshot: dispatchable.shippingPincode,
      items: itemsToDispatch,
    };

    try {
      await createDispatchMutation.mutateAsync(payload);
      onClose();
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Delivery Challan / Dispatch</h2>
              <p className="text-xs text-gray-500">From a confirmed Sales Order (Starts as DRAFT, no stock deduction yet)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Sales Order Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Select Sales Order *
            </label>
            <select
              value={selectedSoId}
              onChange={(e) => {
                setSelectedSoId(e.target.value);
                setQuantities({});
              }}
              required
              disabled={!!initialSalesOrderId || loadingSOs}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Choose Confirmed Sales Order --</option>
              {salesOrders.map((so: any) => (
                <option key={so.id} value={so.id}>
                  {so.orderNumber || so.id} — {so.customer?.companyName || so.customerNameSnapshot || 'Customer'} (Status: {so.status}, Dispatch: {so.dispatchStatus || 'NOT_DISPATCHED'})
                </option>
              ))}
            </select>
          </div>

          {/* Delivery & Dispatchable Items */}
          {selectedSoId && (
            <>
              {loadingItems ? (
                <div className="py-8 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Loading order items & stock levels...
                </div>
              ) : dispatchable ? (
                <div className="space-y-4">
                  {/* Destination Info */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex justify-between">
                    <div>
                      <span className="text-gray-500">Customer:</span>{' '}
                      <strong className="text-gray-900">{dispatchable.customerName}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Shipping Address:</span>{' '}
                      <span className="text-gray-700 font-medium">
                        {[dispatchable.shippingAddress, dispatchable.shippingCity, dispatchable.shippingState].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Dispatch Items & Stock Availability
                    </h3>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                          <tr>
                            <th className="py-2.5 px-3">Item / SKU</th>
                            <th className="py-2.5 px-2 text-right">Ordered</th>
                            <th className="py-2.5 px-2 text-right">Prev. Dispatched</th>
                            <th className="py-2.5 px-2 text-right text-blue-600">Remaining</th>
                            <th className="py-2.5 px-2 text-right text-emerald-600 font-bold">Physical Stock</th>
                            <th className="py-2.5 px-3 text-right w-32">Dispatch Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {dispatchable.items.map((item) => {
                            const defaultQty = Math.min(item.remainingDispatchableQuantity, item.currentPhysicalStock);
                            const currentVal = quantities[item.salesOrderItemId] !== undefined ? quantities[item.salesOrderItemId] : defaultQty;
                            const isOutOfStock = item.currentPhysicalStock <= 0;

                            return (
                              <tr key={item.salesOrderItemId} className="hover:bg-gray-50/50">
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-gray-900">{item.productName}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">{item.sku || 'No SKU'}</div>
                                </td>
                                <td className="py-2.5 px-2 text-right text-gray-600 font-mono">
                                  {item.orderedQuantity} {item.unit}
                                </td>
                                <td className="py-2.5 px-2 text-right text-gray-500 font-mono">
                                  {item.previouslyDispatchedQuantity}
                                </td>
                                <td className="py-2.5 px-2 text-right font-semibold text-blue-700 font-mono">
                                  {item.remainingDispatchableQuantity}
                                </td>
                                <td className="py-2.5 px-2 text-right font-bold font-mono">
                                  <span className={item.currentPhysicalStock > 0 ? 'text-emerald-700' : 'text-rose-600 font-bold'}>
                                    {item.currentPhysicalStock}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    max={Math.min(item.remainingDispatchableQuantity, item.currentPhysicalStock)}
                                    step="any"
                                    value={currentVal}
                                    disabled={isOutOfStock || item.remainingDispatchableQuantity <= 0}
                                    onChange={(e) =>
                                      handleQtyChange(
                                        item.salesOrderItemId,
                                        item.remainingDispatchableQuantity,
                                        item.currentPhysicalStock,
                                        e.target.value
                                      )
                                    }
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Logistics / Transport Details */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Transport & Logistics Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-gray-600 mb-1">Vehicle Number</label>
                        <input
                          type="text"
                          placeholder="e.g. DL 01 AB 1234"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1">Transporter Name</label>
                        <input
                          type="text"
                          placeholder="e.g. BlueDart / Self"
                          value={transporterName}
                          onChange={(e) => setTransporterName(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1">Transporter Contact / Phone</label>
                        <input
                          type="text"
                          placeholder="Transporter Contact"
                          value={transporterContact}
                          onChange={(e) => setTransporterContact(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1">Driver Name</label>
                        <input
                          type="text"
                          placeholder="Driver Full Name"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1">Driver / Transporter Phone</label>
                        <input
                          type="text"
                          placeholder="+91 9876543210"
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Dispatch Notes / Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Special handling instructions, delivery remarks..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDispatchMutation.isPending || !selectedSoId}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {createDispatchMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating Draft...
                </>
              ) : (
                'Create Dispatch Draft'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Detail Drawer Component ──────────────────────────────────────────────────

interface DetailDrawerProps {
  dispatchId: string;
  onClose: () => void;
  canDispatch: boolean;
  canSubmit: boolean;
}

const DispatchDetailDrawer: React.FC<DetailDrawerProps> = ({
  dispatchId,
  onClose,
  canDispatch,
  canSubmit,
}) => {
  const { data: dispatch, isLoading } = useDispatch(dispatchId);
  const submitMutation = useSubmitDispatch();
  const confirmMutation = useConfirmDispatch();
  const cancelMutation = useCancelDispatch();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  if (isLoading || !dispatch) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex justify-end">
        <div className="bg-white w-full max-w-2xl h-full p-6 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const isDraft = dispatch.status === 'DRAFT';
  const isPending = dispatch.status === 'PENDING_DISPATCH';
  const isDispatched = dispatch.status === 'DISPATCHED';
  const isCancelled = dispatch.status === 'CANCELLED';

  const handleConfirmStockOut = async () => {
    if (
      !confirm(
        `Are you sure you want to confirm Delivery Challan ${dispatch.dispatchNumber}?\n\nThis will physically deduct stock from inventory (Stock OUT) through StockService.`
      )
    ) {
      return;
    }
    await confirmMutation.mutateAsync(dispatch.id);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    await cancelMutation.mutateAsync({ id: dispatch.id, payload: { cancellationReason: cancelReason.trim() } });
    setShowCancelModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 font-mono">{dispatch.dispatchNumber}</h2>
              <StatusBadge status={dispatch.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Sales Order Ref: <strong className="text-gray-700">{dispatch.salesOrder?.orderNumber || '—'}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white text-gray-600 text-xs flex items-center gap-1 font-medium transition-colors"
              title="Print Delivery Challan"
            >
              <Printer className="w-4 h-4" />
              <span>Print DC</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Customer & Consignee */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Consignee / Customer Details</span>
            </div>
            <div className="space-y-1 text-slate-700">
              <p className="font-bold text-sm text-slate-900">{dispatch.customerNameSnapshot}</p>
              {dispatch.customerGstinSnapshot && (
                <p className="font-mono text-[11px] text-slate-500">GSTIN: {dispatch.customerGstinSnapshot}</p>
              )}
              <p className="text-slate-600 mt-1">
                {[
                  dispatch.destinationAddressSnapshot,
                  dispatch.shippingCitySnapshot,
                  dispatch.shippingStateSnapshot,
                  dispatch.shippingPincodeSnapshot,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Address on record'}
              </p>
            </div>
          </div>

          {/* Logistics Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Logistics & Vehicle Information</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Vehicle No</span>
                <span className="font-mono font-bold text-slate-900">{dispatch.vehicleNumber || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Transporter</span>
                <span className="font-semibold text-slate-900">{dispatch.transporterName || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Driver Name</span>
                <span className="font-medium text-slate-900">{dispatch.driverName || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Driver Contact</span>
                <span className="font-medium text-slate-900">{dispatch.driverPhone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-semibold text-gray-800 uppercase tracking-wider text-[11px] mb-2">
              Dispatched Line Items
            </h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-2 text-center">Unit</th>
                    <th className="py-2 px-2 text-right">SO Ordered</th>
                    <th className="py-2 px-3 text-right font-bold text-slate-900">Dispatched Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(dispatch.items || []).map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-900">{it.productNameSnapshot}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{it.skuSnapshot || '—'}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-500">{it.unitSnapshot || 'NOS'}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-gray-600">{it.orderedQuantity}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-sm text-slate-900">
                        {it.dispatchQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cancellation Info (if cancelled) */}
          {isCancelled && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Dispatch Cancelled</span>
              </div>
              <p>Reason: {dispatch.cancellationReason || 'No reason specified'}</p>
            </div>
          )}

          {/* Stock OUT Ledger Confirmation Note */}
          {isDispatched && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>Physical Stock OUT Confirmed</span>
              </div>
              <p>
                Inventory deducted via <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">StockService.removeStock()</code> on{' '}
                {dispatch.dispatchedAt ? new Date(dispatch.dispatchedAt).toLocaleString('en-IN') : '—'}.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div>
            {!isCancelled && !isDispatched && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Cancel Dispatch
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDraft && canSubmit && (
              <button
                type="button"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate(dispatch.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitMutation.isPending ? 'Submitting...' : 'Submit for Dispatch'}</span>
              </button>
            )}

            {isPending && canDispatch && (
              <button
                type="button"
                disabled={confirmMutation.isPending}
                onClick={handleConfirmStockOut}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>{confirmMutation.isPending ? 'Deducting Stock...' : 'Confirm Dispatch (Stock OUT)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
          <form onSubmit={handleCancelSubmit} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">Cancel Dispatch</h3>
            <p className="text-xs text-gray-500 mb-4">
              Please enter the reason for cancelling this Delivery Challan. This operation is permanent.
            </p>
            <textarea
              required
              rows={3}
              placeholder="Cancellation reason..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Print DC Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-gray-700" />
                <span className="font-bold text-sm text-gray-800">Print Preview — Delivery Challan</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-200/60 print:p-0 print:bg-white">
              <DeliveryChallanPrintDocument dispatch={dispatch} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Dispatches Page ─────────────────────────────────────────────────────

export const DispatchesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const designation = (user?.designation || '').toLowerCase();
  const isAccountant = user?.role === 'USER' && designation.includes('accountant');

  const canCreateOrSubmit = isAdmin || isManager || isAccountant;
  const canDispatch = isAdmin || isManager;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DispatchStatus | ''>('');
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: res, isLoading, refetch } = useDispatches({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  });

  const dispatches = res?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            Dispatch & Delivery Challans
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Physical stock fulfillment, shipment tracking, and Delivery Challan issuance (Phase 5 Stock OUT)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-50 shadow-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canCreateOrSubmit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Delivery Challan</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by DC number, Sales Order, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_DISPATCH">Pending Dispatch</option>
            <option value="DISPATCHED">Dispatched (Stock OUT)</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loading dispatches...
          </div>
        ) : dispatches.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No Dispatches found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Create a new Delivery Challan from an eligible confirmed Sales Order to record goods fulfillment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">DC / Dispatch No.</th>
                  <th className="py-3 px-3">Sales Order</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Logistics</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dispatches.map((disp) => (
                  <tr key={disp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-gray-900 text-xs">
                        {disp.deliveryChallanNumber || disp.dispatchNumber}
                      </div>
                      {disp.salesInvoice?.invoiceNumber && (
                        <div className="text-[10px] text-gray-400 font-mono">
                          Inv: {disp.salesInvoice.invoiceNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-800">
                      {disp.salesOrder?.orderNumber || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900">{disp.customerNameSnapshot}</div>
                      {disp.shippingCitySnapshot && (
                        <div className="text-[10px] text-gray-400">{disp.shippingCitySnapshot}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      {new Date(disp.dispatchDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      {disp.vehicleNumber ? (
                        <span className="font-mono text-xs">{disp.vehicleNumber}</span>
                      ) : (
                        <span className="text-gray-400 italic">No vehicle</span>
                      )}
                      {disp.transporterName && (
                        <div className="text-[10px] text-gray-500">{disp.transporterName}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={disp.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedDispatchId(disp.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-xs inline-flex items-center gap-1"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && <CreateDispatchModal onClose={() => setShowCreateModal(false)} />}

      {/* Detail Drawer */}
      {selectedDispatchId && (
        <DispatchDetailDrawer
          dispatchId={selectedDispatchId}
          onClose={() => setSelectedDispatchId(null)}
          canDispatch={canDispatch}
          canSubmit={canCreateOrSubmit}
        />
      )}
    </div>
  );
};
export default DispatchesPage;
