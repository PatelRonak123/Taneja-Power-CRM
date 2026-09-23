import React from 'react';
import { Target, Layers, FileSpreadsheet, ClipboardList, ArrowRight, Loader2, ShieldCheck, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { leadsApi } from '../../leads/api/leadsApi';
import { quotationService } from '../../quotations/services/quotationService';
import { taskService } from '../../tasks/services/taskService';
import { amcContractApi } from '../../amc-contracts/api/amcContractApi';
import { fieldService } from '../../field-service/services/fieldService';

export const EmployeeMetricsGrid: React.FC = () => {
  const { user } = useAuthStore();
  const designation = (user?.designation || '').toLowerCase();
  const isSalesOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designation.includes('sales');
  const isServiceOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designation.includes('service');

  // Sales Office Queries
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['sales-dashboard-leads'],
    queryFn: () => leadsApi.getLeads(),
    enabled: isSalesOffice,
    staleTime: 30000,
  });

  const { data: pipelineData = [], isLoading: loadingPipeline } = useQuery({
    queryKey: ['sales-dashboard-pipeline'],
    queryFn: () => leadsApi.getPipelineData(),
    enabled: isSalesOffice,
    staleTime: 30000,
  });

  const { data: quotationsEnvelope, isLoading: loadingQuotations } = useQuery({
    queryKey: ['sales-dashboard-quotations'],
    queryFn: () => quotationService.getQuotations({ limit: 100 }),
    enabled: isSalesOffice,
    staleTime: 30000,
  });

  // Service Office Queries
  const { data: amcEnvelope, isLoading: loadingAmc } = useQuery({
    queryKey: ['service-dashboard-amc'],
    queryFn: () => amcContractApi.getContracts({ limit: 100 }),
    enabled: isServiceOffice,
    staleTime: 30000,
  });

  const { data: fsrEnvelope, isLoading: loadingFsr } = useQuery({
    queryKey: ['service-dashboard-fsrs'],
    queryFn: () => fieldService.getFsrs({ limit: 100 }),
    enabled: isServiceOffice,
    staleTime: 30000,
  });

  const { data: serviceQuotesEnvelope, isLoading: loadingServiceQuotes } = useQuery({
    queryKey: ['service-dashboard-service-quotes'],
    queryFn: () => quotationService.getQuotations({ limit: 100, quotationType: 'SERVICE' }),
    enabled: isServiceOffice,
    staleTime: 30000,
  });

  // Shared: My Tasks
  const { data: tasksEnvelope, isLoading: loadingTasks } = useQuery({
    queryKey: ['employee-dashboard-my-tasks'],
    queryFn: () => taskService.getMyTasks({ limit: 50 }),
    enabled: isSalesOffice || isServiceOffice,
    staleTime: 30000,
  });

  // Derived real metrics
  const activeLeadsCount = Array.isArray(leads)
    ? leads.filter((l) => l.status !== 'Lost' && l.status !== 'Completed' && l.status !== 'COMPLETED').length
    : 0;

  const dealsCount = Array.isArray(pipelineData)
    ? pipelineData.reduce((sum, stage) => sum + (Array.isArray(stage.leads) ? stage.leads.length : 0), 0)
    : 0;

  const quotations = Array.isArray(quotationsEnvelope?.data) ? quotationsEnvelope.data : [];
  const pendingQuotationsCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const draftQuotationsCount = quotations.filter((q) => q.status === 'DRAFT').length;

  const amcContracts = Array.isArray(amcEnvelope?.data) ? amcEnvelope.data : [];
  const activeAmcCount = amcContracts.filter((c) => c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON').length;

  const fsrs = Array.isArray(fsrEnvelope?.data) ? fsrEnvelope.data : [];
  const activeFsrCount = fsrs.filter((f) => f.fsr?.status !== 'CLOSED' && f.fsr?.status !== 'CANCELLED').length;

  const serviceQuotes = Array.isArray(serviceQuotesEnvelope?.data) ? serviceQuotesEnvelope.data : [];
  const serviceQuotesCount = serviceQuotes.length;

  const tasks = Array.isArray(tasksEnvelope?.data) ? tasksEnvelope.data : [];
  const pendingTasksCount = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  ).length;

  if (isServiceOffice) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active AMC Contracts Card */}
        <div
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
          onClick={() => navigate('/amc-contracts')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
              <ShieldCheck size={22} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Active AMC Contracts</span>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {loadingAmc ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  `${activeAmcCount} Contracts`
                )}
              </h4>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all"
          />
        </div>

        {/* Field Service Reports (FSR) Card */}
        <div
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
          onClick={() => navigate('/field-service')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
              <Wrench size={22} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Field Service Reports</span>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {loadingFsr ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  `${activeFsrCount} Active FSRs`
                )}
              </h4>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
          />
        </div>

        {/* Service Quotations Card */}
        <div
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
          onClick={() => navigate('/quotations')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Service Quotations</span>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {loadingServiceQuotes ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  `${serviceQuotesCount} Quotations`
                )}
              </h4>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all"
          />
        </div>

        {/* Today's Tasks Card */}
        <div
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
          onClick={() => navigate('/tasks')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
              <ClipboardList size={22} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Assigned Tasks</span>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {loadingTasks ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  `${pendingTasksCount} Pending`
                )}
              </h4>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"
          />
        </div>
      </div>
    );
  }

  if (isSalesOffice) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Leads Card */}
        <div
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
          onClick={() => navigate('/leads')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
              <Target size={22} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Active Leads</span>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {loadingLeads ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  `${activeLeadsCount} Leads`
                )}
              </h4>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
          />
        </div>

        {/* Deals in Pipeline Card */}
        <div
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
          onClick={() => navigate('/pipeline')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
              <Layers size={22} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Deals in Pipeline</span>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {loadingPipeline ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  `${dealsCount} Deals`
                )}
              </h4>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"
          />
        </div>

        {/* Pending Quotations Card */}
        <div
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
          onClick={() => navigate('/quotations')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Pending Quotations</span>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {loadingQuotations ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  <span>
                    {pendingQuotationsCount}{' '}
                    <span className="text-xs font-medium text-slate-400">
                      ({draftQuotationsCount} draft)
                    </span>
                  </span>
                )}
              </h4>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all"
          />
        </div>

        {/* Today's Tasks Card */}
        <div
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
          onClick={() => navigate('/tasks')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
              <ClipboardList size={22} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Assigned Tasks</span>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {loadingTasks ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  `${pendingTasksCount} Pending`
                )}
              </h4>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all"
          />
        </div>
      </div>
    );
  }

  // Fallback for non-sales employee profiles
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        onClick={() => navigate('/products')}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
            <Target size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Equipment Inventory</span>
            <h4 className="text-base font-bold text-slate-900">Active Catalog</h4>
          </div>
        </div>
        <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
      </div>

      <div
        className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        onClick={() => navigate('/tasks')}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Assigned Tasks</span>
            <h4 className="text-base font-bold text-slate-900">Work Orders</h4>
          </div>
        </div>
        <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
};
