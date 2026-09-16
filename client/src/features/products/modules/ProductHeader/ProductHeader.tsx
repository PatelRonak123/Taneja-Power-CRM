import React from 'react';
import { Zap, Cpu, Package, Activity, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/productFormatters';

interface ProductHeaderProps {
  totalCount?: number;
  totalUnits?: number;
  totalValuation?: number;
  activeCount?: number;
  onAddProduct: () => void;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({
  totalCount = 0,
  totalUnits = 0,
  totalValuation = 0,
  activeCount = 0,
  onAddProduct,
}) => {
  const operationalRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Title & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" /> GRID ASSET REGISTRY
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              TELEMETRY SYNC
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Power Equipment & Asset Catalog</h1>
          <p className="text-sm text-slate-500">
            Manage heavy generators, industrial inverters, energy storage units, and switchgear assets across your power grid infrastructure.
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={onAddProduct}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer"
          >
            <Zap size={16} />
            <span>Deploy New Asset</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Cpu size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalCount}</div>
            <div className="text-xs font-semibold text-slate-500">Catalog Models</div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalUnits.toLocaleString()}</div>
            <div className="text-xs font-semibold text-slate-500">Total Units in Stock</div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{operationalRate}%</div>
            <div className="text-xs font-semibold text-slate-500">Grid Operational Rate</div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(totalValuation)}</div>
            <div className="text-xs font-semibold text-slate-500">Catalog Valuation</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductHeader;
