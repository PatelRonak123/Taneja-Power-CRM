import React, { useState, useEffect } from "react";
import { Users, Plus } from "lucide-react";
import { employeeService } from "../services/employeeService";
import {
  Employee,
  EmployeeRole,
  EmployeeStatus,
  EmployeeMetrics,
  WorkType,
} from "../types/employee.types";
import { toast } from "../../../utils/toast";
import { confirmModal } from "../../../utils/confirmModal";
import { EmployeeMetricsCards } from "../components/EmployeeMetricsCards";
import { EmployeeToolbar } from "../components/EmployeeToolbar";
import { EmployeeTable } from "../components/EmployeeTable";
import { EmployeeModal } from "../components/EmployeeModal";
import { Button } from "../../../components/ui/Button";

export const EmployeeManagementPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("ALL");
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
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    emails: string[];
    password?: string;
    role: EmployeeRole;
    workType: WorkType;
    phone: string;
    phones: string[];
    designation: string;
    status: EmployeeStatus;
  }>({
    fullName: "",
    email: "",
    emails: [""],
    password: "",
    role: "USER",
    workType: "OFFICE",
    phone: "",
    phones: [""],
    designation: "Sales Office",
    status: "ACTIVE",
  });

  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(
    null,
  );

  // Load Employees
  const fetchEmployees = async (targetPage: number = page) => {
    setLoading(true);
    try {
      const response = await employeeService.getEmployees({
        search: searchQuery.trim() || undefined,
        role: roleFilter !== "ALL" ? (roleFilter as EmployeeRole) : undefined,
        status:
          statusFilter !== "ALL" ? (statusFilter as EmployeeStatus) : undefined,
        workType: workTypeFilter !== "ALL" ? workTypeFilter : undefined,
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
      toast.error("Failed to load employees", err?.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter or debounced search changes
  useEffect(() => {
    setPage(1);
    fetchEmployees(1);
  }, [searchQuery, roleFilter, statusFilter, workTypeFilter]);

  // Search Submit (immediate)
  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    fetchEmployees(1);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingEmployeeId(null);
    setFormError(null);
    setShowPassword(false);
    setFormData({
      fullName: "",
      email: "",
      emails: [""],
      password: "",
      role: "USER",
      workType: "OFFICE",
      phone: "",
      phones: [""],
      designation: "Sales Office",
      status: "ACTIVE",
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setModalMode("edit");
    setEditingEmployeeId(emp.id);
    setFormError(null);

    let initialDesignation = emp.designation;
    if (emp.workType === "FIELD") {
      if (
        emp.designation?.toLowerCase().includes("service") ||
        emp.designation?.toLowerCase().includes("technician") ||
        emp.designation?.toLowerCase().includes("engineer")
      ) {
        initialDesignation = "Service";
      } else {
        initialDesignation = "Sales";
      }
    } else {
      initialDesignation = emp.designation || "Sales Office";
    }

    const rawEmails = emp.email
      ? emp.email.split(",").map((e) => e.trim()).filter(Boolean)
      : [];
    const initialEmails = rawEmails.length > 0 ? rawEmails : [""];

    const rawPhones = emp.phone
      ? emp.phone.split(",").map((p) => p.trim()).filter(Boolean)
      : [];
    const initialPhones = rawPhones.length > 0 ? rawPhones : [""];

    setFormData({
      fullName: emp.fullName || "",
      email: initialEmails[0] || "",
      emails: initialEmails,
      role: emp.role || "USER",
      workType: emp.workType || "OFFICE",
      phone: initialPhones[0] || "",
      phones: initialPhones,
      designation: initialDesignation,
      status: emp.status || "ACTIVE",
    });
  };

  // Form Input Change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  // Multi-Email Handlers
  const handleEmailChange = (index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.emails];
      updated[index] = value;
      return {
        ...prev,
        emails: updated,
        email: updated[0] || "",
      };
    });
    if (formError) setFormError(null);
  };

  const handleAddEmail = () => {
    setFormData((prev) => ({
      ...prev,
      emails: [...prev.emails, ""],
    }));
  };

  const handleRemoveEmail = (index: number) => {
    setFormData((prev) => {
      const updated = prev.emails.filter((_, i) => i !== index);
      const finalEmails = updated.length > 0 ? updated : [""];
      return {
        ...prev,
        emails: finalEmails,
        email: finalEmails[0] || "",
      };
    });
  };

  // Multi-Phone Handlers
  const handlePhoneChange = (index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.phones];
      updated[index] = value;
      return {
        ...prev,
        phones: updated,
        phone: updated[0] || "",
      };
    });
    if (formError) setFormError(null);
  };

  const handleAddPhone = () => {
    setFormData((prev) => ({
      ...prev,
      phones: [...prev.phones, ""],
    }));
  };

  const handleRemovePhone = (index: number) => {
    setFormData((prev) => {
      const updated = prev.phones.filter((_, i) => i !== index);
      const finalPhones = updated.length > 0 ? updated : [""];
      return {
        ...prev,
        phones: finalPhones,
        phone: finalPhones[0] || "",
      };
    });
  };

  // Work Type Switching with Auto-reconciliation of Designation
  const handleWorkTypeChange = (newWorkType: WorkType) => {
    setFormData((prev) => {
      const defaultDesig = newWorkType === "OFFICE" ? "Sales Office" : "Sales";
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
      setFormError("Full legal name must be at least 2 characters.");
      return;
    }

    // Filter non-empty emails
    const validEmails = formData.emails
      .map((em) => em.trim())
      .filter(Boolean);

    if (validEmails.length === 0) {
      setFormError("Please enter at least one valid work email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const singleEmail of validEmails) {
      if (!emailRegex.test(singleEmail)) {
        setFormError(`"${singleEmail}" is not a valid email address.`);
        return;
      }
    }

    const emailSet = new Set(validEmails.map((em) => em.toLowerCase()));
    if (emailSet.size !== validEmails.length) {
      setFormError("Duplicate email addresses detected. Please remove duplicates.");
      return;
    }

    const combinedEmail = validEmails.join(", ");

    // Filter non-empty phones
    const validPhones = formData.phones
      .map((ph) => ph.trim())
      .filter(Boolean);
    const combinedPhone = validPhones.length > 0 ? validPhones.join(", ") : undefined;

    if (modalMode === "create") {
      if (!formData.password || formData.password.length < 6) {
        setFormError("Initial password must be at least 6 characters long.");
        return;
      }
    }

    setFormSubmitting(true);
    try {
      if (modalMode === "create") {
        const response = await employeeService.createEmployee({
          fullName: formData.fullName.trim(),
          email: combinedEmail,
          password: formData.password!,
          role: formData.role,
          workType: formData.workType,
          phone: combinedPhone,
          designation: formData.designation.trim() || undefined,
          status: formData.status,
        });

        if (response.success) {
          toast.success(
            `Employee "${response.data.fullName}" created successfully!`,
          );
          setModalMode(null);
          fetchEmployees(1);
        }
      } else if (modalMode === "edit" && editingEmployeeId) {
        const response = await employeeService.updateEmployee(
          editingEmployeeId,
          {
            fullName: formData.fullName.trim(),
            role: formData.role,
            workType: formData.workType,
            phone: combinedPhone,
            designation: formData.designation.trim() || undefined,
            status: formData.status,
          },
        );

        if (response.success) {
          toast.success(
            `Employee "${response.data.fullName}" updated successfully!`,
          );
          setModalMode(null);
          fetchEmployees(page);
        }
      }
    } catch (err: any) {
      setFormError(
        err?.message ||
          `Failed to ${modalMode === "create" ? "create" : "update"} employee record.`,
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Employee Status
  const handleToggleStatus = async (emp: Employee) => {
    const newStatus: EmployeeStatus =
      emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const actionName = newStatus === "ACTIVE" ? "activate" : "deactivate";

    const isConfirmed = await confirmModal({
      title: `${actionName.charAt(0).toUpperCase() + actionName.slice(1)} Employee`,
      message: `Are you sure you want to ${actionName} employee "${emp.fullName}"?${
        newStatus === "INACTIVE"
          ? " They will no longer be able to log in to the portal."
          : ""
      }`,
      confirmText: actionName.charAt(0).toUpperCase() + actionName.slice(1),
      variant: newStatus === "INACTIVE" ? "warning" : "primary",
    });

    if (!isConfirmed) {
      return;
    }

    setStatusTogglingId(emp.id);
    try {
      const response = await employeeService.updateEmployee(emp.id, {
        status: newStatus,
      });

      if (response.success) {
        toast.success(
          `Employee "${emp.fullName}" ${actionName}d successfully.`,
        );
        fetchEmployees(page);
      }
    } catch (err: any) {
      toast.error(`Failed to ${actionName} employee`, err?.message);
    } finally {
      setStatusTogglingId(null);
    }
  };

  // Delete Employee (Soft/Hard cascade as per DB rules)
  const handleDeleteEmployee = async (emp: Employee) => {
    const isConfirmed = await confirmModal({
      title: "Delete Employee Account",
      message: `Are you sure you want to permanently delete employee "${emp.fullName}" (${emp.email})? This action cannot be reversed.`,
      confirmText: "Delete Employee",
      variant: "danger",
    });

    if (!isConfirmed) {
      return;
    }

    setDeletingEmployeeId(emp.id);
    try {
      const response = await employeeService.deleteEmployee(emp.id);
      if (response.success) {
        toast.success(`Employee "${emp.fullName}" deleted successfully.`);
        const targetPage = employees.length === 1 && page > 1 ? page - 1 : page;
        setPage(targetPage);
        fetchEmployees(targetPage);
      }
    } catch (err: any) {
      toast.error("Failed to delete employee", err?.message);
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
              Employee Management
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              Manage organization staff directory, application access roles, and
              account credentials.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
          >
            Add Employee
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <EmployeeMetricsCards metrics={metrics} />

      {/* Filter & Search Toolbar */}
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
          setSearchQuery("");
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
        onEmailChange={handleEmailChange}
        onAddEmail={handleAddEmail}
        onRemoveEmail={handleRemoveEmail}
        onPhoneChange={handlePhoneChange}
        onAddPhone={handleAddPhone}
        onRemovePhone={handleRemovePhone}
        formSubmitting={formSubmitting}
        formError={formError}
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword(!showPassword)}
      />
    </div>
  );
};

export default EmployeeManagementPage;
