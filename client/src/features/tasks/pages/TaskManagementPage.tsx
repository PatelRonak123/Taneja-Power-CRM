import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Radio,
} from 'lucide-react';
import { taskService } from '../services/taskService';
import { customerService } from '../../customers/services/customerService';
import { employeeService } from '../../admin/services/employeeService';
import { useAuthStore } from '../../../stores/authStore';
import {
  TaskItem,
  TaskPriority,
  TaskStatus,
  TaskMetrics,
} from '../types/task.types';
import { Customer } from '../../customers/types/customer.types';
import { Employee } from '../../admin/types/employee.types';
import { TaskMetricsCards } from '../components/TaskMetricsCards';
import { TaskToolbar } from '../components/TaskToolbar';
import { TaskTable } from '../components/TaskTable';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskCancelModal } from '../components/TaskCancelModal';
import { LiveRouteTrackingDrawer } from '../components/LiveRouteTrackingDrawer';
import { toast } from '../../../utils/toast';
import { Button } from '../../../components/ui/Button';

export const TaskManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const isManagement = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Live Route Tracking Drawer State
  const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState<boolean>(false);
  const [selectedTaskIdForTracking, setSelectedTaskIdForTracking] = useState<string | null>(null);

  // Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Metrics
  const [metrics, setMetrics] = useState<TaskMetrics>({
    total: 0,
    created: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });

  // Reference Data for Dropdowns
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Task Create / Edit Modal State
  const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormSubmitting, setTaskFormSubmitting] = useState<boolean>(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);

  // Task Form Data
  const [taskFormData, setTaskFormData] = useState<{
    title: string;
    description: string;
    customerId: string;
    destinationId: string;
    assignedTo: string;
    priority: TaskPriority;
    status: TaskStatus;
    scheduledAt: string;
    dueAt: string;
  }>({
    title: '',
    description: '',
    customerId: '',
    destinationId: '',
    assignedTo: '',
    priority: 'MEDIUM',
    status: 'CREATED',
    scheduledAt: '',
    dueAt: '',
  });

  // Task Detail Modal State
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<TaskItem | null>(null);

  // Task Cancel Modal State
  const [selectedTaskForCancel, setSelectedTaskForCancel] = useState<TaskItem | null>(null);

  // Load Reference Data (Active Customers for all; Employees ONLY for Admin/Manager)
  useEffect(() => {
    customerService
      .getCustomers({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCustomersList(res.data);
        }
      })
      .catch(() => {});

    // For USER: never execute employeeService.getEmployees() (avoids 403)
    if (isManagement) {
      employeeService
        .getEmployees({ status: 'ACTIVE', limit: 100 })
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setEmployeesList(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isManagement]);

  // Fetch Tasks with filters & pagination
  const fetchTasks = async (targetPage: number = page) => {
    setLoading(true);
    try {
      const queryParams = {
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        assignedTo: isManagement && employeeFilter !== 'ALL' ? employeeFilter : undefined,
        customerId: customerFilter !== 'ALL' ? customerFilter : undefined,
        scheduledDate: dateFilter.trim() || undefined,
        page: targetPage,
        limit,
      };

      const response = isManagement
        ? await taskService.getTasks(queryParams)
        : await taskService.getMyTasks(queryParams);

      if (response.success && Array.isArray(response.data)) {
        setTasks(response.data);
        if (response.meta) {
          setTotalCount(response.meta.total || response.data.length);
          setTotalPages(response.meta.totalPages || 1);
          setPage(response.meta.page || targetPage);
          if (response.meta.metrics) {
            setMetrics(response.meta.metrics as TaskMetrics);
          }
        }
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      toast.error('Failed to load tasks', err?.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter and debounced search changes
  useEffect(() => {
    setPage(1);
    fetchTasks(1);
  }, [searchQuery, statusFilter, priorityFilter, employeeFilter, customerFilter, dateFilter]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    fetchTasks(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setEmployeeFilter('ALL');
    setCustomerFilter('ALL');
    setDateFilter('');
    setPage(1);
    fetchTasks(1);
  };

  const toDateTimeLocalValue = (isoStr?: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };

  // Open Create Task Modal
  const handleOpenCreateTask = () => {
    setTaskModalMode('create');
    setEditingTaskId(null);
    setTaskFormError(null);
    setTaskFormData({
      title: '',
      description: '',
      customerId: '',
      destinationId: '',
      assignedTo: '',
      priority: 'MEDIUM',
      status: 'CREATED',
      scheduledAt: '',
      dueAt: '',
    });
  };

  // Open Edit Task Modal
  const handleOpenEditTask = (task: TaskItem) => {
    setTaskModalMode('edit');
    setEditingTaskId(task.id);
    setTaskFormError(null);
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      customerId: task.customerId,
      destinationId: task.destinationId,
      assignedTo: task.assignedTo || '',
      priority: task.priority,
      status: task.status,
      scheduledAt: toDateTimeLocalValue(task.scheduledAt),
      dueAt: toDateTimeLocalValue(task.dueAt),
    });
  };

  const handleCustomerChangeInForm = (customerId: string) => {
    setTaskFormData((prev) => ({
      ...prev,
      customerId,
      destinationId: '',
    }));
    if (taskFormError) setTaskFormError(null);
  };

  const handleTaskInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTaskFormData((prev) => ({ ...prev, [name]: value }));
    if (taskFormError) setTaskFormError(null);
  };

  // Submit Task (Create or Edit)
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError(null);

    if (!taskFormData.title.trim() || taskFormData.title.trim().length < 2) {
      setTaskFormError('Task title must be at least 2 characters long.');
      return;
    }
    if (!taskFormData.customerId) {
      setTaskFormError('Please select a customer.');
      return;
    }
    if (!taskFormData.destinationId) {
      setTaskFormError('Please select a destination site.');
      return;
    }

    setTaskFormSubmitting(true);
    try {
      if (taskModalMode === 'create') {
        const response = await taskService.createTask({
          title: taskFormData.title.trim(),
          description: taskFormData.description.trim() || undefined,
          customerId: taskFormData.customerId,
          destinationId: taskFormData.destinationId,
          assignedTo: taskFormData.assignedTo || null,
          priority: taskFormData.priority,
          scheduledAt: taskFormData.scheduledAt ? new Date(taskFormData.scheduledAt).toISOString() : null,
          dueAt: taskFormData.dueAt ? new Date(taskFormData.dueAt).toISOString() : null,
        });

        if (response.success) {
          toast.success(`Task "${response.data.title}" created successfully!`);
          setTaskModalMode(null);
          fetchTasks(1);
        }
      } else if (taskModalMode === 'edit' && editingTaskId) {
        const response = await taskService.updateTask(editingTaskId, {
          title: taskFormData.title.trim(),
          description: taskFormData.description.trim() || undefined,
          customerId: taskFormData.customerId,
          destinationId: taskFormData.destinationId,
          assignedTo: taskFormData.assignedTo || null,
          priority: taskFormData.priority,
          status: taskFormData.status,
          scheduledAt: taskFormData.scheduledAt ? new Date(taskFormData.scheduledAt).toISOString() : null,
          dueAt: taskFormData.dueAt ? new Date(taskFormData.dueAt).toISOString() : null,
        });

        if (response.success) {
          toast.success(`Task "${response.data.title}" updated successfully!`);
          setTaskModalMode(null);
          fetchTasks(page);
        }
      }
    } catch (err: any) {
      setTaskFormError(
        err?.message || `Failed to ${taskModalMode === 'create' ? 'create' : 'update'} task.`
      );
    } finally {
      setTaskFormSubmitting(false);
    }
  };

  // Confirm Task Cancellation (Management)
  const handleConfirmCancelTask = async (taskId: string, cancellationReason: string) => {
    const response = await taskService.cancelTask(taskId, { cancellationReason });
    if (response.success) {
      toast.success('Task cancelled successfully.');
      fetchTasks(page);
    }
  };

  // Start Task (Assigned Employee / User)
  const handleStartTask = async (task: TaskItem) => {
    try {
      const response = await taskService.startTask(task.id);
      if (response.success) {
        toast.success('Task Started', 'Work order status updated to In Progress.');
        fetchTasks(page);
      }
    } catch (err: any) {
      toast.error('Failed to start task', err?.message);
    }
  };

  // Complete Task (Assigned Employee / User)
  const handleCompleteTask = async (task: TaskItem) => {
    try {
      const response = await taskService.completeTask(task.id);
      if (response.success) {
        toast.success('Task Completed', 'Task marked as completed successfully.');
        fetchTasks(page);
      }
    } catch (err: any) {
      toast.error('Failed to complete task', err?.message);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
              <ClipboardList size={12} className="text-blue-600" />
              {isManagement ? 'Field Work Order Dispatch' : 'My Assigned Tasks'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 tabular-nums">
              {totalCount} Total Orders
            </span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">
            {isManagement ? 'Field Task & Dispatch Management' : 'My Tasks & Work Orders'}
          </h1>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            {isManagement
              ? 'Schedule customer service visits, dispatch technicians to customer destination sites, and monitor real-time work order fulfillment with SLA tracking.'
              : 'Review your scheduled customer visits, complete assigned work orders, and track task resolution progress.'}
          </p>
        </div>

        {isManagement && (
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSelectedTaskIdForTracking(null);
                setIsTrackingDrawerOpen(true);
              }}
              className="text-orange-700 border-orange-200 bg-orange-50/60 hover:bg-orange-100"
            >
              <Radio size={14} className="animate-pulse text-orange-600 mr-1.5" />
              <span>Live Route Dispatch ({metrics.inProgress} Active)</span>
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreateTask}
            >
              <Plus size={15} className="mr-1.5" />
              <span>Create Field Task</span>
            </Button>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <TaskMetricsCards metrics={metrics} />

      {/* Toolbar */}
      <TaskToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        employeeFilter={employeeFilter}
        setEmployeeFilter={setEmployeeFilter}
        customerFilter={customerFilter}
        setCustomerFilter={setCustomerFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        employees={employeesList}
        customers={customersList}
        showEmployeeFilter={isManagement}
        onSearchSubmit={handleSearchSubmit}
        onClearFilters={handleClearFilters}
        onRefresh={() => fetchTasks(page)}
        loading={loading}
      />

      {/* Task Table */}
      <TaskTable
        tasks={tasks}
        loading={loading}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalCount={totalCount}
        isManagement={isManagement}
        onPageChange={(p) => {
          setPage(p);
          fetchTasks(p);
        }}
        onOpenCreate={handleOpenCreateTask}
        onViewDetails={(task) => setSelectedTaskForDetail(task)}
        onEditTask={handleOpenEditTask}
        onCancelTask={(task) => setSelectedTaskForCancel(task)}
        onTrackTask={(task) => {
          setSelectedTaskIdForTracking(task.id);
          setIsTrackingDrawerOpen(true);
        }}
      />

      {/* Task Create / Edit Modal (Only management can open) */}
      <TaskModal
        modalMode={taskModalMode}
        onClose={() => setTaskModalMode(null)}
        onSubmit={handleTaskSubmit}
        formData={taskFormData}
        onInputChange={handleTaskInputChange}
        customers={customersList}
        employees={employeesList}
        formSubmitting={taskFormSubmitting}
        formError={taskFormError}
        onCustomerChange={handleCustomerChangeInForm}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTaskForDetail}
        isManagement={isManagement}
        onClose={() => setSelectedTaskForDetail(null)}
        onEdit={(task) => {
          setSelectedTaskForDetail(null);
          handleOpenEditTask(task);
        }}
        onCancel={(task) => {
          setSelectedTaskForDetail(null);
          setSelectedTaskForCancel(task);
        }}
        onStartTask={handleStartTask}
        onCompleteTask={handleCompleteTask}
      />

      {/* Task Cancel Modal */}
      <TaskCancelModal
        task={selectedTaskForCancel}
        isOpen={selectedTaskForCancel !== null}
        onClose={() => setSelectedTaskForCancel(null)}
        onConfirmCancel={handleConfirmCancelTask}
      />

      {/* Live Route Tracking Drawer */}
      <LiveRouteTrackingDrawer
        isOpen={isTrackingDrawerOpen}
        onClose={() => {
          setIsTrackingDrawerOpen(false);
          setSelectedTaskIdForTracking(null);
        }}
        initialSelectedTaskId={selectedTaskIdForTracking}
      />
    </div>
  );
};

export default TaskManagementPage;
