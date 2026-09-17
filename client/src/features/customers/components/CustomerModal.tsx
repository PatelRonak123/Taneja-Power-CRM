import React from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  X,
  AlertCircle,
  Mail,
  Phone,
  User as UserIcon,
} from 'lucide-react';
import { CustomerStatus } from '../types/customer.types';

interface CustomerModalProps {
  modalMode: 'create' | 'edit' | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    companyName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    notes: string;
    status: CustomerStatus;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  formSubmitting: boolean;
  formError: string | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  modalMode,
  onClose,
  onSubmit,
  formData,
  onInputChange,
  formSubmitting,
  formError,
}) => {
  if (!modalMode) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      {/* Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-Over Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
        <div
          className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {modalMode === 'create' ? 'Add New Customer' : 'Edit Customer Details'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register enterprise client details and primary contact information
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-6 space-y-4 flex-1">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Primary Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={onInputChange}
                      required
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Company / Enterprise Name
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={onInputChange}
                      placeholder="e.g. ABC Heavy Engineering Pvt Ltd"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={onInputChange}
                      placeholder="e.g. +91 98250 12345"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={onInputChange}
                      placeholder="e.g. contact@abchv.com"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={onInputChange}
                    placeholder="e.g. Plot 45, GIDC Industrial Estate"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={onInputChange}
                    placeholder="e.g. Vadodara"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={onInputChange}
                    placeholder="e.g. Gujarat"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={onInputChange}
                    placeholder="e.g. 390010"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={onInputChange}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Internal Notes</label>
                  <textarea
                    name="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={onInputChange}
                    placeholder="Key technical requirements, billing references..."
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={onClose}
                disabled={formSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {formSubmitting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{modalMode === 'create' ? 'Create Customer' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};
