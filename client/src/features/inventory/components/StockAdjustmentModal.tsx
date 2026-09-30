import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { inventoryService } from '../services/inventoryService';
import { toast } from '../../../utils/toast';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string; sku: string; stockQuantity: number } | null;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'physical' | 'delta'>('physical');
  const [newQuantity, setNewQuantity] = useState<number | ''>('');
  const [delta, setDelta] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const currentStock = product.stockQuantity;
  const computedNewStock =
    mode === 'physical'
      ? typeof newQuantity === 'number'
        ? newQuantity
        : currentStock
      : typeof delta === 'number'
      ? currentStock + delta
      : currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason || reason.trim().length < 3) {
      setError('A valid reason (minimum 3 characters) is required for audit compliance.');
      return;
    }

    if (mode === 'physical' && (newQuantity === '' || newQuantity < 0)) {
      setError('Please specify a valid non-negative physical count.');
      return;
    }

    if (mode === 'delta' && (delta === '' || delta === 0)) {
      setError('Please specify a non-zero adjustment delta.');
      return;
    }

    if (computedNewStock < 0) {
      setError(`Adjustment would produce negative inventory (${computedNewStock}). Operation rejected.`);
      return;
    }

    if (computedNewStock === currentStock) {
      setError('Adjustment results in no change to inventory count.');
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryService.adjustStock({
        productId: product.id,
        ...(mode === 'physical' ? { newQuantity: Number(newQuantity) } : { quantity: Number(delta) }),
        reason: reason.trim(),
      });
      toast.success(`Stock adjusted successfully to ${computedNewStock} units.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to adjust stock';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Inventory Stock"
    >
      <div className="mb-4 text-xs text-slate-500">
        Audit-tracked stock correction for "{product.name}" ({product.sku})
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Current Recorded Stock:</span>
            <span className="ml-2 font-bold text-slate-800 text-sm">{currentStock} units</span>
          </div>
          <div>
            <span className="text-slate-500">New Projected Stock:</span>
            <span
              className={`ml-2 font-bold text-sm ${
                computedNewStock < currentStock
                  ? 'text-rose-600'
                  : computedNewStock > currentStock
                  ? 'text-emerald-600'
                  : 'text-slate-800'
              }`}
            >
              {computedNewStock} units
            </span>
          </div>
        </div>

        <div className="flex gap-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'physical'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => setMode('physical')}
          >
            Physical Count (Target Total)
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'delta'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => setMode('delta')}
          >
            Relative Delta (+ / -)
          </button>
        </div>

        {mode === 'physical' ? (
          <Input
            label="Actual Physical Count *"
            type="number"
            min="0"
            placeholder={String(currentStock)}
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            autoFocus
          />
        ) : (
          <Input
            label="Adjustment Quantity (use positive to add, negative to subtract) *"
            type="number"
            placeholder="e.g. -3 or +5"
            value={delta}
            onChange={(e) => setDelta(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            autoFocus
          />
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Reason / Audit Remarks *
          </label>
          <textarea
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
            rows={2}
            placeholder="e.g. Annual physical stock audit, damaged goods write-off..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
