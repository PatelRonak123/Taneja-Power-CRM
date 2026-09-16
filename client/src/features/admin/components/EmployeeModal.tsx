import React from 'react';
import {
  Users,
  Briefcase,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { EmployeeRole, EmployeeStatus } from '../types/employee.types';

interface EmployeeModalProps {
  modalMode: 'create' | 'edit' | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    fullName: string;
    email: string;
    password?: string;
    role: EmployeeRole;
    phone: string;
    designation: string;
    status: EmployeeStatus;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  formSubmitting: boolean;
  formError: string | null;
  showPassword: boolean;
  onToggleShowPassword: () => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  modalMode,
  onClose,
  onSubmit,
  formData,
  onInputChange,
  formSubmitting,
  formError,
  showPassword,
  onToggleShowPassword,
}) => {
  if (!modalMode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/75">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {modalMode === 'create' ? 'Register New Staff Member' : 'Edit Employee Profile'}
              </h2>
              <p className="text-xs text-slate-500">
                {modalMode === 'create' ? 'Fill out the information below to add an employee.' : 'Update the employee credentials and access roles.'}
              </p>
            </div>
          </div>
          <button
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Full Legal Name *</label>
                <div className="relative flex items-center">
                  <UserIcon size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="e.g. Vikramaditya Sharma"
                    value={formData.fullName}
                    onChange={onInputChange}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Work Email Address *</label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g. v.sharma@tanejapower.com"
                    value={formData.email}
                    onChange={onInputChange}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password (Only if creating) */}
              {modalMode === 'create' && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Initial Account Password *</label>
                  <div className="relative flex items-center">
                    <Lock size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Min 6 characters (e.g. Pass@123456)"
                      value={formData.password || ''}
                      onChange={onInputChange}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      onClick={onToggleShowPassword}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* System Access Role */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">System Access Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={onInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="USER">USER (Field Staff / Standard)</option>
                  <option value="MANAGER">MANAGER (Operations & Inventory)</option>
                  <option value="ADMIN">ADMIN (Full Control & User Management)</option>
                </select>
              </div>

              {/* Account Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Account Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={onInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE (Authorized to log in)</option>
                  <option value="INACTIVE">INACTIVE (Access Suspended)</option>
                </select>
              </div>

              {/* Job Designation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Job Designation</label>
                <div className="relative flex items-center">
                  <Briefcase size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="designation"
                    placeholder="e.g. Lead Electrical Field Engineer"
                    value={formData.designation}
                    onChange={onInputChange}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Contact Phone Number</label>
                <div className="relative flex items-center">
                  <Phone size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="phone"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={onInputChange}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              onClick={onClose}
              disabled={formSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              disabled={formSubmitting}
            >
              {formSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Saving to DB...</span>
                </>
              ) : modalMode === 'create' ? (
                <>
                  <Plus size={16} />
                  <span>Register Employee</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
