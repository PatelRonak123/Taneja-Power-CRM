import React from 'react';
import {
  Users,
  Briefcase,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Building,
  Smartphone,
  Plus,
  Trash2,
} from 'lucide-react';
import { EmployeeRole, EmployeeStatus, WorkType } from '../types/employee.types';
import { useAuthStore } from '../../../stores/authStore';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';

interface EmployeeModalProps {
  modalMode: 'create' | 'edit' | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    fullName: string;
    email: string;
    emails?: string[];
    password?: string;
    role: EmployeeRole;
    workType: WorkType;
    phone: string;
    phones?: string[];
    designation: string;
    status: EmployeeStatus;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onWorkTypeChange: (newWorkType: WorkType) => void;
  onEmailChange: (index: number, value: string) => void;
  onAddEmail: () => void;
  onRemoveEmail: (index: number) => void;
  onPhoneChange: (index: number, value: string) => void;
  onAddPhone: () => void;
  onRemovePhone: (index: number) => void;
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
  onEmailChange,
  onAddEmail,
  onRemoveEmail,
  onPhoneChange,
  onAddPhone,
  onRemovePhone,
  formSubmitting,
  formError,
  showPassword,
  onToggleShowPassword,
}) => {
  const { user: currentUser } = useAuthStore();
  const designationLower = (currentUser?.designation || '').toLowerCase();
  const isHrUser =
    (currentUser?.role === 'USER' || (currentUser as any)?.role === 'HR') &&
    (designationLower.includes('hr') || designationLower.includes('human resources'));

  if (!modalMode) return null;

  const emails = formData.emails && formData.emails.length > 0 ? formData.emails : [formData.email || ''];
  const phones = formData.phones && formData.phones.length > 0 ? formData.phones : [formData.phone || ''];

  const title = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
        <Users size={16} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900 leading-snug">
          {modalMode === 'create' ? 'Register New Staff Member' : 'Edit Employee Profile'}
        </h3>
        <p className="text-xs text-slate-500 font-normal">
          {modalMode === 'create' ? 'Fill out credentials and assign role' : 'Update credentials, work type, and role'}
        </p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button
        variant="outline"
        size="md"
        onClick={onClose}
        disabled={formSubmitting}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        size="md"
        type="submit"
        isLoading={formSubmitting}
        onClick={onSubmit}
      >
        {modalMode === 'create' ? 'Register Employee' : 'Save Changes'}
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen={Boolean(modalMode)}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={footer}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {/* Work Type Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-700">
            Work Type (Application Access) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onWorkTypeChange('OFFICE')}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                formData.workType === 'OFFICE'
                  ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/20 text-blue-950'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`p-1.5 rounded-md ${formData.workType === 'OFFICE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Building size={15} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  Office
                  {formData.workType === 'OFFICE' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Web ERP Portal access</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onWorkTypeChange('FIELD')}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                formData.workType === 'FIELD'
                  ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/20 text-emerald-950'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`p-1.5 rounded-md ${formData.workType === 'FIELD' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Smartphone size={15} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  Field
                  {formData.workType === 'FIELD' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Field Mobile App access</div>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="fullName"
                placeholder="e.g. Vikramaditya Sharma"
                value={formData.fullName}
                onChange={onInputChange}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                required
              />
            </div>
          </div>

          {/* Work Email Address(es) */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                Work Email Address <span className="text-rose-500">*</span>
                {emails.length > 1 && (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {emails.length} emails
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={onAddEmail}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                title="Add another work email address"
              >
                <Plus size={12} className="stroke-[2.5]" />
                <span>Add Email</span>
              </button>
            </div>

            <div className="space-y-2">
              {emails.map((emailVal, idx) => (
                <div key={`email-row-${idx}`} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={emailVal}
                      onChange={(e) => onEmailChange(idx, e.target.value)}
                      placeholder={idx === 0 ? "e.g. v.sharma@tanejapower.com" : `Additional email #${idx + 1}`}
                      className="w-full h-9 pl-9 pr-18 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                      required={idx === 0}
                    />
                    {idx === 0 ? (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200/70 px-1.5 py-0.5 rounded select-none">
                        Primary
                      </span>
                    ) : (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 select-none">
                        #{idx + 1}
                      </span>
                    )}
                  </div>
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => onRemoveEmail(idx)}
                      className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                      title="Remove this email"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Phone Number(s) */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                Contact Phone Number
                {phones.length > 1 && (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {phones.length} phones
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={onAddPhone}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                title="Add another phone number"
              >
                <Plus size={12} className="stroke-[2.5]" />
                <span>Add Phone</span>
              </button>
            </div>

            <div className="space-y-2">
              {phones.map((phoneVal, idx) => (
                <div key={`phone-row-${idx}`} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={phoneVal}
                      onChange={(e) => onPhoneChange(idx, e.target.value)}
                      placeholder={idx === 0 ? "e.g. +91 98765 43210" : `Additional phone #${idx + 1}`}
                      className="w-full h-9 pl-9 pr-18 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors tabular-nums"
                    />
                    {idx === 0 ? (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded select-none">
                        Primary
                      </span>
                    ) : (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 select-none">
                        #{idx + 1}
                      </span>
                    )}
                  </div>
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => onRemovePhone(idx)}
                      className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                      title="Remove this phone"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Password (Only if creating) */}
          {modalMode === 'create' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Initial Account Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Min 6 characters (e.g. Pass@123456)"
                  value={formData.password || ''}
                  onChange={onInputChange}
                  className="w-full h-9 pl-9 pr-9 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  onClick={onToggleShowPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* System Access Role */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">
                System Access Role <span className="text-rose-500">*</span>
              </label>
              {isHrUser && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                  HR: USER only
                </span>
              )}
            </div>
            <select
              name="role"
              value={formData.role}
              onChange={onInputChange}
              disabled={isHrUser}
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="USER">USER (Standard Employee)</option>
              {!isHrUser && <option value="MANAGER">MANAGER (Operations & Inventory)</option>}
              {!isHrUser && <option value="ADMIN">ADMIN (Full Control & User Management)</option>}
            </select>
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Account Status <span className="text-rose-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={onInputChange}
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="ACTIVE">ACTIVE (Authorized to log in)</option>
              <option value="INACTIVE">INACTIVE (Access Suspended)</option>
            </select>
          </div>

          {/* Dependent Job Designation Selector */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Designation ({formData.workType === 'OFFICE' ? 'Office Department' : 'Field Role'}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                name="designation"
                value={formData.designation}
                onChange={onInputChange}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-slate-200 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
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
        </div>
      </form>
    </Drawer>
  );
};
