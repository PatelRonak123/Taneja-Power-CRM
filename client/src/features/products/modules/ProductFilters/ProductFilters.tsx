import React from 'react';
import { Search, X, RotateCcw, List, LayoutGrid } from 'lucide-react';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { Button } from '@/components/ui/Button';

interface ProductFiltersProps {
  searchQuery: string;
  selectedCategory: string;
  selectedStatus: string;
  viewMode: 'table' | 'grid';
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onStatusChange: (status: string) => void;
  onViewModeChange: (mode: 'table' | 'grid') => void;
  onReset: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchQuery,
  selectedCategory,
  selectedStatus,
  viewMode,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onViewModeChange,
  onReset,
}) => {
  const categories = [
    { label: 'All Equipment', value: '' },
    { label: 'Generators', value: 'Generators' },
    { label: 'Inverters', value: 'Inverters' },
    { label: 'Batteries', value: 'Batteries' },
    { label: 'Switchgear', value: 'Switchgear' },
    { label: 'Solar Panels', value: 'Solar Panels' },
  ];

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
  ];

  const hasActiveFilters = Boolean(searchQuery || selectedCategory || selectedStatus);

  return (
    <div className="bg-card p-3 rounded-xl border border-border shadow-xs space-y-3">
      {/* Primary Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Field with Icon and Clear */}
        <div className="relative flex-1 min-w-70">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          <input
            type="text"
            className="w-full h-9 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
            placeholder="Search equipment by name, model or SKU..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Selects & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat.label} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {statuses.map((st) => (
              <option key={st.label} value={st.value}>
                {st.label}
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
