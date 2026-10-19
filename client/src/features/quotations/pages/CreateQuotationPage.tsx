import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationService } from '../services/quotationService';
import { QuotationForm } from '../components/QuotationForm';
import { navigate } from '../../../app/router/navigation';
import { CreateQuotationPayload } from '../types/quotation.types';
import { toast } from '../../../utils/toast';
import {
  AMC_CONVERSION_STORAGE_KEY,
  pruneOrphanedAmcConversion,
} from '../utils/amc-conversion-handoff.util';

import { amcContractApi } from '../../amc-contracts/api/amcContractApi';

export const CreateQuotationPage: React.FC = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // If arriving without conversionId, clean up any abandoned AMC conversion session data
    pruneOrphanedAmcConversion();
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: CreateQuotationPayload) => quotationService.createQuotation(data),
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });

      // Clean up pending AMC conversion session data
      sessionStorage.removeItem(AMC_CONVERSION_STORAGE_KEY);

      // Automatically link to AMC service request if created from a defect follow-up
      try {
        const pendingLink = sessionStorage.getItem('pending_repair_link');
        if (pendingLink && response.data && response.data.id) {
          const { contractId, requestId } = JSON.parse(pendingLink);
          await amcContractApi.linkQuotationToRequest(contractId, requestId, response.data.id);
          sessionStorage.removeItem('pending_repair_link');
          toast.info('Linked to Service Request', 'Repair quotation linked to AMC service request.');
        }
      } catch (linkErr) {
        console.error('Failed to link repair quotation to request:', linkErr);
      }

      toast.success('Quotation created successfully');
      if (response.data && response.data.id) {
        navigate(`/quotations/${response.data.id}`);
      } else {
        navigate('/quotations');
      }
    },
    onError: (err: any) => {
      console.error('Failed to create quotation:', err);
      toast.error('Failed to create quotation', err.response?.data?.message || err.message);
    },
  });

  const handleSubmit = async (data: CreateQuotationPayload) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Create New Quotation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Draft a commercial proposal, configure line items, define commercial terms, and submit for approval.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <QuotationForm
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
};
