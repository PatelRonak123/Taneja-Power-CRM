import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  Clock,
  CheckCircle2,
  ChevronRight,
  User,
  Calendar,
} from 'lucide-react';
import { FollowUpItem } from '../types/follow-up.types';
import { useFollowUps } from '../hooks/useFollowUps';
import { FollowUpStatusBadge } from './FollowUpStatusBadge';
import { FollowUpPriorityBadge } from './FollowUpPriorityBadge';
import { FollowUpTypeBadge } from './FollowUpTypeBadge';
import { FollowUpModal } from './FollowUpModal';
import { FollowUpDetailModal } from './FollowUpDetailModal';
import { CompleteFollowUpModal } from './CompleteFollowUpModal';
import { RescheduleFollowUpModal } from './RescheduleFollowUpModal';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../stores/authStore';

interface FollowUpEntitySectionProps {
  customerId?: string;
  customerName?: string;
  leadId?: string;
  leadCode?: string;
  dealId?: string;
  dealTitle?: string;
  quotationId?: string;
  quotationNumber?: string;
  amcContractId?: string;
  amcContractNumber?: string;
  defaultTitle?: string;
  defaultType?: string;
}

export const FollowUpEntitySection: React.FC<FollowUpEntitySectionProps> = ({
  customerId,
  customerName,
  leadId,
  leadCode,
  dealId,
  dealTitle,
  quotationId,
  quotationNumber,
  amcContractId,
  amcContractNumber,
}) => {
  const { user } = useAuthStore();
  const isAccountantOffice =
    user?.role === 'USER' && user?.designation === 'Accountant Office';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpItem | null>(null);
  const [followUpToComplete, setFollowUpToComplete] = useState<FollowUpItem | null>(null);
  const [followUpToReschedule, setFollowUpToReschedule] = useState<FollowUpItem | null>(null);

  const { data, isLoading } = useFollowUps(
    {
      customerId,
      leadId,
      dealId,
      quotationId,
      amcContractId,
      limit: 50,
    },
    Boolean(customerId || leadId || dealId || quotationId || amcContractId)
  );

  const followUps = data?.data || [];
  const pending = followUps.filter((f) => f.status === 'PENDING');
  const completed = followUps.filter((f) => f.status === 'COMPLETED');


  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const overdue = pending.filter((f) => f.scheduledDate < today);

  return (
    <div className="space-y-4">
      {/* Header with Stats & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">CRM Follow-ups</h3>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">
              {followUps.length} total
            </span>
            {overdue.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 font-semibold text-rose-700">
                {overdue.length} overdue
              </span>
            )}
          </div>
        </div>

        {!isAccountantOffice && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Follow-up
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2 bg-slate-50 rounded-xl border border-slate-200">
          <Clock className="w-4 h-4 animate-spin text-blue-600" />
          Loading follow-up timeline...
        </div>
      ) : followUps.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
          <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No follow-ups recorded</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Keep track of client meetings, phone calls, renewal discussions, and next steps for this record.
          </p>
          {!isAccountantOffice && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Schedule First Follow-up
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Section */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Scheduled Follow-ups ({pending.length})
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {pending.map((fu) => {
                  const isItemOverdue = fu.scheduledDate < today;
                  return (
                    <div
                      key={fu.id}
                      className={`p-3.5 rounded-xl border transition-all bg-white hover:shadow-xs flex items-center justify-between gap-4 ${
                        isItemOverdue ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <FollowUpTypeBadge type={fu.type} showIconOnly />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer" onClick={() => setSelectedFollowUp(fu)}>
                              {fu.title}
                            </span>
                            <FollowUpStatusBadge status={fu.status} scheduledDate={fu.scheduledDate} />
                            <FollowUpPriorityBadge priority={fu.priority} />
                          </div>
                          {fu.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{fu.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              {new Date(fu.scheduledDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {fu.scheduledTime ? ` at ${fu.scheduledTime}` : ''}
                            </span>
                            {fu.assignedEmployee && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {fu.assignedEmployee.fullName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isAccountantOffice && (
                          <>
                            <button
                              type="button"
                              onClick={() => setFollowUpToReschedule(fu)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => setFollowUpToComplete(fu)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Complete
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedFollowUp(fu)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed History Section */}
          {completed.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Interaction History & Completed Follow-ups ({completed.length})
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {completed.map((fu) => (
                  <div
                    key={fu.id}
                    onClick={() => setSelectedFollowUp(fu)}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{fu.title}</span>
                          <FollowUpStatusBadge status={fu.status} />
                          <FollowUpTypeBadge type={fu.type} />
                        </div>
                        {fu.outcome && (
                          <p className="text-xs text-slate-700 mt-1 line-clamp-2 bg-white/80 p-2 rounded-lg border border-slate-100">
                            <span className="font-semibold text-emerald-800">Outcome:</span> {fu.outcome}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          {fu.completedAt && (
                            <span>
                              Completed on{' '}
                              {new Date(fu.completedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {fu.completer && <span>By: {fu.completer.fullName}</span>}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <FollowUpModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialEntity={{
          customerId,
          customerName,
          leadId,
          leadCode,
          dealId,
          dealTitle,
          quotationId,
          quotationNumber,
          amcContractId,
          amcContractNumber,
        }}
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
