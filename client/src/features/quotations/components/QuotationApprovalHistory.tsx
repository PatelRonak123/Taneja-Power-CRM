import React from 'react';
import { QuotationApproval } from '../types/quotation.types';
import { CheckCircle2, XCircle, Send, RotateCcw, Clock } from 'lucide-react';

interface Props {
  approvals: QuotationApproval[];
}

export const QuotationApprovalHistory: React.FC<Props> = ({ approvals }) => {
  if (!approvals || approvals.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
        No approval workflow events recorded yet.
      </div>
    );
  }

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'SUBMITTED':
        return {
          label: 'Submitted for Approval',
          icon: Send,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
        };
      case 'APPROVED':
        return {
          label: 'Approved by Management',
          icon: CheckCircle2,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        };
      case 'REJECTED':
        return {
          label: 'Rejected by Management',
          icon: XCircle,
          color: 'text-rose-600 bg-rose-50 border-rose-200',
        };
      case 'WITHDRAWN':
        return {
          label: 'Submission Withdrawn',
          icon: RotateCcw,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
        };
      default:
        return {
          label: action,
          icon: Clock,
          color: 'text-slate-600 bg-slate-50 border-slate-200',
        };
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {approvals.map((app) => {
        const config = getActionConfig(app.action);
        const Icon = config.icon;

        return (
          <div
            key={app.id}
            className="flex items-start gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs"
          >
            <div className={`p-2 rounded-lg border ${config.color} shrink-0 mt-0.5`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900">{config.label}</span>
                <span className="text-[11px] text-slate-400">
                  {new Date(app.actionAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 mt-1">
                {app.reviewedBy ? (
                  <span>
                    Reviewed by: <strong>{app.reviewedBy.fullName}</strong> ({app.reviewedBy.email})
                  </span>
                ) : app.requestedBy ? (
                  <span>
                    Requested by: <strong>{app.requestedBy.fullName}</strong>
                  </span>
                ) : null}
              </div>

              {app.comments && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-700 italic">
                  "{app.comments}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
