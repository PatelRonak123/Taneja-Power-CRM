import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fsrService } from '../services/fsr.service';
import {
  FsrQueryParams,
  FsrListResult,
  FsrDetailedView,
  UpdateSiteObservationPayload,
  BatteryBankPayload,
  BatteryReadingItem,
  PartPayload,
  UploadAttachmentPayload,
  CustomerSignOffPayload,
  FseSignOffPayload,
  FsrAttachment,
} from '../types/fsr.types';

export const fsrKeys = {
  all: ['fsr'] as const,
  lists: () => [...fsrKeys.all, 'list'] as const,
  list: (params?: FsrQueryParams) => [...fsrKeys.lists(), params] as const,
  details: () => [...fsrKeys.all, 'detail'] as const,
  detail: (id: string) => [...fsrKeys.details(), id] as const,
};

/**
 * Hook to query paginated FSR list
 */
export const useFsrList = (params?: FsrQueryParams) => {
  return useQuery<FsrListResult>({
    queryKey: fsrKeys.list(params),
    queryFn: () => fsrService.list(params),
  });
};

/**
 * Hook to query full FSR detail
 */
export const useFsrDetail = (id: string) => {
  return useQuery<FsrDetailedView>({
    queryKey: fsrKeys.detail(id),
    queryFn: () => fsrService.getById(id),
    enabled: Boolean(id),
  });
};

/**
 * Hook to start an FSR (DRAFT -> IN_PROGRESS)
 */
export const useStartFsr = () => {
  const queryClient = useQueryClient();

  return useMutation<FsrDetailedView, Error, string>({
    mutationFn: (id: string) => fsrService.start(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(fsrKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(id) });
    },
  });
};

/**
 * Hook to complete an FSR (IN_PROGRESS -> COMPLETED)
 */
export const useCompleteFsr = () => {
  const queryClient = useQueryClient();

  return useMutation<FsrDetailedView, Error, string>({
    mutationFn: (id: string) => fsrService.complete(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(fsrKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(id) });
    },
  });
};

/**
 * Hook to update site observation measurements
 */
export const useUpdateSiteObservation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrDetailedView,
    Error,
    { id: string; payload: UpdateSiteObservationPayload }
  >({
    mutationFn: ({ id, payload }) => fsrService.updateSiteObservation(id, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

/**
 * Hooks for Battery Banks
 */
export const useAddBatteryBank = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrDetailedView,
    Error,
    { id: string; payload: BatteryBankPayload }
  >({
    mutationFn: ({ id, payload }) => fsrService.addBatteryBank(id, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

export const useUpdateBatteryBank = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrDetailedView,
    Error,
    { id: string; bankId: string; payload: Partial<BatteryBankPayload> }
  >({
    mutationFn: ({ id, bankId, payload }) =>
      fsrService.updateBatteryBank(id, bankId, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

export const useDeleteBatteryBank = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; bankId: string }>({
    mutationFn: ({ id, bankId }) => fsrService.deleteBatteryBank(id, bankId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

/**
 * Hooks for Battery Readings
 */
export const useSaveBatteryReadings = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrDetailedView,
    Error,
    { id: string; bankId: string; readings: BatteryReadingItem[] }
  >({
    mutationFn: ({ id, bankId, readings }) =>
      fsrService.saveBatteryReadings(id, bankId, readings),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

export const useUpdateBatteryReading = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrDetailedView,
    Error,
    {
      id: string;
      bankId: string;
      readingId: string;
      payload: Partial<BatteryReadingItem>;
    }
  >({
    mutationFn: ({ id, bankId, readingId, payload }) =>
      fsrService.updateBatteryReading(id, bankId, readingId, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

export const useDeleteBatteryReading = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: string; bankId: string; readingId: string }
  >({
    mutationFn: ({ id, bankId, readingId }) =>
      fsrService.deleteBatteryReading(id, bankId, readingId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

/**
 * Hooks for Parts
 */
export const useAddPart = () => {
  const queryClient = useQueryClient();

  return useMutation<FsrDetailedView, Error, { id: string; payload: PartPayload }>({
    mutationFn: ({ id, payload }) => fsrService.addPart(id, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

export const useUpdatePart = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrDetailedView,
    Error,
    { id: string; partId: string; payload: Partial<PartPayload> }
  >({
    mutationFn: ({ id, partId, payload }) =>
      fsrService.updatePart(id, partId, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

export const useDeletePart = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; partId: string }>({
    mutationFn: ({ id, partId }) => fsrService.deletePart(id, partId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

/**
 * Hooks for Attachments
 */
export const useUploadAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrAttachment,
    Error,
    { id: string; payload: UploadAttachmentPayload }
  >({
    mutationFn: ({ id, payload }) => fsrService.uploadAttachment(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; attachmentId: string }>({
    mutationFn: ({ id, attachmentId }) =>
      fsrService.deleteAttachment(id, attachmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
    },
  });
};

/**
 * Hooks for Signatures
 */
export const useCustomerSignOff = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrDetailedView,
    Error,
    { id: string; payload: CustomerSignOffPayload }
  >({
    mutationFn: ({ id, payload }) => fsrService.customerSignOff(id, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: fsrKeys.lists() });
    },
  });
};

export const useFseSignOff = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FsrDetailedView,
    Error,
    { id: string; payload: FseSignOffPayload }
  >({
    mutationFn: ({ id, payload }) => fsrService.fseSignOff(id, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(fsrKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: fsrKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: fsrKeys.lists() });
    },
  });
};
