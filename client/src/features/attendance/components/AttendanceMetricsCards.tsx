import React from 'react';
import { Users, LogIn, LogOut, UserX } from 'lucide-react';
import { AttendanceMetrics } from '../types/attendance.types';

interface AttendanceMetricsCardsProps {
  metrics: AttendanceMetrics;
  onFilterStatus?: (status: string) => void;
  activeStatusFilter?: string;
}

export const AttendanceMetricsCards: React.FC<AttendanceMetricsCardsProps> = ({
  metrics,
  onFilterStatus,
  activeStatusFilter,
}) => {
  const cards = [
    {
      id: 'total',
      label: 'Total Workforce',
      value: metrics.totalEmployees,
      subtext: 'Active personnel registered',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-200/60',
      activeBorder: 'border-blue-500 ring-2 ring-blue-100',
      filterValue: 'ALL',
    },
    {
      id: 'checked_in',
      label: 'Currently Checked In',
      value: metrics.checkedIn,
      subtext: 'On duty & active in field/office',
      icon: LogIn,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-100',
      filterValue: 'CHECKED_IN',
      indicator: 'emerald',
    },
    {
      id: 'checked_out',
      label: 'Checked Out',
      value: metrics.checkedOut,
      subtext: 'Completed daily attendance session',
      icon: LogOut,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-200/60',
      activeBorder: 'border-purple-500 ring-2 ring-purple-100',
      filterValue: 'CHECKED_OUT',
    },
    {
      id: 'not_checked_in',
      label: 'Not Checked In',
      value: metrics.notCheckedIn,
      subtext: 'Pending check-in for selected date',
      icon: UserX,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/60',
      activeBorder: 'border-amber-500 ring-2 ring-amber-100',
      filterValue: 'ALL',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isSelected = activeStatusFilter === card.filterValue && card.filterValue !== 'ALL';

        return (
          <div
            key={card.id}
            onClick={() => onFilterStatus && onFilterStatus(card.filterValue)}
            className={`flex flex-col justify-between p-5 bg-white rounded-2xl border transition-all duration-200 cursor-pointer group ${
              isSelected
                ? `${card.activeBorder} shadow-md`
                : 'border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs ${card.iconBg}`}>
                <IconComponent size={20} />
              </div>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {card.value}
                </span>
                {card.indicator && card.value > 0 && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};

