import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappService } from '../services/whatsappService';
import { WhatsAppStatusData } from '../types/whatsapp.types';

export const WHATSAPP_STATUS_QUERY_KEY = ['whatsapp-status'] as const;

export function useWhatsApp() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<WhatsAppStatusData>({
    queryKey: WHATSAPP_STATUS_QUERY_KEY,
    queryFn: () => whatsappService.getStatus(),
    // Fallback polling only when connecting or waiting for QR scan
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status;
      if (currentStatus === 'connecting' || currentStatus === 'qr') {
        return 2000;
      }
      return false;
    },
    staleTime: 5000,
  });

  // Subscribe to live Server-Sent Events (SSE)
  useEffect(() => {
    const unsubscribe = whatsappService.subscribeToEvents((liveData) => {
      queryClient.setQueryData(WHATSAPP_STATUS_QUERY_KEY, liveData);
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const connectMutation = useMutation({
    mutationFn: () => whatsappService.connect(),
    onMutate: () => {
      // Optimistic transition to connecting
      queryClient.setQueryData<WhatsAppStatusData>(WHATSAPP_STATUS_QUERY_KEY, (old) => ({
        status: 'connecting',
        phoneNumber: old?.phoneNumber || null,
        name: old?.name || null,
        qrCode: null,
        connectedAt: null,
        error: null,
      }));
    },
    onSuccess: (data) => {
      queryClient.setQueryData<WhatsAppStatusData>(WHATSAPP_STATUS_QUERY_KEY, (old) => ({
        status: data.status || 'connecting',
        phoneNumber: data.phoneNumber || old?.phoneNumber || null,
        name: old?.name || null,
        qrCode: old?.qrCode || null,
        connectedAt: old?.connectedAt || null,
        error: null,
      }));
    },
    onError: (err: Error) => {
      queryClient.setQueryData<WhatsAppStatusData>(WHATSAPP_STATUS_QUERY_KEY, (old) => ({
        status: 'error',
        phoneNumber: old?.phoneNumber || null,
        name: old?.name || null,
        qrCode: null,
        connectedAt: null,
        error: err.message || 'Failed to start connection',
      }));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => whatsappService.disconnect(),
    onMutate: () => {
      queryClient.setQueryData<WhatsAppStatusData>(WHATSAPP_STATUS_QUERY_KEY, () => ({
        status: 'disconnected',
        phoneNumber: null,
        name: null,
        qrCode: null,
        connectedAt: null,
        error: null,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_STATUS_QUERY_KEY });
    },
  });

  return {
    status: statusQuery.data?.status || 'disconnected',
    phoneNumber: statusQuery.data?.phoneNumber,
    name: statusQuery.data?.name,
    qrCode: statusQuery.data?.qrCode,
    connectedAt: statusQuery.data?.connectedAt,
    error: statusQuery.data?.error || (statusQuery.error as Error)?.message,
    isLoading: statusQuery.isLoading,
    isConnecting: connectMutation.isPending || statusQuery.data?.status === 'connecting',
    isDisconnecting: disconnectMutation.isPending,
    connect: () => connectMutation.mutate(),
    disconnect: () => disconnectMutation.mutate(),
    refetch: () => statusQuery.refetch(),
  };
}
