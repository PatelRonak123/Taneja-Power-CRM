import React from 'react';
import { Search, X, RotateCcw, List, LayoutGrid } from 'lucide-react';
import { getCategoryIcon } from '../../utils/categoryIcons';

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
    { label: 'All Telemetry Statuses', value: '' },
    { label: 'Operational (Active)', value: 'ACTIVE' },
    { label: 'Maintenance (Inactive)', value: 'INACTIVE' },
    { label: 'Depleted (Out of Stock)', value: 'OUT_OF_STOCK' },
  ];

  const hasActiveFilters = Boolean(searchQuery || selectedCategory || selectedStatus);

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      {/* Primary Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Field with Icon and Clear */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
          <input
            type="text"
            className="w-full h-11 pl-12 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            placeholder="Search equipment by name, model or SKU..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Selects & View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <select
              className="pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.label} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              className="pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {statuses.map((st) => (
                <option key={st.label} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => onViewModeChange('table')}
              title="Table View"
            >
              <List size={15} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => onViewModeChange('grid')}
              title="Grid View"
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Quick-Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.value;
          return (
            <button
              key={cat.label}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
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
