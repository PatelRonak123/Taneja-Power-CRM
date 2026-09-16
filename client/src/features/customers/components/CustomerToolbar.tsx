import React from 'react';
import { Search, RefreshCw, X, Filter } from 'lucide-react';

interface CustomerToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <form onSubmit={onSearchSubmit} className="relative flex-1 min-w-70">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition-all"
          placeholder="Search customers by name, company, phone, email, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
            onClick={onClearSearch}
          >
            <X size={14} />
          </button>
        )}
      </form>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-500">
          <Filter size={12} className="text-slate-400" />
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

        <button
          type="button"
          className="w-10 h-10 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
          onClick={onRefresh}
          title="Refresh List"
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
};

