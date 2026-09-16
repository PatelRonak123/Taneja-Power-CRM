import React from 'react';
import { Search, RotateCw, Calendar, Users, Filter, Clock } from 'lucide-react';
import { Employee } from '../../admin/types/employee.types';

export type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

interface AttendanceToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  employeeFilter: string;
  onEmployeeFilterChange: (employeeId: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  singleDate: string;
  onSingleDateChange: (date: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  employeesList: Employee[];
  onRefresh: () => void;
  loading: boolean;
  onOpenCheckedInDrawer?: () => void;
  checkedInCount?: number;
}

export const AttendanceToolbar: React.FC<AttendanceToolbarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  employeeFilter,
  onEmployeeFilterChange,
  datePreset,
  onDatePresetChange,
  singleDate,
  onSingleDateChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  employeesList,
  onRefresh,
  loading,
  onOpenCheckedInDrawer,
  checkedInCount = 0,
}) => {
  return (
    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs mb-6 space-y-3.5">
      {/* Top Controls: Date Presets & On-Duty Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 flex items-center gap-1">
            <Calendar size={12} /> Timeframe:
          </span>

          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => onDatePresetChange('TODAY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'TODAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => onDatePresetChange('YESTERDAY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'YESTERDAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Yesterday
            </button>

            <button
              type="button"
              onClick={() => onDatePresetChange('THIS_WEEK')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'THIS_WEEK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              This Week
            </button>

            <button
              type="button"
              onClick={() => onDatePresetChange('THIS_MONTH')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'THIS_MONTH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              This Month
            </button>

            <button
              type="button"
              onClick={() => onDatePresetChange('CUSTOM')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {onOpenCheckedInDrawer && (
          <button
            type="button"
            onClick={onOpenCheckedInDrawer}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Clock size={13} />
            <span>Currently On Duty ({checkedInCount})</span>
          </button>
        )}
      </div>

      {/* Date Pickers for Custom Range or Single Date display */}
      {datePreset === 'CUSTOM' ? (
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      ) : datePreset === 'TODAY' || datePreset === 'YESTERDAY' ? (
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span className="text-slate-400 font-normal">Active Date:</span>
          <input
            type="date"
            value={singleDate}
            onChange={(e) => onSingleDateChange(e.target.value)}
            className="h-7 px-2.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
          />
        </div>
      ) : null}

      {/* Bottom Controls: Search, Employee Dropdown, Status Dropdown, Refresh */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-60">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by employee name, email, phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Filter Dropdowns & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Employee Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-500 max-w-45">
            <Users size={12} className="text-slate-400" />
            <select
              value={employeeFilter}
              onChange={(e) => onEmployeeFilterChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full truncate pr-1"
            >
              <option value="ALL">All Employees</option>
              {employeesList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-500">
            <Filter size={12} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Statuses</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh Attendance Feed"
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RotateCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};

