import React, { useState, useEffect, useCallback } from 'react';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import {
  ShieldCheck,
  Building2,
  Users,
  ClipboardList,
  MessageSquare,
  Zap,
  Radio,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  UserCheck,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { StatusPill } from '../../../components/ui/StatusPill';
import { Button } from '../../../components/ui/Button';
import { useWhatsApp } from '../../whatsapp/hooks/useWhatsApp';
import { taskService } from '../../tasks/services/taskService';
import { TaskItem, TaskPriority, TaskStatus } from '../../tasks/types/task.types';
import { customerService } from '../../customers/services/customerService';
import { employeeService } from '../services/employeeService';
import { attendanceService } from '../../attendance/services/attendanceService';
import { productService } from '../../products/services/productService';
import { FollowUpDashboardWidget } from '../../follow-ups/components/FollowUpDashboardWidget';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { status: waStatus, phoneNumber: waPhone } = useWhatsApp();

  // Live Summary Metrics
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [taskCounts, setTaskCounts] = useState({
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
  });
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);
  const [activeDutyList, setActiveDutyList] = useState<
    Array<{
      id: string;
      employeeName: string;
      employeeRole?: string;
      checkInAt: string;
    }>
  >([]);

  // Current Date Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Tasks
      const tasksRes = await taskService.getTasks({ limit: 50 });
      if (tasksRes?.success && Array.isArray(tasksRes.data)) {
        const allTasks = tasksRes.data;
        const assigned = allTasks.filter((t) => t.status === 'ASSIGNED').length;
        const inProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
        const completed = allTasks.filter((t) => t.status === 'COMPLETED').length;

        setTaskCounts({
          total: tasksRes.meta?.total ?? allTasks.length,
          assigned,
          inProgress,
          completed,
        });

        // Set top 5 recent tasks
        setRecentTasks(allTasks.slice(0, 5));
      }

      // 2. Fetch Customers Count
      const custRes = await customerService.getCustomers({ limit: 1 });
      if (custRes?.success) {
        setCustomerCount(custRes.meta?.total ?? custRes.data?.length ?? 0);
      }

      // 3. Fetch Employees Count
      const empRes = await employeeService.getEmployees({ limit: 1 });
      if (empRes?.success) {
        setEmployeeCount(empRes.meta?.total ?? empRes.data?.length ?? 0);
      }

      // 4. Fetch Attendance Metrics & Checked In
      const [attMetricsRes, checkedInRes] = await Promise.allSettled([
        attendanceService.getMetrics(),
        attendanceService.getCurrentlyCheckedIn(),
      ]);

      if (attMetricsRes.status === 'fulfilled' && attMetricsRes.value?.success) {
        setCheckedInCount(attMetricsRes.value.data.checkedIn || 0);
      }

      if (checkedInRes.status === 'fulfilled' && checkedInRes.value?.success) {
        const list = checkedInRes.value.data || [];
        setActiveDutyList(
          list.slice(0, 4).map((item) => ({
            id: item.id,
            employeeName: item.employee?.fullName || 'Technician',
            employeeRole: item.employee?.designation || item.employee?.role || 'Field Staff',
            checkInAt: item.checkInAt,
          }))
        );
      }

      // 5. Fetch Products Count
      const prodRes = await productService.getProducts({ limit: 1 });
      if (prodRes?.success) {
        setProductCount(prodRes.meta?.total ?? prodRes.data?.length ?? 0);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <StatusPill
            variant="danger"
            size="xs"
            icon={<Flame size={11} className="text-rose-600 shrink-0" />}
          >
            Urgent
          </StatusPill>
        );
      case 'HIGH':
        return (
          <StatusPill variant="warning" size="xs">
            High
          </StatusPill>
        );
      case 'MEDIUM':
        return (
          <StatusPill variant="info" size="xs">
            Medium
          </StatusPill>
        );
      default:
        return (
          <StatusPill variant="neutral" size="xs">
            Low
          </StatusPill>
        );
    }
  };

  const getTaskStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <StatusPill variant="warning" size="xs" dot dotPulse>
            In Progress
          </StatusPill>
        );
      case 'ASSIGNED':
        return (
          <StatusPill
            variant="info"
            size="xs"
            icon={<Clock size={11} className="text-blue-600 shrink-0" />}
          >
            Assigned
          </StatusPill>
        );
      case 'COMPLETED':
        return (
          <StatusPill
            variant="success"
            size="xs"
            icon={<CheckCircle2 size={11} className="text-emerald-600 shrink-0" />}
          >
            Completed
          </StatusPill>
        );
      case 'CANCELLED':
        return (
          <StatusPill variant="danger" size="xs">
            Cancelled
          </StatusPill>
        );
      default:
        return (
          <StatusPill variant="neutral" size="xs">
            Created
          </StatusPill>
        );
    }
  };

  const getWhatsAppBadge = () => {
    switch (waStatus) {
      case 'connected':
        return (
          <StatusPill
            variant="success"
            size="xs"
            dot
            dotPulse
            icon={<Radio size={11} className="text-emerald-600 shrink-0" />}
          >
            Connected
          </StatusPill>
        );
      case 'connecting':
        return (
          <StatusPill variant="warning" size="xs" dot dotPulse>
            Connecting...
          </StatusPill>
        );
      case 'qr':
        return (
          <StatusPill variant="info" size="xs">
            Scan QR
          </StatusPill>
        );
      default:
        return (
          <StatusPill variant="danger" size="xs">
            Offline
          </StatusPill>
        );
    }
  };

  return (
    <div className="w-full space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Executive Hero Header */}
      <div className="bg-card rounded-xl border border-border shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Welcome & Info */}
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <StatusPill
                variant="info"
                size="xs"
                icon={<ShieldCheck size={12} className="text-blue-600 shrink-0" />}
              >
                Executive Operations
              </StatusPill>
              <StatusPill variant="neutral" size="xs" dot dotPulse>
                All Systems Operational
              </StatusPill>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
                • {currentDateFormatted}
              </span>
            </div>
            <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight truncate">
              {getGreeting()}, {user?.fullName?.split(' ')[0] || 'Administrator'}
            </h1>
            <p className="text-[13px] text-slate-500 max-w-2xl leading-relaxed">
              Industrial operations overview: manage field dispatches, real-time technician duty, corporate client directories, and messaging pipelines.
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh live metrics"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/customers')}
            >
              <Building2 size={14} className="mr-1.5" />
              <span>Add Customer</span>
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/tasks')}
            >
              <Plus size={15} className="mr-1.5" />
              <span>New Work Order</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Executive Key Metric Indicators (KPI Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* KPI 1: Active Field Tasks */}
        <div
          onClick={() => navigate('/tasks')}
          className="bg-card rounded-xl border border-border p-4 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all duration-150 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
              <span className="text-[12px] font-medium text-slate-600 truncate">
                Active Tasks
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <ClipboardList size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap min-w-0">
              <span className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums">
                {loading ? '—' : taskCounts.assigned + taskCounts.inProgress}
              </span>
              {taskCounts.inProgress > 0 ? (
                <StatusPill variant="info" size="xs">
                  {taskCounts.inProgress} active
                </StatusPill>
              ) : (
                <StatusPill variant="neutral" size="xs">
                  0 active
                </StatusPill>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-slate-500 min-w-0">
            <span className="truncate mr-1.5 min-w-0 font-medium tabular-nums">{taskCounts.total} total logged</span>
            <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
              Dispatch <ChevronRight size={12} className="shrink-0" />
            </span>
          </div>
        </div>

        {/* KPI 2: On-Duty Workforce */}
        <div
          onClick={() => navigate('/attendance')}
          className="bg-card rounded-xl border border-border p-4 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all duration-150 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
              <span className="text-[12px] font-medium text-slate-600 truncate">
                On-Duty Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap min-w-0">
              <span className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums">
                {loading ? '—' : checkedInCount}
              </span>
              {checkedInCount > 0 ? (
                <StatusPill variant="success" size="xs">
                  Active staff
                </StatusPill>
              ) : (
                <StatusPill variant="neutral" size="xs">
                  No staff
                </StatusPill>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-slate-500 min-w-0">
            <span className="truncate mr-1.5 min-w-0 font-medium tabular-nums">{employeeCount} total roster</span>
            <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
              Roster <ChevronRight size={12} className="shrink-0" />
            </span>
          </div>
        </div>

        {/* KPI 3: Corporate Clients */}
        <div
          onClick={() => navigate('/customers')}
          className="bg-card rounded-xl border border-border p-4 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all duration-150 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
              <span className="text-[12px] font-medium text-slate-600 truncate">
                Client Accounts
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap min-w-0">
              <span className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums">
                {loading ? '—' : customerCount}
              </span>
              <StatusPill variant="purple" size="xs">
                Verified
              </StatusPill>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-slate-500 min-w-0">
            <span className="truncate mr-1.5 min-w-0 font-medium">Enterprise clients</span>
            <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
              Manage <ChevronRight size={12} className="shrink-0" />
            </span>
          </div>
        </div>

        {/* KPI 4: WhatsApp Gateway */}
        <div
          onClick={() => navigate('/admin/whatsapp')}
          className="bg-card rounded-xl border border-border p-4 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all duration-150 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
              <span className="text-[12px] font-medium text-slate-600 truncate">
                WhatsApp Gateway
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <MessageSquare size={16} />
              </div>
            </div>
            <div className="flex items-center min-w-0">
              {getWhatsAppBadge()}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-slate-500 min-w-0">
            <span className="truncate mr-1.5 min-w-0 font-medium">{waPhone || 'Alerts Active'}</span>
            <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
              Console <ChevronRight size={12} className="shrink-0" />
            </span>
          </div>
        </div>

        {/* KPI 5: Equipment Catalog */}
        <div
          onClick={() => navigate('/products')}
          className="bg-card rounded-xl border border-border p-4 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all duration-150 cursor-pointer group flex flex-col justify-between sm:col-span-2 lg:col-span-1"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
              <span className="text-[12px] font-medium text-slate-600 truncate">
                Catalog Items
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Zap size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap min-w-0">
              <span className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums">
                {loading ? '—' : productCount}
              </span>
              <StatusPill variant="warning" size="xs">
                Power units
              </StatusPill>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-slate-500 min-w-0">
            <span className="truncate mr-1.5 min-w-0 font-medium">Hardware & parts</span>
            <span className="text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
              Catalog <ChevronRight size={12} className="shrink-0" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Operations Layout (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Operations & Live Feeds (7 Cols on LG) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active Field Tasks Table Card */}
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <ClipboardList size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-slate-900 leading-tight truncate">
                    Recent Field Work Orders
                  </h3>
                  <p className="text-[12px] text-slate-500 truncate">
                    Latest customer service tasks & scheduled dispatches
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/tasks')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>View All</span> <ArrowUpRight size={13} className="shrink-0" />
              </button>
            </div>

            {/* Tasks Content */}
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading work orders...</div>
              ) : recentTasks.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <ClipboardList size={18} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">No recent tasks logged</p>
                  <p className="text-[11px] text-slate-400">Create a work order to begin dispatching.</p>
                </div>
              ) : (
                recentTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex flex-col min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-60">
                          {task.title}
                        </span>
                        {getPriorityBadge(task.priority)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap min-w-0">
                        <span className="font-medium text-slate-700 truncate max-w-37.5">
                          {task.customer?.name || task.customer?.companyName || 'Corporate Client'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500 truncate max-w-37.5">
                          {task.assignedUser?.fullName ? `Assignee: ${task.assignedUser.fullName}` : 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getTaskStatusBadge(task.status)}
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary Strip */}
            <div className="p-3 bg-slate-50/70 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
              <span className="font-medium truncate tabular-nums">
                {taskCounts.inProgress} active on-site • {taskCounts.assigned} pending dispatch
              </span>
              <button
                onClick={() => navigate('/tasks')}
                className="font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>Go to Task Center</span> <ArrowRight size={13} className="shrink-0" />
              </button>
            </div>
          </div>

          {/* Today's Active Attendance Roster */}
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CalendarCheck size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-slate-900 leading-tight truncate">
                    Technician Duty Roster Today
                  </h3>
                  <p className="text-[12px] text-slate-500 truncate">
                    Live check-in timestamps and field duty presence
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/attendance')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Full Logs</span> <ArrowUpRight size={13} className="shrink-0" />
              </button>
            </div>

            <div className="p-4">
              {activeDutyList.length === 0 ? (
                <div className="py-8 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <UserCheck size={18} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">No technicians clocked in yet today</p>
                  <p className="text-[11px] text-slate-400">Shift check-in timestamps will appear here in real time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeDutyList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border bg-slate-50/50 flex items-center justify-between gap-3 min-w-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {item.employeeName}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {item.employeeRole}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <StatusPill variant="success" size="xs">
                          {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Duty'}
                        </StatusPill>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quick Navigation, Integration & Telemetry (5 Cols on LG) */}
        <div className="lg:col-span-5 space-y-5">
          {/* CRM Follow-ups & Reminders Widget */}
          <FollowUpDashboardWidget />

          {/* Executive Administrative Modules Grid */}
          <div className="bg-card rounded-xl border border-border shadow-xs p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <h3 className="text-[14px] font-semibold text-slate-900 truncate">Administrative Modules</h3>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider shrink-0">
                Direct Portals
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Directory */}
              <div
                onClick={() => navigate('/customers')}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                    <Building2 size={16} />
                  </div>
                  <StatusPill variant="info" size="xs">
                    Clients
                  </StatusPill>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Customer Accounts
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    Manage service sites & verified coordinates
                  </p>
                </div>
              </div>

              {/* Staff & RBAC */}
              <div
                onClick={() => navigate('/employees')}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer group flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
                    <Users size={16} />
                  </div>
                  <StatusPill variant="purple" size="xs">
                    Staff
                  </StatusPill>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                    Staff Directory
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    RBAC permissions, roles & technicians
                  </p>
                </div>
              </div>

              {/* Power Inventory */}
              <div
                onClick={() => navigate('/products')}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer group flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
                    <Zap size={16} />
                  </div>
                  <StatusPill variant="warning" size="xs">
                    Inventory
                  </StatusPill>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    Equipment Catalog
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    Generators, transfer switches & parts
                  </p>
                </div>
              </div>

              {/* Energy Analytics */}
              <div
                onClick={() => navigate('/analytics')}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-cyan-300 hover:bg-cyan-50/30 transition-all cursor-pointer group flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-cyan-600 group-hover:text-white transition-all shrink-0">
                    <Activity size={16} />
                  </div>
                  <StatusPill variant="cyan" size="xs">
                    Telemetry
                  </StatusPill>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">
                    Energy Telemetry
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    Grid frequency & generator diagnostics
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Automation Gateway Card (Restyled to match visual weight) */}
          <div
            onClick={() => navigate('/admin/whatsapp')}
            className="bg-card rounded-xl p-4 shadow-xs border border-border space-y-3 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                    WhatsApp Dispatch Gateway
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">Automated technician & customer alerts</p>
                </div>
              </div>
              <div className="shrink-0">
                {getWhatsAppBadge()}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {waStatus === 'connected'
                ? `Paired with ${waPhone || 'Active Account'}. Real-time job assignments and status change messages are delivering normally.`
                : 'WhatsApp session is currently disconnected. Pair your administrative device via QR scan to enable automatic task dispatch alerts.'}
            </p>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
              <span>{waStatus === 'connected' ? 'Manage Gateway Console' : 'Open QR Pairing'}</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default AdminDashboardPage;
