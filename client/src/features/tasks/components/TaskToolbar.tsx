import React from 'react';
import { RefreshCw, X, Filter } from 'lucide-react';
import { Customer } from '../../customers/types/customer.types';
import { Button } from '../../../components/ui/Button';
import { SearchInput } from '../../../components/ui/SearchInput';

interface TaskToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  employeeFilter: string;
  setEmployeeFilter: (employeeId: string) => void;
  customerFilter: string;
  setCustomerFilter: (customerId: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  employees: { id: string; fullName: string }[];
  customers: Customer[];
  showEmployeeFilter?: boolean;
  onSearchSubmit?: (e?: React.FormEvent) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const TaskToolbar: React.FC<TaskToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  employeeFilter,
  setEmployeeFilter,
  customerFilter,
  setCustomerFilter,
  dateFilter,
  setDateFilter,
  employees,
  customers,
  showEmployeeFilter = true,
  onSearchSubmit,
  onClearFilters,
  onRefresh,
  loading,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    (showEmployeeFilter && employeeFilter !== 'ALL') ||
    customerFilter !== 'ALL' ||
    dateFilter !== '';

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex flex-col gap-3">
      {/* Top Search & Actions Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input Box */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onImmediateSearch={() => onSearchSubmit?.()}
          placeholder="Search tasks by title, customer, destination, or employee..."
          wrapperClassName="flex-1"
          isLoading={loading}
        />

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-slate-600"
            >
              <X size={13} className="mr-1" />
              <span>Reset</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Filter Select Controls Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mr-1">
          <Filter size={12} />
          <span className="text-[11px] uppercase tracking-wider">Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
        >
          <option value="ALL">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Customer Filter */}
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer max-w-48 truncate"
        >
          <option value="ALL">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Employee Filter (Management Only) */}
        {showEmployeeFilter && (
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer max-w-48 truncate"
          >
            <option value="ALL">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>
        )}

        {/* Date Filter */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
        />
      </div>
    </div>
  );
};
