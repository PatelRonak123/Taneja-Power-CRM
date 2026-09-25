import React from 'react';
import { Zap, Cpu, Package, Activity, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/productFormatters';
import { Button } from '@/components/ui/Button';

interface ProductHeaderProps {
  totalCount?: number;
  totalUnits?: number;
  totalValuation?: number;
  activeCount?: number;
  onAddProduct: () => void;
  canCreate?: boolean;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({
  totalCount = 0,
  totalUnits = 0,
  totalValuation = 0,
  activeCount = 0,
  onAddProduct,
  canCreate = true,
}) => {
  const operationalRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Title & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Catalog Registry
            </span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            Power Equipment & Asset Catalog
          </h1>
          <p className="text-[13px] text-slate-500 font-normal leading-normal">
            Manage heavy generators, industrial inverters, energy storage units, and switchgear assets across your power grid infrastructure.
          </p>
        </div>

        {canCreate && (
          <div className="shrink-0">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Zap size={16} />}
              onClick={onAddProduct}
            >
              Deploy Asset
            </Button>
          </div>
        )}
      </div>

      {/* KPI Metrics Dashboard Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-500">Catalog Models</span>
            <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{totalCount}</span>
            <span className="text-xs text-slate-400">Total registered SKU items</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Cpu size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-500">Units in Stock</span>
            <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{totalUnits.toLocaleString()}</span>
            <span className="text-xs text-slate-400">Warehouse inventory count</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Package size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-500">Operational Rate</span>
            <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{operationalRate}%</span>
            <span className="text-xs text-emerald-600 font-medium">Active catalog ratio</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity size={18} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-500">Catalog Valuation</span>
            <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{formatCurrency(totalValuation)}</span>
            <span className="text-xs text-slate-400">Total equipment asset value</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};
