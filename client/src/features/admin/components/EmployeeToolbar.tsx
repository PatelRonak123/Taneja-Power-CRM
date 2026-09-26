import React from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SearchInput } from '../../../components/ui/SearchInput';

interface EmployeeToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  workTypeFilter: string;
  setWorkTypeFilter: (workType: string) => void;
  onSearchSubmit?: (e?: React.FormEvent) => void;
  onClearSearch?: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const EmployeeToolbar: React.FC<EmployeeToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  workTypeFilter,
  setWorkTypeFilter,
  onSearchSubmit,
  onClearSearch,
  onRefresh,
  loading,
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Box */}
      <SearchInput
        placeholder="Search employees by name, email, or phone..."
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

      {/* Filter and Refresh Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Work Type Filter */}
        <div className="flex items-center gap-1.5 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
          <Filter size={13} className="text-slate-400" />
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Type:</span>
          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">All Types</option>
            <option value="OFFICE">Office</option>
            <option value="FIELD">Field</option>
          </select>
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-1.5 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="USER">USER</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
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
