import React from 'react';
import { Clock, Radio, MapPin, User } from 'lucide-react';
import { AttendanceItem } from '../types/attendance.types';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';

interface CurrentlyCheckedInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: AttendanceItem[];
  loading: boolean;
  onSelectRecord: (record: AttendanceItem) => void;
}

export const CurrentlyCheckedInDrawer: React.FC<CurrentlyCheckedInDrawerProps> = ({
  isOpen,
  onClose,
  items,
  loading,
  onSelectRecord,
}) => {
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const calculateElapsed = (checkInAt: string) => {
    const diffMs = Date.now() - new Date(checkInAt).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m on duty`;
  };

  const headerTitle = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
        <Clock size={16} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold text-slate-900">Currently On Duty</h2>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <p className="text-[12px] text-slate-500">
          {items.length} personnel checked in today
        </p>
      </div>
    </div>
  );

  const footerActions = (
    <Button
      variant="outline"
      size="md"
      onClick={onClose}
    >
      Close Panel
    </Button>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={headerTitle}
      maxWidth="sm"
      footer={footerActions}
    >
      {/* List of checked in employees */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skel-${index}`}
              className="p-3.5 rounded-lg border border-border animate-pulse space-y-2 bg-slate-50"
            >
              <div className="h-4 bg-slate-200 rounded-sm w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded-sm w-1/2"></div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <User size={20} />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Personnel Currently Checked In</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              All staff members have either checked out or are yet to initiate attendance today.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const checkInCoords =
              item.checkInLatitude && item.checkInLongitude
                ? `${Number(item.checkInLatitude).toFixed(4)}, ${Number(item.checkInLongitude).toFixed(4)}`
                : null;

            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectRecord(item);
                  onClose();
                }}
                className="p-3.5 rounded-lg border border-border bg-card hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.employee?.fullName?.substring(0, 2).toUpperCase() || 'EM'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {item.employee?.fullName}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {item.employee?.designation || 'Field Engineer'}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <Radio size={8} className="animate-pulse" /> On Duty
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-[11px] font-medium tabular-nums">In: {formatTime(item.checkInAt)}</span>
                  </div>
                  <span className="font-semibold text-emerald-600 text-[11px] tabular-nums">
                    {calculateElapsed(item.checkInAt)}
                  </span>
                </div>

                {checkInCoords && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <MapPin size={11} className="text-blue-500 shrink-0" />
                    <span>{checkInCoords}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Drawer>
  );
};
