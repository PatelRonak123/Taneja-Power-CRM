import React from 'react';
import { Button } from '@/components/ui/Button';
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
    <div className="catalog-hero-header">
      {/* Top Title & Primary Action */}
      <div className="module-header">
        <div className="module-header-info">
          <div className="catalog-badge-group">
            <span className="catalog-status-pill">
              <span className="live-dot" /> GRID ASSET REGISTRY
            </span>
            <span className="catalog-sub-badge">TELEMETRY SYNC</span>
          </div>
          <h1 className="module-title">Power Equipment & Asset Catalog</h1>
          <p className="module-subtitle">
            Manage heavy generators, industrial inverters, energy storage units, and switchgear assets across your power grid infrastructure.
          </p>
        </div>

        <div className="module-header-actions">
          <Button
            onClick={onAddProduct}
            size="md"
            variant="primary"
            leftIcon={<Zap size={16} />}
            className="deploy-asset-btn"
          >
            Deploy New Asset
          </Button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Bar */}
      <div className="catalog-kpi-bar">
        <div className="kpi-card">
          <div className="kpi-icon-wrap amber">
            <Cpu size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{totalCount}</span>
            <span className="kpi-label">Catalog Models</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap blue">
            <Package size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{totalUnits.toLocaleString()}</span>
            <span className="kpi-label">Total Units in Stock</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap green">
            <Activity size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{operationalRate}%</span>
            <span className="kpi-label">Grid Operational Rate</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap purple">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{formatCurrency(totalValuation)}</span>
            <span className="kpi-label">Catalog Valuation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductHeader;
