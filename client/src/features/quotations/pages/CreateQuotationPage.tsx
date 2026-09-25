import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationService } from '../services/quotationService';
import { QuotationForm } from '../components/QuotationForm';
import { navigate } from '../../../app/router/navigation';
import { CreateQuotationPayload } from '../types/quotation.types';
import { toast } from '../../../utils/toast';

export const CreateQuotationPage: React.FC = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateQuotationPayload) => quotationService.createQuotation(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
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
