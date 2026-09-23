import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { Employee, EmployeeRole, EmployeeStatus, EmployeeMetrics, WorkType } from '../types/employee.types';
import { EmployeeMetricsCards } from '../components/EmployeeMetricsCards';
import { EmployeeToolbar } from '../components/EmployeeToolbar';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeModal } from '../components/EmployeeModal';

export const EmployeeManagementPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Metrics
  const [metrics, setMetrics] = useState<EmployeeMetrics>({
    total: 0,
    admins: 0,
    managers: 0,
    users: 0,
    active: 0,
    inactive: 0,
  });

  // Modal State ('create' | 'edit' | null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    password?: string;
    role: EmployeeRole;
    workType: WorkType;
    phone: string;
    designation: string;
    status: EmployeeStatus;
  }>({
    fullName: '',
    email: '',
    password: '',
    role: 'USER',
    workType: 'OFFICE',
    phone: '',
    designation: 'Sales Office',
    status: 'ACTIVE',
  });

  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  // Load Employees
  const fetchEmployees = async (targetPage: number = page) => {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployees({
        search: searchQuery.trim() || undefined,
        role: roleFilter !== 'ALL' ? (roleFilter as EmployeeRole) : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as EmployeeStatus) : undefined,
        workType: workTypeFilter !== 'ALL' ? workTypeFilter : undefined,
        page: targetPage,
        limit,
      });

      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
        if (response.meta) {
          setTotalCount(response.meta.total || response.data.length);
          setTotalPages(response.meta.totalPages || 1);
          setPage(response.meta.page || targetPage);
          if (response.meta.metrics) {
            setMetrics(response.meta.metrics as EmployeeMetrics);
          }
        }
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchEmployees(1);
  }, [roleFilter, statusFilter, workTypeFilter]);

  // Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees(1);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingEmployeeId(null);
    setFormError(null);
    setShowPassword(false);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'USER',
      workType: 'OFFICE',
      phone: '',
      designation: 'Sales Office',
      status: 'ACTIVE',
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setModalMode('edit');
    setEditingEmployeeId(emp.id);
    setFormError(null);

    let initialDesignation = emp.designation;
    if (emp.workType === 'FIELD') {
      if (
        emp.designation?.toLowerCase().includes('service') ||
        emp.designation?.toLowerCase().includes('technician') ||
        emp.designation?.toLowerCase().includes('engineer')
      ) {
        initialDesignation = 'Service';
      } else {
        initialDesignation = 'Sales';
      }
    } else {
      initialDesignation = emp.designation || 'Sales Office';
    }

    setFormData({
      fullName: emp.fullName || '',
      email: emp.email || '',
      role: emp.role || 'USER',
      workType: emp.workType || 'OFFICE',
      phone: emp.phone || '',
      designation: initialDesignation,
      status: emp.status || 'ACTIVE',
    });
  };

  // Form Input Change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  // Work Type Switching with Auto-reconciliation of Designation
  const handleWorkTypeChange = (newWorkType: WorkType) => {
    setFormData((prev) => {
      const defaultDesig = newWorkType === 'OFFICE' ? 'Sales Office' : 'Sales';
      return {
        ...prev,
        workType: newWorkType,
        designation: defaultDesig,
      };
    });
    if (formError) setFormError(null);
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      setFormError('Full legal name must be at least 2 characters.');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Please enter a valid corporate email address.');
      return;
    }

    if (modalMode === 'create') {
      if (!formData.password || formData.password.length < 6) {
        setFormError('Initial password must be at least 6 characters long.');
        return;
      }
    }

    setFormSubmitting(true);
    try {
      if (modalMode === 'create') {
        const response = await employeeService.createEmployee({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password!,
          role: formData.role,
          workType: formData.workType,
          phone: formData.phone.trim() || undefined,
          designation: formData.designation.trim() || undefined,
          status: formData.status,
        });

        if (response.success) {
          setSuccessMessage(`Employee "${response.data.fullName}" created successfully!`);
          setModalMode(null);
          fetchEmployees(1);
          setTimeout(() => setSuccessMessage(null), 4000);
        }
      } else if (modalMode === 'edit' && editingEmployeeId) {
        const response = await employeeService.updateEmployee(editingEmployeeId, {
          fullName: formData.fullName.trim(),
          role: formData.role,
          workType: formData.workType,
          phone: formData.phone.trim() || undefined,
          designation: formData.designation.trim() || undefined,
          status: formData.status,
        });

        if (response.success) {
          setSuccessMessage(`Employee "${response.data.fullName}" updated successfully!`);
          setModalMode(null);
          fetchEmployees(page);
          setTimeout(() => setSuccessMessage(null), 4000);
        }
      }
    } catch (err: any) {
      setFormError(
        err?.message ||
          `Failed to ${modalMode === 'create' ? 'create' : 'update'} employee record.`
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Employee Status
  const handleToggleStatus = async (emp: Employee) => {
    const newStatus: EmployeeStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionName = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';

    if (!window.confirm(`Are you sure you want to ${actionName} employee "${emp.fullName}"?`)) {
      return;
    }

    setStatusTogglingId(emp.id);
    try {
      const response = await employeeService.updateEmployee(emp.id, {
        status: newStatus,
      });

      if (response.success) {
        setSuccessMessage(`Employee "${emp.fullName}" ${actionName}d successfully.`);
        fetchEmployees(page);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to ${actionName} employee.`);
    } finally {
      setStatusTogglingId(null);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp: Employee) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently remove employee "${emp.fullName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingEmployeeId(emp.id);
    try {
      const response = await employeeService.deleteEmployee(emp.id);
      if (response.success) {
        setSuccessMessage(`Employee "${emp.fullName}" removed successfully.`);
        fetchEmployees(page);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to remove employee record.');
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Manage office and field personnel, configure designations, and administer credentials.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-900/20 hover:shadow-lg transition-all active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Alert Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Header Cards */}
      <EmployeeMetricsCards metrics={metrics} />

      {/* Search & Filter Toolbar */}
      <EmployeeToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        workTypeFilter={workTypeFilter}
        setWorkTypeFilter={setWorkTypeFilter}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={() => {
          setSearchQuery('');
          setPage(1);
          fetchEmployees(1);
        }}
        onRefresh={() => fetchEmployees(page)}
        loading={loading}
      />

      {/* Employee Data Table */}
      <EmployeeTable
        employees={employees}
        loading={loading}
        searchQuery={searchQuery}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        statusTogglingId={statusTogglingId}
        deletingEmployeeId={deletingEmployeeId}
        onOpenCreate={handleOpenCreate}
        onToggleStatus={handleToggleStatus}
        onEditEmployee={handleOpenEdit}
        onDeleteEmployee={handleDeleteEmployee}
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={(p) => {
          setPage(p);
          fetchEmployees(p);
        }}
      />

      {/* Create / Edit Employee Modal */}
      <EmployeeModal
        modalMode={modalMode}
        onClose={() => setModalMode(null)}
        onSubmit={handleSubmit}
        formData={formData}
        onInputChange={handleInputChange}
        onWorkTypeChange={handleWorkTypeChange}
        formSubmitting={formSubmitting}
        formError={formError}
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword(!showPassword)}
      />
    </div>
  );
};

export default EmployeeManagementPage;
