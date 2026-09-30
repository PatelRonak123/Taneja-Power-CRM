import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { inventoryService } from '../services/inventoryService';
import { StockMovement } from '../types/inventory.types';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal, Calendar, User, FileText } from 'lucide-react';

interface StockMovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string; sku: string; stockQuantity: number } | null;
}

export const StockMovementHistoryModal: React.FC<StockMovementHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product?.id) {
      loadMovements();
    }
  }, [isOpen, product?.id]);

  const loadMovements = async () => {
    if (!product?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await inventoryService.getStockMovements(product.id, { limit: 50 });
      setMovements(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock movements');
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) return null;

  const getMovementBadge = (type: string, qty: number) => {
    switch (type) {
      case 'IN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft size={12} /> +{qty} IN
          </span>
        );
      case 'OUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowUpRight size={12} /> -{qty} OUT
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <SlidersHorizontal size={12} /> {qty > 0 ? `+${qty}` : qty} ADJ
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Audit Ledger"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="text-xs text-slate-500">
          Chronological stock movement audit trail for {product.name} ({product.sku})
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-500">Current Stock Snapshot:</span>
          <span className="font-bold text-slate-800 text-sm">{product.stockQuantity} units</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{error}</div>
        ) : movements.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No stock movements recorded for this product yet.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {movements.map((m) => (
              <div key={m.id} className="p-3 hover:bg-slate-50 transition-colors text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getMovementBadge(m.movementType, m.quantity)}
                    <span className="text-slate-500 font-medium">
                      {m.previousQuantity} → <span className="font-bold text-slate-800">{m.newQuantity}</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar size={11} /> {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-slate-600 flex items-start gap-1 text-[11px]">
                  <FileText size={11} className="mt-0.5 shrink-0 text-slate-400" />
                  <span>
                    <span className="font-medium text-slate-700">[{m.referenceType}]</span>{' '}
                    {m.reason || 'No remarks provided'}
                  </span>
                </div>

                {m.createdByName && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <User size={10} /> Recorded by {m.createdByName}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Close Ledger
          </Button>
        </div>
      </div>
    </Modal>
  );
};
