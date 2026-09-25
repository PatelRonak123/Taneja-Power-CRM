import React from 'react';
import { QuotationStatus } from '../types/quotation.types';
import { StatusPill, StatusPillVariant } from '../../../components/ui/StatusPill';
import { Clock, CheckCircle2, XCircle, FileEdit, Send, PhoneCall, Check, UserX, AlertCircle } from 'lucide-react';

interface Props {
  status: QuotationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const QuotationStatusBadge: React.FC<Props> = ({ status, size = 'md', showIcon = true }) => {
  const getBadgeConfig = (): {
    label: string;
    variant: StatusPillVariant;
    icon: React.ReactNode;
    pulse?: boolean;
  } => {
    const iconSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          variant: 'neutral',
          icon: <FileEdit size={iconSize} />,
        };
      case 'PENDING_APPROVAL':
        return {
          label: 'Pending Approval',
          variant: 'warning',
          icon: <Clock size={iconSize} />,
          pulse: true,
        };
      case 'APPROVED':
        return {
          label: 'Approved',
          variant: 'success',
          icon: <CheckCircle2 size={iconSize} />,
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          variant: 'danger',
          icon: <XCircle size={iconSize} />,
        };
      case 'SENT':
        return {
          label: 'Sent to Client',
          variant: 'info',
          icon: <Send size={iconSize} />,
        };
      case 'FOLLOW_UP':
        return {
          label: 'Follow-up',
          variant: 'purple',
          icon: <PhoneCall size={iconSize} />,
        };
      case 'ACCEPTED':
        return {
          label: 'Accepted',
          variant: 'success',
          icon: <Check size={iconSize} />,
        };
      case 'REJECTED_BY_CUSTOMER':
        return {
          label: 'Rejected by Client',
          variant: 'neutral',
          icon: <UserX size={iconSize} />,
        };
      case 'EXPIRED':
        return {
          label: 'Expired',
          variant: 'danger',
          icon: <AlertCircle size={iconSize} />,
        };
      default:
        return {
          label: status,
          variant: 'neutral',
          icon: <FileEdit size={iconSize} />,
        };
    }
  };

  const config = getBadgeConfig();
  const pillSize = size === 'lg' ? 'md' : size === 'sm' ? 'xs' : 'sm';

  return (
    <StatusPill
      variant={config.variant}
      size={pillSize}
      icon={showIcon ? config.icon : undefined}
      dot={!showIcon}
      dotPulse={config.pulse}
    >
      {config.label}
    </StatusPill>
  );
};
