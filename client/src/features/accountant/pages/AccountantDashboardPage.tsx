import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { customerService } from '../../customers/services/customerService';
import { quotationService } from '../../quotations/services/quotationService';
import { leadsApi } from '../../leads/api/leadsApi';
import { amcContractApi } from '../../amc-contracts/api/amcContractApi';
import { productService } from '../../products/services/productService';
import { attendanceService } from '../../attendance/services/attendanceService';
import { navigate } from '../../../app/router/navigation';
import { QuotationStatusBadge } from '../../quotations/components/QuotationStatusBadge';
import { Button } from '../../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table/Table';
import {
  Building2,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  CalendarCheck,
  Eye,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

const formatINR = (val: number | string | undefined) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const AccountantDashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  // 1. Customers Query
  const {
    data: customersEnvelope,
    isLoading: loadingCustomers,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ['accountant-customers'],
    queryFn: () => customerService.getCustomers({ limit: 100 }),
    staleTime: 60000,
  });

  // 2. Deals / Pipeline Query
  const {
    data: pipelineData = [],
    isLoading: loadingPipeline,
    refetch: refetchPipeline,
  } = useQuery({
    queryKey: ['accountant-pipeline'],
    queryFn: () => leadsApi.getPipelineData(),
    staleTime: 60000,
  });

  // 3. Quotations Query
  const {
    data: quotationsEnvelope,
    isLoading: loadingQuotations,
    refetch: refetchQuotations,
  } = useQuery({
    queryKey: ['accountant-quotations'],
    queryFn: () => quotationService.getQuotations({ limit: 100 }),
    staleTime: 60000,
  });

  // 4. AMC Contracts Query
  const {
    data: amcEnvelope,
    isLoading: loadingAmc,
    refetch: refetchAmc,
  } = useQuery({
    queryKey: ['accountant-amc'],
    queryFn: () => amcContractApi.getContracts({ limit: 100 }),
    staleTime: 60000,
  });

  // 5. Inventory / Equipment Query
  const {
    data: productsEnvelope,
    isLoading: loadingProducts,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['accountant-products'],
    queryFn: () => productService.getProducts({ limit: 100 }),
    staleTime: 60000,
  });

  // 6. Own Attendance Query
  const {
    data: attendanceEnvelope,
    isLoading: loadingAttendance,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['accountant-attendance-me'],
    queryFn: () => attendanceService.getMyAttendance(),
    staleTime: 60000,
  });

  const refetchAll = () => {
    refetchCustomers();
    refetchPipeline();
    refetchQuotations();
    refetchAmc();
    refetchProducts();
    refetchAttendance();
  };

  const isGlobalLoading =
    loadingCustomers ||
    loadingPipeline ||
    loadingQuotations ||
    loadingAmc ||
    loadingProducts ||
    loadingAttendance;

  // Process Real Backend Metrics
  const customers = Array.isArray(customersEnvelope?.data) ? customersEnvelope.data : [];
  const activeCustomersCount = customers.filter((c) => c.status === 'ACTIVE').length;

  const totalDealsCount = Array.isArray(pipelineData)
    ? pipelineData.reduce(
        (sum, stage) => sum + (Array.isArray(stage.deals) ? stage.deals.length : 0),
        0
      )
    : 0;

  const totalPipelineValueRaw = Array.isArray(pipelineData)
    ? pipelineData.reduce((sum, stage) => sum + (Number(stage.totalValueRaw) || 0), 0)
    : 0;

  const quotations = Array.isArray(quotationsEnvelope?.data) ? quotationsEnvelope.data : [];
  const approvedQuotes = quotations.filter((q) => q.status === 'APPROVED');
  const pendingQuotes = quotations.filter((q) => q.status === 'PENDING_APPROVAL');

  const approvedValue = approvedQuotes.reduce(
    (sum, q) => sum + (Number(q.currentRevision?.grandTotal) || 0),
    0
  );
  const pendingValue = pendingQuotes.reduce(
    (sum, q) => sum + (Number(q.currentRevision?.grandTotal) || 0),
    0
  );

  const amcContracts = Array.isArray(amcEnvelope?.data) ? amcEnvelope.data : [];
  const activeAmcCount = amcContracts.filter(
    (c) => c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON'
  ).length;
  const expiringSoonCount = amcContracts.filter((c) => c.status === 'EXPIRING_SOON').length;
  const totalAmcValue = amcContracts.reduce(
    (sum, c) => sum + (Number(c.totalAmount) || 0),
    0
  );

  const products = Array.isArray(productsEnvelope?.data) ? productsEnvelope.data : [];
  const activeProductsCount = products.filter((p) => p.status === 'ACTIVE').length;

  const attendanceData = attendanceEnvelope?.data;
  const isCheckedInToday = attendanceData?.status === 'CHECKED_IN';

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* 1. Standard Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase">
              Accountant Office
            </span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            Commercial & Accounting Dashboard
          </h1>
          <p className="text-[13px] text-slate-500 leading-relaxed mt-0.5">
            Welcome back, {user?.fullName || 'Accountant'}. Real-time visibility into customer accounts, deals pipeline, commercial proposals, and active AMC agreements.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={refetchAll}
            disabled={isGlobalLoading}
            title="Refresh All Metrics"
          >
            <RefreshCw size={14} className={isGlobalLoading ? 'animate-spin mr-1.5' : 'mr-1.5'} />
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* 2. Core Financial & Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Approved Quotations Value */}
        <div className="p-4 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-600">
              Approved Proposals
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums">
              {formatINR(approvedValue)}
            </div>
            <p className="text-[12px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 tabular-nums">{approvedQuotes.length} approved</span>
              <span>across all sales reps</span>
            </p>
          </div>
        </div>

        {/* Pipeline Value in Negotiation */}
        <div className="p-4 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-600">
              Deals Pipeline Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums">
              {formatINR(totalPipelineValueRaw)}
            </div>
            <p className="text-[12px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-blue-600 tabular-nums">{totalDealsCount} deals</span>
              <span>in active pipeline</span>
            </p>
          </div>
        </div>

        {/* Active AMC Portfolio */}
        <div className="p-4 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-purple-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-600">
              Active AMC Portfolio
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums">
              {formatINR(totalAmcValue)}
            </div>
            <p className="text-[12px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-purple-600 tabular-nums">{activeAmcCount} active</span>
              {expiringSoonCount > 0 && (
                <span className="text-amber-600 font-semibold tabular-nums">({expiringSoonCount} expiring)</span>
              )}
            </p>
          </div>
        </div>

        {/* Registered Customers */}
        <div className="p-4 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-600">
              Customer Accounts
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums">{customers.length}</div>
            <p className="text-[12px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 tabular-nums">{activeCustomersCount} active accounts</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Secondary Metrics: Pending Quotes, Inventory & Attendance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Pending Management Approval */}
        <div className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12px] font-medium text-slate-500 truncate">
              Pending Approval Proposals
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-amber-600 tabular-nums">{pendingQuotes.length}</span>
              <span className="text-xs text-slate-500 font-medium tabular-nums">({formatINR(pendingValue)})</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
        </div>

        {/* Inventory / Equipment Lines */}
        <div className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12px] font-medium text-slate-500 truncate">
              Equipment / SKU Lines
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900 tabular-nums">{products.length}</span>
              <span className="text-xs text-emerald-600 font-medium tabular-nums">({activeProductsCount} active)</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Zap size={16} />
          </div>
        </div>

        {/* Self Attendance Status */}
        <div className="p-3.5 bg-card rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12px] font-medium text-slate-500 truncate">
              My Attendance Today
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isCheckedInToday
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {isCheckedInToday ? 'Checked In' : 'Not Checked In'}
              </span>
              <button
                type="button"
                onClick={() => navigate('/employee/attendance')}
                className="text-[12px] text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarCheck size={16} />
          </div>
        </div>
      </div>

      {/* 4. Quick Navigation Modules */}
      <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-xs">
        <h2 className="text-[14px] font-semibold text-slate-900 mb-3.5 tracking-tight flex items-center gap-2">
          <span>Accountant Authorized Modules</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="p-3 rounded-lg border border-border bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700">Customers</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/pipeline')}
            className="p-3 rounded-lg border border-border bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Layers size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700">Pipeline & Deals</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="p-3 rounded-lg border border-border bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileSpreadsheet size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-purple-700">Quotations</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/amc-contracts')}
            className="p-3 rounded-lg border border-border bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShieldCheck size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700">AMC Contracts</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className="p-3 rounded-lg border border-border bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Zap size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-amber-700">Equipment Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/employee/attendance')}
            className="p-3 rounded-lg border border-border bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <CalendarCheck size={18} />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">My Attendance</span>
          </button>
        </div>
      </div>

      {/* 5. Tables Grid: Recent Quotations & AMC Expiry Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Quotations Table (7 cols) */}
        <div className="lg:col-span-7 bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Recent Commercial Quotations</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Authoritative view of active customer proposals</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-30">Quotation #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="w-25">Status</TableHead>
                  <TableHead className="w-15 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.slice(0, 6).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-semibold text-slate-900">{q.quotationNumber}</TableCell>
                    <TableCell className="max-w-37.5 truncate">
                      {q.customer?.name || q.customer?.companyName || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                      {q.currentRevision?.grandTotal
                        ? formatINR(q.currentRevision.grandTotal)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <QuotationStatusBadge status={q.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="View Quotation Details"
                      >
                        <Eye size={14} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {quotations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                      No quotations found in system.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* AMC Contracts & Expiry (5 cols) */}
        <div className="lg:col-span-5 bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">AMC Portfolio & Expiry</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Active maintenance agreements overview</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/amc-contracts')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-27.5">Contract #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-25">End Date</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {amcContracts.slice(0, 6).map((c) => (
                  <TableRow
                    key={c.id}
                    onClick={() => navigate(`/amc-contracts/${c.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-semibold text-slate-900">{c.contractNumber}</TableCell>
                    <TableCell className="max-w-30 truncate">{c.customerName}</TableCell>
                    <TableCell className="text-slate-600 tabular-nums">
                      {c.contractEndDate ? new Date(c.contractEndDate).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                      {c.totalAmount ? formatINR(c.totalAmount) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {amcContracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400">
                      No AMC contracts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboardPage;
