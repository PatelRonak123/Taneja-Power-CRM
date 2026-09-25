import React from 'react';
import {
  Building2,
  AlertCircle,
  Mail,
  Phone,
  User as UserIcon,
} from 'lucide-react';
import { CustomerStatus } from '../types/customer.types';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';

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

  const title = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
        <Building2 size={16} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900 leading-snug">
          {modalMode === 'create' ? 'Add New Customer' : 'Edit Customer Details'}
        </h3>
        <p className="text-xs text-slate-500 font-normal">
          {modalMode === 'create' ? 'Register enterprise client and contact details' : 'Update client information and settings'}
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
        {modalMode === 'create' ? 'Create Customer' : 'Save Changes'}
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
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Contact Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Primary Contact Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onInputChange}
                required
                placeholder="e.g. Rajesh Sharma"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Company / Enterprise Name
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={onInputChange}
                placeholder="e.g. ABC Heavy Engineering Pvt Ltd"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={onInputChange}
                placeholder="e.g. +91 98250 12345"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors tabular-nums"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onInputChange}
                placeholder="e.g. contact@abchv.com"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={onInputChange}
              placeholder="e.g. Plot 45, GIDC Industrial Estate"
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={onInputChange}
              placeholder="e.g. Vadodara"
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={onInputChange}
              placeholder="e.g. Gujarat"
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Pincode</label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={onInputChange}
              placeholder="e.g. 390010"
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors tabular-nums"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Account Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={onInputChange}
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Internal Notes</label>
            <textarea
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={onInputChange}
              placeholder="Key technical requirements, billing references..."
              className="w-full p-2.5 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors resize-none"
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
};
