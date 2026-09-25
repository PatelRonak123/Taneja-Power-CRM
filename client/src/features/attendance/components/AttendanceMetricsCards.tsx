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
      iconColor: 'text-blue-600 bg-blue-50',
      filterValue: 'ALL',
    },
    {
      id: 'checked_in',
      label: 'Currently Checked In',
      value: metrics.checkedIn,
      subtext: 'On duty & active in field/office',
      icon: LogIn,
      iconColor: 'text-emerald-600 bg-emerald-50',
      filterValue: 'CHECKED_IN',
      indicator: true,
    },
    {
      id: 'checked_out',
      label: 'Checked Out',
      value: metrics.checkedOut,
      subtext: 'Completed daily shift',
      icon: LogOut,
      iconColor: 'text-purple-600 bg-purple-50',
      filterValue: 'CHECKED_OUT',
    },
    {
      id: 'not_checked_in',
      label: 'Not Checked In',
      value: metrics.notCheckedIn,
      subtext: 'Pending check-in today',
      icon: UserX,
      iconColor: 'text-amber-600 bg-amber-50',
      filterValue: 'ALL',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isSelected = activeStatusFilter === card.filterValue && card.filterValue !== 'ALL';

        return (
          <div
            key={card.id}
            onClick={() => onFilterStatus && onFilterStatus(card.filterValue)}
            className={`flex items-center justify-between p-4 bg-card rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
                : 'border-border shadow-xs hover:border-slate-300'
            }`}
          >
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[22px] font-bold text-slate-900 tabular-nums leading-none">
                  {card.value}
                </span>
                {card.indicator && card.value > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">{card.subtext}</p>
            </div>

            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.iconColor}`}>
              <IconComponent size={18} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
