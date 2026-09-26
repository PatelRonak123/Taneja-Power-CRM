import React from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SearchInput } from '../../../components/ui/SearchInput';

interface CustomerToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  onSearchSubmit?: (e?: React.FormEvent) => void;
  onClearSearch?: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const CustomerToolbar: React.FC<CustomerToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onSearchSubmit,
  onClearSearch,
  onRefresh,
  loading,
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <SearchInput
        placeholder="Search customers by name, company, phone, email, or city..."
        value={searchQuery}
        onChange={setSearchQuery}
        onImmediateSearch={(val) => {
          if (!val) {
            onClearSearch?.();
          } else {
            onSearchSubmit?.();
          }
        }}
        wrapperClassName="flex-1 min-w-70"
        isLoading={loading}
      />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
          <Filter size={13} className="text-slate-400" />
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="INACTIVE">Inactive Accounts</option>
          </select>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh List"
          className="px-3"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>
    </div>
  );
};
