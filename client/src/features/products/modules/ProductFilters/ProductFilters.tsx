import React from 'react';
import { RotateCcw, List, LayoutGrid } from 'lucide-react';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';

interface ProductFiltersProps {
  searchQuery: string;
  selectedCategory: string;
  selectedBrand: string;
  selectedStatus: string;
  selectedPriceOnRequest: string;
  viewMode: 'table' | 'grid';
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onBrandChange: (brand: string) => void;
  onStatusChange: (status: string) => void;
  onPriceOnRequestChange: (val: string) => void;
  onViewModeChange: (mode: 'table' | 'grid') => void;
  onReset: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchQuery,
  selectedCategory,
  selectedBrand,
  selectedStatus,
  selectedPriceOnRequest,
  viewMode,
  onSearchChange,
  onCategoryChange,
  onBrandChange,
  onStatusChange,
  onPriceOnRequestChange,
  onViewModeChange,
  onReset,
}) => {
  const categories = [
    { label: 'All Categories', value: '' },
    { label: 'UPS Systems', value: 'UPS' },
    { label: 'Stabilizers', value: 'STABILIZER' },
    { label: 'Batteries', value: 'BATTERY' },
    { label: 'Transformers', value: 'TRANSFORMER' },
    { label: 'Inverters', value: 'INVERTER' },
    { label: 'Generators', value: 'GENERATOR' },
    { label: 'Accessories', value: 'ACCESSORY' },
  ];

  const brands = [
    { label: 'All Brands', value: '' },
    { label: 'Taneja Power', value: 'Taneja Power' },
    { label: 'Vertiv', value: 'Vertiv' },
    { label: 'Luminous', value: 'Luminous' },
    { label: 'Hitachi', value: 'Hitachi' },
    { label: 'Eaton', value: 'Eaton' },
    { label: 'Microtek', value: 'Microtek' },
    { label: 'Exide', value: 'Exide' },
  ];

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
  ];

  const priceOnRequestOptions = [
    { label: 'All Pricing', value: '' },
    { label: 'Standard Priced', value: 'false' },
    { label: 'Price on Request', value: 'true' },
  ];

  const hasActiveFilters = Boolean(
    searchQuery || selectedCategory || selectedBrand || selectedStatus || selectedPriceOnRequest
  );

  return (
    <div className="bg-card p-3 rounded-xl border border-border shadow-xs space-y-3">
      {/* Primary Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Field with Icon and Clear */}
        <SearchInput
          placeholder="Search by name, SKU, brand, model, series..."
          value={searchQuery}
          onChange={onSearchChange}
          wrapperClassName="flex-1 min-w-70"
          inputClassName="bg-slate-50 border-slate-200"
        />

        {/* Filter Selects & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by Category"
          >
            {categories.map((cat) => (
              <option key={cat.label} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Brand Dropdown */}
          <select
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            value={selectedBrand}
            onChange={(e) => onBrandChange(e.target.value)}
            aria-label="Filter by Brand"
          >
            {brands.map((b) => (
              <option key={b.label} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by Status"
          >
            {statuses.map((st) => (
              <option key={st.label} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Price On Request Dropdown */}
          <select
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            value={selectedPriceOnRequest}
            onChange={(e) => onPriceOnRequestChange(e.target.value)}
            aria-label="Filter by Price on Request"
          >
            {priceOnRequestOptions.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<RotateCcw size={13} />}
              onClick={onReset}
            >
              Reset
            </Button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-9">
            <button
              type="button"
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => onViewModeChange('table')}
              title="Table View"
            >
              <List size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => onViewModeChange('grid')}
              title="Grid View"
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Quick-Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.value;
          return (
            <button
              key={cat.label}
              type="button"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
              onClick={() => onCategoryChange(cat.value)}
            >
              <span>{getCategoryIcon(cat.value || 'default', 13)}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductFilters;
