import React from 'react';
import { Clock, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { quotationService } from '../../quotations/services/quotationService';
import { navigate } from '../../../app/router/navigation';

interface EmployeeActivityFeedProps {
  email?: string;
}

export const EmployeeActivityFeed: React.FC<EmployeeActivityFeedProps> = () => {
  // Fetch user's recent quotations (already scoped to current user by backend)
  const { data: quotationsEnvelope, isLoading } = useQuery({
    queryKey: ['sales-dashboard-recent-activity'],
    queryFn: () => quotationService.getQuotations({ limit: 5 }),
    staleTime: 30000,
  });

  const quotations = Array.isArray(quotationsEnvelope?.data) ? quotationsEnvelope.data : [];

  const formatTimeAgo = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={18} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Recent Quotation Activity</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
          ACTIVITY
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading recent activity...</div>
      ) : quotations.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
            <FileSpreadsheet size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-500">No recent sales activity.</p>
          <p className="text-[11px] text-slate-400">
            Created quotations and proposals will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {quotations.map((q) => {
            const isApproved = q.status === 'APPROVED';
            const isPending = q.status === 'PENDING_APPROVAL';
            const isRejected = q.status === 'REJECTED';

            const dotColor = isApproved
              ? 'bg-emerald-500'
              : isPending
              ? 'bg-amber-500'
              : isRejected
              ? 'bg-rose-500'
              : 'bg-blue-500';

            return (
              <div
                key={q.id}
                className="py-3 flex items-start gap-3 hover:bg-slate-50/60 -mx-2 px-2 rounded-xl transition-colors cursor-pointer group"
                onClick={() => navigate(`/quotations/${q.id}`)}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600">
                      {q.quotationNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatTimeAgo(q.updatedAt || q.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {q.customer?.name || q.customer?.companyName || 'Unknown Customer'}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {q.status}
                    </span>
                    {q.currentRevision?.grandTotal && (
                      <span className="text-[10px] font-bold text-slate-700">
                        ₹{Number(q.currentRevision.grandTotal).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-1 shrink-0"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
