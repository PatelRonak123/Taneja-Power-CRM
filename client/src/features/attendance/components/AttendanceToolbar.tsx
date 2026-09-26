import React from 'react';
import { RotateCw, Calendar, Clock } from 'lucide-react';
import { Employee } from '../../admin/types/employee.types';
import { Button } from '../../../components/ui/Button';
import { SearchInput } from '../../../components/ui/SearchInput';

export type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

interface AttendanceToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onResetPage?: () => void;
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
  onResetPage,
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
    <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs space-y-3">
      {/* Top Controls: Date Presets & On-Duty Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto min-w-0">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Calendar size={12} /> Timeframe:
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-border overflow-x-auto no-scrollbar max-w-full w-full sm:w-auto">
            {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'] as DatePreset[]).map((preset) => {
              const label =
                preset === 'TODAY'
                  ? 'Today'
                  : preset === 'YESTERDAY'
                  ? 'Yesterday'
                  : preset === 'THIS_WEEK'
                  ? 'This Week'
                  : preset === 'THIS_MONTH'
                  ? 'This Month'
                  : 'Custom Range';

              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onDatePresetChange(preset)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer shrink-0 ${
                    datePreset === preset
                      ? 'bg-white text-slate-900 shadow-xs border border-border/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {onOpenCheckedInDrawer && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCheckedInDrawer}
            className="text-emerald-700 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100"
          >
            <span className="flex h-2 w-2 relative mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Clock size={13} className="mr-1" />
            <span>Currently On Duty ({checkedInCount})</span>
          </Button>
        )}
      </div>

      {/* Date Pickers for Custom Range or Single Date display */}
      {datePreset === 'CUSTOM' ? (
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-border w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>
      ) : datePreset === 'TODAY' || datePreset === 'YESTERDAY' ? (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="text-slate-400 font-normal">Active Date:</span>
          <input
            type="date"
            value={singleDate}
            onChange={(e) => onSingleDateChange(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-white border border-border text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
          />
        </div>
      ) : null}

      {/* Bottom Controls: Search, Employee Dropdown, Status Dropdown, Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
        {/* Search Bar */}
        <SearchInput
          placeholder="Search employee or phone..."
          value={searchQuery}
          onChange={onSearchChange}
          onResetPage={onResetPage}
          wrapperClassName="flex-1 w-full min-w-0"
          isLoading={loading}
        />

        {/* Filter Dropdowns & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Employee Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-0 sm:max-w-48">
            <select
              value={employeeFilter}
              onChange={(e) => onEmployeeFilterChange(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer truncate"
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
          <div className="relative flex-1 sm:flex-initial min-w-0">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg bg-white border border-border text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer truncate"
            >
              <option value="ALL">All Statuses</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh Attendance Feed"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>
    </div>
  );
};
