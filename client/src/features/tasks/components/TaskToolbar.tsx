import React from 'react';
import { Search, RefreshCw, X, Filter } from 'lucide-react';
import { Customer } from '../../customers/types/customer.types';

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
  onSearchSubmit: (e: React.FormEvent) => void;
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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
      {/* Top Search & Actions Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input Box */}
        <form onSubmit={onSearchSubmit} className="relative flex-1 min-w-70">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition-all"
            placeholder="Search tasks by title, customer, destination, or employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-10 px-3.5 rounded-xl border border-slate-200/80 bg-slate-50 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="w-10 h-10 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Select Controls Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mr-1">
          <Filter size={12} />
          <span className="text-[11px] uppercase tracking-wider">Filters:</span>
        </div>

        {/* Status Filter */}
        <div className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Customer Filter */}
        <div className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 max-w-45">
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate pr-1"
          >
            <option value="ALL">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Filter (Management Only) */}
        {showEmployeeFilter && (
          <div className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 max-w-45">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate pr-1"
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Filter */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-8 px-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
        />
      </div>
    </div>
  );
};
