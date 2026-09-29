import React, { useState } from 'react';
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  Calendar,
  Plus,
  ArrowRight,
  ChevronRight,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { FollowUpItem } from '../types/follow-up.types';
import { useFollowUps, useFollowUpMetrics } from '../hooks/useFollowUps';
import { FollowUpTypeBadge } from './FollowUpTypeBadge';
import { FollowUpModal } from './FollowUpModal';
import { FollowUpDetailModal } from './FollowUpDetailModal';
import { CompleteFollowUpModal } from './CompleteFollowUpModal';
import { RescheduleFollowUpModal } from './RescheduleFollowUpModal';
import { Button } from '../../../components/ui/Button';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';

export const FollowUpDashboardWidget: React.FC = () => {
  const { user } = useAuthStore();
  const isAccountantOffice =
    user?.role === 'USER' && user?.designation === 'Accountant Office';

  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming'>('today');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpItem | null>(null);
  const [followUpToComplete, setFollowUpToComplete] = useState<FollowUpItem | null>(null);
  const [followUpToReschedule, setFollowUpToReschedule] = useState<FollowUpItem | null>(null);

  const { data: metricsRes, isLoading: loadingMetrics } = useFollowUpMetrics();
  const metrics = metricsRes?.data;

  const { data: listRes, isLoading: loadingList } = useFollowUps({
    tab: activeTab,
    limit: 6,
  });

  const items = listRes?.data || [];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Widget Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              CRM Follow-ups & Reminders
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled customer interactions and pending action items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isAccountantOffice && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs h-8 px-2.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Schedule
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/follow-ups')}
            className="text-xs h-8 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            View All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50/30 text-center divide-x divide-slate-100">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`py-3 px-2 transition-all cursor-pointer ${
            activeTab === 'today' ? 'bg-blue-50/60 font-bold text-blue-900' : 'hover:bg-slate-50'
          }`}
        >
          <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Today
          </span>
          <span className="text-lg font-black text-slate-900">
            {loadingMetrics ? '—' : metrics?.today ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`py-3 px-2 transition-all cursor-pointer ${
            activeTab === 'overdue' ? 'bg-rose-50/60 font-bold text-rose-900' : 'hover:bg-slate-50'
          }`}
        >
          <span className="block text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center justify-center gap-1">
            Overdue
          </span>
          <span className="text-lg font-black text-rose-600">
            {loadingMetrics ? '—' : metrics?.overdue ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`py-3 px-2 transition-all cursor-pointer ${
            activeTab === 'upcoming' ? 'bg-indigo-50/60 font-bold text-indigo-900' : 'hover:bg-slate-50'
          }`}
        >
          <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Upcoming
          </span>
          <span className="text-lg font-black text-slate-900">
            {loadingMetrics ? '—' : metrics?.upcoming ?? 0}
          </span>
        </button>

        <div className="py-3 px-2">
          <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Completed Today
          </span>
          <span className="text-lg font-black text-emerald-600">
            {loadingMetrics ? '—' : metrics?.completedToday ?? 0}
          </span>
        </div>
      </div>

      {/* Follow-up Items List */}
      <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto space-y-2.5">
        {loadingList ? (
          <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-blue-600" />
            Loading follow-ups...
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-slate-500 my-auto">
            {activeTab === 'overdue' ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No overdue follow-ups!</p>
                <p className="text-xs text-slate-400 mt-0.5">Great job, your schedule is up to date.</p>
              </>
            ) : activeTab === 'today' ? (
              <>
                <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No follow-ups scheduled for today</p>
                <p className="text-xs text-slate-400 mt-0.5">Check upcoming items or plan a new call.</p>
              </>
            ) : (
              <>
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No upcoming follow-ups</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const isItemOverdue = item.scheduledDate < today && item.status === 'PENDING';
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all hover:border-slate-300 bg-white flex items-center justify-between gap-3 ${
                    isItemOverdue ? 'border-rose-200 bg-rose-50/20' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FollowUpTypeBadge type={item.type} showIconOnly />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => setSelectedFollowUp(item)}
                          className="font-bold text-slate-900 text-xs sm:text-sm hover:text-blue-600 cursor-pointer truncate"
                        >
                          {item.title}
                        </span>
                        {isItemOverdue && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            OVERDUE
                          </span>
                        )}
                      </div>

                      {/* Related entity pill */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                        {item.customer && (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <Building2 className="w-3 h-3 text-blue-500" />
                            {item.customer.name}
                          </span>
                        )}
                        {item.quotation && (
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <FileSpreadsheet className="w-3 h-3" />
                            {item.quotation.quotationNumber}
                          </span>
                        )}
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 font-mono">
                          {item.scheduledTime || 'All Day'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isAccountantOffice && item.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setFollowUpToReschedule(item)}
                          title="Reschedule"
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setFollowUpToComplete(item)}
                          title="Complete"
                          className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        >
                          Done
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedFollowUp(item)}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <FollowUpModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <FollowUpDetailModal
        isOpen={!!selectedFollowUp}
        followUp={selectedFollowUp}
        onClose={() => setSelectedFollowUp(null)}
        onOpenComplete={(item) => setFollowUpToComplete(item)}
        onOpenReschedule={(item) => setFollowUpToReschedule(item)}
      />

      <CompleteFollowUpModal
        isOpen={!!followUpToComplete}
        followUp={followUpToComplete}
        onClose={() => setFollowUpToComplete(null)}
      />

      <RescheduleFollowUpModal
        isOpen={!!followUpToReschedule}
        followUp={followUpToReschedule}
        onClose={() => setFollowUpToReschedule(null)}
      />
    </div>
  );
};
