import React from 'react';
import { X, Clock, Radio, MapPin, User } from 'lucide-react';
import { AttendanceItem } from '../types/attendance.types';

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
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Currently On Duty</h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {items.length} personnel checked in today
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* List of checked in employees */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skel-${index}`}
                className="p-4 rounded-2xl border border-slate-100 animate-pulse space-y-2 bg-slate-50"
              >
                <div className="h-4 bg-slate-200 rounded-sm w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded-sm w-1/2"></div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <User size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Personnel Currently Checked In</h4>
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
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {item.employee?.fullName?.substring(0, 2).toUpperCase() || 'EM'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {item.employee?.fullName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.employee?.designation || 'Field Engineer'}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <Radio size={8} className="animate-pulse" /> On Duty
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span className="font-semibold">In: {formatTime(item.checkInAt)}</span>
                    </div>
                    <span className="font-bold text-emerald-600 text-[11px]">
                      {calculateElapsed(item.checkInAt)}
                    </span>
                  </div>

                  {checkInCoords && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                      <MapPin size={12} className="text-blue-500 shrink-0" />
                      <span>{checkInCoords}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
