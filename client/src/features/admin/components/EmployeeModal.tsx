import React from 'react';
import { createPortal } from 'react-dom';
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
  Building,
  Smartphone,
} from 'lucide-react';
import { EmployeeRole, EmployeeStatus, WorkType } from '../types/employee.types';

interface EmployeeModalProps {
  modalMode: 'create' | 'edit' | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    fullName: string;
    email: string;
    password?: string;
    role: EmployeeRole;
    workType: WorkType;
    phone: string;
    designation: string;
    status: EmployeeStatus;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onWorkTypeChange: (newWorkType: WorkType) => void;
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
  onWorkTypeChange,
  formSubmitting,
  formError,
  showPassword,
  onToggleShowPassword,
}) => {
  if (!modalMode) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
        <div
          className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === 'create' ? 'Register New Staff Member' : 'Edit Employee Profile'}
                </h2>
                <p className="text-xs text-slate-500">
                  {modalMode === 'create' ? 'Fill out the information below to add an employee.' : 'Update the employee credentials, work type, and roles.'}
                </p>
              </div>
            </div>
            <button
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
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

              {/* Work Type Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Work Type (Application Access) *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onWorkTypeChange('OFFICE')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.workType === 'OFFICE'
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${formData.workType === 'OFFICE' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Building size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Office
                        {formData.workType === 'OFFICE' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Web CRM Portal access</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onWorkTypeChange('FIELD')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.workType === 'FIELD'
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${formData.workType === 'FIELD' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Smartphone size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Field
                        {formData.workType === 'FIELD' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Field Mobile App access</div>
                    </div>
                  </button>
                </div>
              </div>

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
                    <option value="USER">USER (Standard Employee)</option>
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

                {/* Dependent Job Designation Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Designation ({formData.workType === 'OFFICE' ? 'Office Department' : 'Field Role'}) *
                  </label>
                  <div className="relative flex items-center">
                    <Briefcase size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <select
                      name="designation"
                      value={formData.designation}
                      onChange={onInputChange}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                      required
                    >
                      <option value="" disabled>Select valid designation</option>
                      {formData.workType === 'OFFICE' ? (
                        <>
                          <option value="Sales Office">Sales Office</option>
                          <option value="HR Office">HR Office</option>
                          <option value="Accountant Office">Accountant Office</option>
                          <option value="Service Office">Service Office</option>
                          {(formData.role === 'ADMIN' || formData.role === 'MANAGER') && (
                            <>
                              <option value="Head of Operations">Head of Operations</option>
                              <option value="Inventory & Operations Manager">Inventory & Operations Manager</option>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <option value="Sales">Sales</option>
                          <option value="Service">Service</option>
                        </>
                      )}
                    </select>
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
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 sticky bottom-0">
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
    </div>,
    document.body
  );
};
