import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ProductFiltersProps {
  searchQuery: string;
  selectedCategory: string;
  selectedStatus: string;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onStatusChange: (status: string) => void;
  onReset: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchQuery,
  selectedCategory,
  selectedStatus,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onReset,
}) => {
  const categories = [
    'All Categories',
    'Generators',
    'Inverters',
    'Batteries',
    'Switchgear',
    'Solar Panels',
  ];

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Operational (Active)', value: 'ACTIVE' },
    { label: 'Maintenance (Inactive)', value: 'INACTIVE' },
    { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
  ];

  return (
    <div className="filter-bar">
      <div className="filter-search">
        <Input
          placeholder="Search by equipment name or SKU..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-selects">
        <select
          className="select-control"
          value={selectedCategory}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            onCategoryChange(e.target.value === 'All Categories' ? '' : e.target.value)
          }
        >
          {categories.map((cat) => (
            <option key={cat} value={cat === 'All Categories' ? '' : cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          className="select-control"
          value={selectedStatus}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onStatusChange(e.target.value)}
        >
          {statuses.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>

        {(searchQuery || selectedCategory || selectedStatus) && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
};
