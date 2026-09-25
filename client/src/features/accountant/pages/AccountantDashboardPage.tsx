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
  Receipt,
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* 1. Welcome & Role Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Receipt size={13} />
              ACCOUNTANT OFFICE
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              OFFICE WORKTYPE
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ROLE: USER
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Commercial & Accounting Dashboard
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Welcome back, <strong className="text-white">{user?.fullName || 'Accountant'}</strong>. Real-time visibility into customer accounts, deals pipeline, commercial proposals, and active AMC agreements.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={refetchAll}
            disabled={isGlobalLoading}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer shadow-sm flex items-center gap-2 text-xs font-semibold"
            title="Refresh All Metrics"
          >
            <RefreshCw size={16} className={isGlobalLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 2. Core Financial & Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Quotations Value */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Approved Proposals
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileCheck size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">
              {formatINR(approvedValue)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{approvedQuotes.length} approved</span>
              <span>across all sales reps</span>
            </p>
          </div>
        </div>

        {/* Pipeline Value in Negotiation */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Deals Pipeline Value
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">
              {formatINR(totalPipelineValueRaw)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-blue-600">{totalDealsCount} deals</span>
              <span>in active pipeline</span>
            </p>
          </div>
        </div>

        {/* Active AMC Portfolio */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active AMC Portfolio
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">
              {formatINR(totalAmcValue)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-purple-600">{activeAmcCount} active</span>
              {expiringSoonCount > 0 && (
                <span className="text-amber-600 font-semibold">({expiringSoonCount} expiring soon)</span>
              )}
            </p>
          </div>
        </div>

        {/* Registered Customers */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Customer Accounts
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">{customers.length}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{activeCustomersCount} active accounts</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Secondary Metrics: Pending Quotes, Inventory & Attendance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Management Approval */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Approval Proposals
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-amber-600">{pendingQuotes.length}</span>
              <span className="text-xs text-slate-400 font-medium">({formatINR(pendingValue)})</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>

        {/* Inventory / Equipment Lines */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Equipment / SKU Lines
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">{products.length}</span>
              <span className="text-xs text-emerald-600 font-medium">({activeProductsCount} active)</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Zap size={18} />
          </div>
        </div>

        {/* Self Attendance Status */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              My Attendance Today
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
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
                className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarCheck size={18} />
          </div>
        </div>
      </div>

      {/* 4. Quick Navigation Modules */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4 tracking-tight flex items-center gap-2">
          <span>Accountant Authorized Modules</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 size={20} />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">Customers</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/pipeline')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers size={20} />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">Pipeline & Deals</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileSpreadsheet size={20} />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-purple-700">Quotations</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/amc-contracts')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldCheck size={20} />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">AMC Contracts</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Zap size={20} />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-amber-700">Equipment Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/employee/attendance')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck size={20} />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">My Attendance</span>
          </button>
        </div>
      </div>

      {/* 5. Tables Grid: Recent Quotations & AMC Expiry Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Quotations Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Commercial Quotations</h3>
              <p className="text-xs text-slate-500 mt-0.5">Authoritative view of active customer proposals</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {quotations.slice(0, 6).map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{q.quotationNumber}</td>
                    <td className="py-3 px-4 max-w-[150px] truncate">
                      {q.customer?.name || q.customer?.companyName || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {q.currentRevision?.grandTotal
                        ? formatINR(q.currentRevision.grandTotal)
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <QuotationStatusBadge status={q.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="View Quotation Details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No quotations found in system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AMC Contracts & Expiry (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">AMC Portfolio & Expiry</h3>
              <p className="text-xs text-slate-500 mt-0.5">Active maintenance agreements overview</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/amc-contracts')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-4">Contract #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {amcContracts.slice(0, 6).map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/amc-contracts/${c.id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">{c.contractNumber}</td>
                    <td className="py-3 px-4 max-w-[120px] truncate">{c.customerName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.contractEndDate ? new Date(c.contractEndDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {c.totalAmount ? formatINR(c.totalAmount) : '—'}
                    </td>
                  </tr>
                ))}
                {amcContracts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No AMC contracts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboardPage;
