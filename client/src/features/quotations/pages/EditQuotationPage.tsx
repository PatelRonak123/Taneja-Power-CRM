import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationService } from '../services/quotationService';
import { QuotationForm } from '../components/QuotationForm';
import { useCurrentPath, navigate } from '../../../app/router/navigation';
import { CreateQuotationPayload } from '../types/quotation.types';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export const EditQuotationPage: React.FC = () => {
  const currentPath = useCurrentPath();
  const queryClient = useQueryClient();

  // Extract ID from /quotations/:id/edit
  const match = currentPath.match(/^\/quotations\/([^/]+)\/edit$/);
  const quotationId = match ? match[1] : null;

  const { data: quotationRes, isLoading, error } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => quotationService.getQuotationById(quotationId!),
    enabled: !!quotationId,
  });

  const quotation = quotationRes?.data;

  const updateMutation = useMutation({
    mutationFn: (data: CreateQuotationPayload) => quotationService.updateQuotation(quotationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      navigate(`/quotations/${quotationId}`);
    },
    onError: (err: any) => {
      console.error('Failed to update quotation:', err);
      alert(err.response?.data?.message || err.message || 'Failed to update quotation');
    },
  });

  if (!quotationId) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
        <p className="text-red-600 font-medium">Invalid quotation identifier in URL.</p>
        <button
          onClick={() => navigate('/quotations')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          Return to Quotations
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-gray-200">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-gray-500 font-medium text-sm">Loading quotation details for editing...</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-red-200">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900">Failed to load quotation</h3>
        <p className="text-gray-500 text-sm mt-1">{(error as any)?.message || 'Quotation not found or inaccessible.'}</p>
        <button
          onClick={() => navigate('/quotations')}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          Back to List
        </button>
      </div>
    );
  }

  if (quotation.status !== 'DRAFT') {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-amber-200">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900">Editing Not Allowed</h3>
        <p className="text-gray-500 text-sm mt-1">
          Quotations in <strong>{quotation.status.replace('_', ' ')}</strong> status cannot be edited directly.
        </p>
        <button
          onClick={() => navigate(`/quotations/${quotationId}`)}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          View Quotation Details
        </button>
      </div>
    );
  }

  const handleSubmit = async (payload: CreateQuotationPayload) => {
    await updateMutation.mutateAsync(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <button
            onClick={() => navigate(`/quotations/${quotationId}`)}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Quotation {quotation.quotationNumber}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Quotation — {quotation.quotationNumber} (Rev {quotation.currentRevisionNumber})
          </h1>
        </div>
      </div>



      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <QuotationForm
          initialData={quotation}
          isEditing={true}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
        />
      </div>
    </div>
  );
};
