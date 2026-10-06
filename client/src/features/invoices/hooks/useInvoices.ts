import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../services/invoiceService';
import type {
  ListSalesInvoicesQuery,
  CreateSalesInvoiceFromSoPayload,
  UpdateSalesInvoicePayload,
  CancelSalesInvoicePayload,
  ListVendorInvoicesQuery,
  CreateVendorInvoicePayload,
  UpdateVendorInvoicePayload,
  RejectVendorInvoicePayload,
  CancelVendorInvoicePayload,
} from '../types/invoice.types';
import { toast } from '../../../utils/toast';

// ─── Query Key Factories ─────────────────────────────────────────────────────

export const SALES_INVOICE_KEYS = {
  all: ['sales-invoices'] as const,
  lists: () => [...SALES_INVOICE_KEYS.all, 'list'] as const,
  list: (filters: ListSalesInvoicesQuery) => [...SALES_INVOICE_KEYS.lists(), filters] as const,
  details: () => [...SALES_INVOICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SALES_INVOICE_KEYS.details(), id] as const,
};

export const VENDOR_INVOICE_KEYS = {
  all: ['vendor-invoices'] as const,
  lists: () => [...VENDOR_INVOICE_KEYS.all, 'list'] as const,
  list: (filters: ListVendorInvoicesQuery) => [...VENDOR_INVOICE_KEYS.lists(), filters] as const,
  details: () => [...VENDOR_INVOICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...VENDOR_INVOICE_KEYS.details(), id] as const,
};

// ─── Sales Invoice Queries & Mutations ────────────────────────────────────────

export const useSalesInvoices = (query: ListSalesInvoicesQuery = {}) =>
  useQuery({
    queryKey: SALES_INVOICE_KEYS.list(query),
    queryFn: () => invoiceService.listSalesInvoices(query),
    staleTime: 30_000,
  });

export const useSalesInvoice = (id: string) =>
  useQuery({
    queryKey: SALES_INVOICE_KEYS.detail(id),
    queryFn: () => invoiceService.getSalesInvoiceById(id),
    enabled: !!id,
    staleTime: 15_000,
  });

export const useCreateSalesInvoiceFromSo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      salesOrderId,
      payload,
    }: {
      salesOrderId: string;
      payload?: CreateSalesInvoiceFromSoPayload;
    }) => invoiceService.createSalesInvoiceFromSo(salesOrderId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Sales Invoice created successfully');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create Sales Invoice'),
  });
};

export const useUpdateSalesInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSalesInvoicePayload }) =>
      invoiceService.updateSalesInvoice(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.detail(id) });
      toast.success('Sales Invoice updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update Sales Invoice'),
  });
};

export const useSubmitSalesInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceService.submitSalesInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.detail(id) });
      toast.success('Sales Invoice submitted for issue');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to submit Sales Invoice'),
  });
};

export const useIssueSalesInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceService.issueSalesInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.detail(id) });
      toast.success('Sales Invoice officially issued');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to issue Sales Invoice'),
  });
};

export const useCancelSalesInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelSalesInvoicePayload }) =>
      invoiceService.cancelSalesInvoice(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: SALES_INVOICE_KEYS.detail(id) });
      toast.success('Sales Invoice cancelled');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to cancel Sales Invoice'),
  });
};

// ─── Vendor Invoice Queries & Mutations ───────────────────────────────────────

export const useVendorInvoices = (query: ListVendorInvoicesQuery = {}) =>
  useQuery({
    queryKey: VENDOR_INVOICE_KEYS.list(query),
    queryFn: () => invoiceService.listVendorInvoices(query),
    staleTime: 30_000,
  });

export const useVendorInvoice = (id: string) =>
  useQuery({
    queryKey: VENDOR_INVOICE_KEYS.detail(id),
    queryFn: () => invoiceService.getVendorInvoiceById(id),
    enabled: !!id,
    staleTime: 15_000,
  });

export const useCreateVendorInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVendorInvoicePayload) =>
      invoiceService.createVendorInvoice(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.lists() });
      toast.success('Vendor Invoice recorded successfully');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create Vendor Invoice'),
  });
};

export const useUpdateVendorInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVendorInvoicePayload }) =>
      invoiceService.updateVendorInvoice(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.detail(id) });
      toast.success('Vendor Invoice updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update Vendor Invoice'),
  });
};

export const useSubmitVendorInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceService.submitVendorInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.detail(id) });
      toast.success('Vendor Invoice submitted for verification');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to submit Vendor Invoice'),
  });
};

export const useVerifyVendorInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceService.verifyVendorInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.detail(id) });
      toast.success('Vendor Invoice verified');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to verify Vendor Invoice'),
  });
};

export const usePostVendorInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceService.postVendorInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.detail(id) });
      toast.success('Vendor Invoice posted to accounting');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to post Vendor Invoice'),
  });
};

export const useRejectVendorInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectVendorInvoicePayload }) =>
      invoiceService.rejectVendorInvoice(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.detail(id) });
      toast.success('Vendor Invoice rejected');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to reject Vendor Invoice'),
  });
};

export const useCancelVendorInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelVendorInvoicePayload }) =>
      invoiceService.cancelVendorInvoice(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: VENDOR_INVOICE_KEYS.detail(id) });
      toast.success('Vendor Invoice cancelled');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to cancel Vendor Invoice'),
  });
};

// ─── Payment & Receivables Hooks ──────────────────────────────────────────────

export const PAYMENT_KEYS = {
  all: ['payments'] as const,
  list: (query: any) => [...PAYMENT_KEYS.all, 'list', query] as const,
  receivables: () => [...PAYMENT_KEYS.all, 'receivables'] as const,
};

export const usePayments = (query: any = {}) =>
  useQuery({
    queryKey: PAYMENT_KEYS.list(query),
    queryFn: () => invoiceService.listPayments(query),
    staleTime: 15_000,
  });

export const useReceivablesSummary = () =>
  useQuery({
    queryKey: PAYMENT_KEYS.receivables(),
    queryFn: () => invoiceService.getReceivablesSummary(),
    staleTime: 15_000,
  });

