import React from 'react';
import { Button } from '@/components/ui/Button';
import { Search, X, RotateCcw, List, LayoutGrid, Filter } from 'lucide-react';
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
    <div className="catalog-controls-container">
      {/* Primary Control Bar */}
      <div className="filter-bar">
        {/* Search Field with Icon and Clear */}
        <div className="filter-search-box">
          <Search className="search-icon" size={17} />
          <input
            type="text"
            className="search-input"
            placeholder="Search equipment by name, model or SKU..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Selects & View Toggle */}
        <div className="filter-right-group">
          <div className="filter-select-wrapper">
            <Filter size={15} className="select-lead-icon" />
            <select
              className="filter-select-control"
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

          <div className="filter-select-wrapper">
            <select
              className="filter-select-control"
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
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw size={13} />}
              onClick={onReset}
              className="reset-filters-btn"
            >
              Reset
            </Button>
          )}

          {/* View Mode Toggle: Table vs Grid Cards */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'is-active' : ''}`}
              onClick={() => onViewModeChange('table')}
              title="Table View"
              aria-label="Table View"
            >
              <List size={16} />
              <span className="view-toggle-label">Table</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid Cards View"
              aria-label="Grid Cards View"
            >
              <LayoutGrid size={16} />
              <span className="view-toggle-label">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Quick-Filter Chips */}
      <div className="category-chips-bar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.value;
          return (
            <button
              key={cat.label}
              type="button"
              className={`category-chip ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onCategoryChange(cat.value)}
            >
              <span className="chip-icon">{getCategoryIcon(cat.value || 'default', 14)}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductFilters;
