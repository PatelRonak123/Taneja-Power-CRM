import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Search,
  RefreshCw,
  Trash2,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { Employee, CreateEmployeePayload } from '../types/employee.types';

export const EmployeeManagementPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Add Employee Form State
  const [formData, setFormData] = useState<CreateEmployeePayload>({
    fullName: '',
    email: '',
    password: '',
    role: 'USER',
  });

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load employees from server
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployees({
        search: searchQuery.trim() || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
      });

      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load employee list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [roleFilter]);

  // Handle Search submit / enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees();
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = employees.length;
    const admins = employees.filter((e) => e.role === 'ADMIN').length;
    const managers = employees.filter((e) => e.role === 'MANAGER').length;
    const users = employees.filter((e) => e.role === 'USER').length;
    return { total, admins, managers, users };
  }, [employees]);

  // Form input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  // Submit create employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      setFormError('Full name must be at least 2 characters.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setFormSubmitting(true);
    try {
      const response = await employeeService.createEmployee(formData);
      if (response.success) {
        setSuccessMessage(`Employee ${response.data.fullName} created successfully!`);
        setIsAddModalOpen(false);
        setFormData({ fullName: '', email: '', password: '', role: 'USER' });
        fetchEmployees();

        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create employee. Email may already be registered.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

    setDeletingId(id);
    try {
      const response = await employeeService.deleteEmployee(id);
      if (response.success) {
        setSuccessMessage(`Employee ${name} removed successfully.`);
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete employee.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="employee-management-page">
      {/* Page Header */}
      <div className="admin-dashboard-header" style={{ marginBottom: '24px' }}>
        <div className="admin-header-title-group">
          <div className="admin-badge-row">
            <span className="admin-badge">
              <ShieldCheck size={14} /> ADMIN WORKSPACE
            </span>
          </div>
          <h1 className="admin-title">Employee Management</h1>
          <p className="admin-subtitle">
            Directly manage staff access, create employee credentials stored in the DB, and assign organizational roles.
          </p>
        </div>

        <button
          className="add-employee-btn"
          onClick={() => {
            setIsAddModalOpen(true);
            setFormError(null);
          }}
        >
          <UserPlus size={18} />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Alert Notifications */}
      {successMessage && (
        <div className="employee-toast success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="employee-toast error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Header Cards */}
      <div className="employee-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-bg total">
            <Users size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Employees</span>
            <span className="metric-value">{metrics.total}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-bg admin">
            <ShieldCheck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Administrators</span>
            <span className="metric-value">{metrics.admins}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-bg manager">
            <Briefcase size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Managers</span>
            <span className="metric-value">{metrics.managers}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-bg user">
            <UserCheck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Standard Staff</span>
            <span className="metric-value">{metrics.users}</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="employee-toolbar">
        <form onSubmit={handleSearchSubmit} className="employee-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search"
              onClick={() => {
                setSearchQuery('');
                fetchEmployees();
              }}
            >
              <X size={14} />
            </button>
          )}
        </form>

        <div className="employee-toolbar-actions">
          <div className="role-filter-group">
            <label>Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="role-select-input"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="USER">User / Staff</option>
            </select>
          </div>

          <button
            className="icon-action-btn"
            onClick={fetchEmployees}
            title="Refresh List"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Employee Data Table */}
      <div className="employee-table-container">
        {loading ? (
          <div className="employee-loading-state">
            <RefreshCw size={28} className="spinning" />
            <p>Fetching employee records from database...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="employee-empty-state">
            <Users size={48} className="empty-icon" />
            <h3>No Employees Found</h3>
            <p>
              {searchQuery || roleFilter !== 'ALL'
                ? 'No staff members match the current search or filter criteria.'
                : 'No employees in database yet. Click "Add New Employee" above to create one.'}
            </p>
          </div>
        ) : (
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const initials = emp.fullName
                  ? emp.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'EM';

                return (
                  <tr key={emp.id}>
                    <td>
                      <div className="employee-cell-user">
                        <div className={`user-avatar-badge ${emp.role.toLowerCase()}`}>
                          {initials}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{emp.fullName}</span>
                          <span className="user-id">ID: {emp.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="user-email-text">{emp.email}</span>
                    </td>
                    <td>
                      <span className={`role-pill ${emp.role.toLowerCase()}`}>
                        {emp.role === 'ADMIN' && <ShieldCheck size={12} />}
                        {emp.role === 'MANAGER' && <Briefcase size={12} />}
                        {emp.role === 'USER' && <UserCheck size={12} />}
                        {emp.role}
                      </span>
                    </td>
                    <td>
                      <span className="joined-date">
                        {new Date(emp.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="delete-employee-btn"
                        onClick={() => handleDeleteEmployee(emp.id, emp.fullName)}
                        disabled={deletingId === emp.id}
                        title="Remove Employee"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add New Employee Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <UserPlus size={20} className="modal-icon" />
                <h2>Create New Employee</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="modal-form">
              {formError && (
                <div className="modal-form-error">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Full Name *</label>
                <div className="input-with-icon">
                  <UserIcon size={16} className="field-icon" />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <div className="input-with-icon">
                  <Mail size={16} className="field-icon" />
                  <input
                    type="email"
                    name="email"
                    placeholder="rahul@tanejapower.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Organizational Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="role-select-modal"
                >
                  <option value="USER">User / Staff (Standard access)</option>
                  <option value="MANAGER">Manager (Product management access)</option>
                  <option value="ADMIN">Admin (Full system & user access)</option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={formSubmitting}>
                  {formSubmitting ? (
                    <>
                      <RefreshCw size={16} className="spinning" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Create Employee</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagementPage;
