import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { taskService } from '../services/taskService';
import { customerService } from '../../customers/services/customerService';
import { employeeService } from '../../admin/services/employeeService';
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

export const TaskManagementPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Load Reference Data (Active Customers & Employees)
  useEffect(() => {
    customerService
      .getCustomers({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCustomersList(res.data);
        }
      })
      .catch(() => {});

    employeeService
      .getEmployees({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setEmployeesList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Tasks with filters & pagination
  const fetchTasks = async (targetPage: number = page) => {
    setLoading(true);
    setError(null);
    try {
      const response = await taskService.getTasks({
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        assignedTo: employeeFilter !== 'ALL' ? employeeFilter : undefined,
        customerId: customerFilter !== 'ALL' ? customerFilter : undefined,
        scheduledDate: dateFilter.trim() || undefined,
        page: targetPage,
        limit,
      });

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
      setError(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter changes
  useEffect(() => {
    setPage(1);
    fetchTasks(1);
  }, [statusFilter, priorityFilter, employeeFilter, customerFilter, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          setSuccessMessage(`Task "${response.data.title}" created successfully!`);
          setTaskModalMode(null);
          fetchTasks(1);
          setTimeout(() => setSuccessMessage(null), 4000);
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
          setSuccessMessage(`Task "${response.data.title}" updated successfully!`);
          setTaskModalMode(null);
          fetchTasks(page);
          setTimeout(() => setSuccessMessage(null), 4000);
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

  // Confirm Task Cancellation
  const handleConfirmCancelTask = async (taskId: string, cancellationReason: string) => {
    const response = await taskService.cancelTask(taskId, { cancellationReason });
    if (response.success) {
      setSuccessMessage(`Task cancelled successfully.`);
      fetchTasks(page);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-7 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col gap-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/60">
              <ClipboardList size={12} className="text-orange-600" /> Field Work Order Dispatch
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200">
              {totalCount} Total Orders
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Field Task & Dispatch Management
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Schedule customer service visits, dispatch technicians to customer destination sites, and monitor real-time work order fulfillment with SLA tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateTask}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-900/20 hover:shadow-lg transition-all active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>Create Field Task</span>
        </button>
      </div>

      {/* Alert Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-in fade-in">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
        onPageChange={(p) => {
          setPage(p);
          fetchTasks(p);
        }}
        onOpenCreate={handleOpenCreateTask}
        onViewDetails={(task) => setSelectedTaskForDetail(task)}
        onEditTask={handleOpenEditTask}
        onCancelTask={(task) => setSelectedTaskForCancel(task)}
      />

      {/* Task Create / Edit Modal */}
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
        onClose={() => setSelectedTaskForDetail(null)}
        onEdit={(task) => {
          setSelectedTaskForDetail(null);
          handleOpenEditTask(task);
        }}
        onCancel={(task) => {
          setSelectedTaskForDetail(null);
          setSelectedTaskForCancel(task);
        }}
      />

      {/* Task Cancel Modal */}
      <TaskCancelModal
        task={selectedTaskForCancel}
        isOpen={selectedTaskForCancel !== null}
        onClose={() => setSelectedTaskForCancel(null)}
        onConfirmCancel={handleConfirmCancelTask}
      />
    </div>
  );
};

export default TaskManagementPage;
