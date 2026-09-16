import React from 'react';
import {
  MapPin,
  X,
  AlertCircle,
  Phone,
  User as UserIcon,
  Navigation,
} from 'lucide-react';
import { DestinationStatus } from '../types/customer.types';

interface DestinationModalProps {
  modalMode: 'create' | 'edit' | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: string;
    longitude: string;
    contactPerson: string;
    contactPhone: string;
    notes: string;
    status: DestinationStatus;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  formSubmitting: boolean;
  formError: string | null;
}

export const DestinationModal: React.FC<DestinationModalProps> = ({
  modalMode,
  isOpen,
  onClose,
  onSubmit,
  formData,
  onInputChange,
  formSubmitting,
  formError,
}) => {
  if (!isOpen || !modalMode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {modalMode === 'create' ? 'Register Destination Site' : 'Edit Destination Site'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure facility location, site contact, and GPS coordinates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="p-6 overflow-y-auto space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Destination / Facility Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onInputChange}
                  required
                  placeholder="e.g. Turbine Unit 4 - Sanand Plant"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Facility Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={onInputChange}
                placeholder="e.g. Gate 2, Plot 100, Sector 5"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
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
                placeholder="e.g. Ahmedabad"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
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
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
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
                placeholder="e.g. 382110"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Site Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={onInputChange}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* Latitude */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Latitude (GPS Coordinate)
              </label>
              <div className="relative">
                <Navigation size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={onInputChange}
                  placeholder="e.g. 23.022505"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Longitude (GPS Coordinate)
              </label>
              <div className="relative">
                <Navigation size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={onInputChange}
                  placeholder="e.g. 72.571362"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Site Contact Person</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={onInputChange}
                  placeholder="e.g. Site In-charge"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Site Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={onInputChange}
                  placeholder="e.g. +91 98980 12345"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Location Access Notes</label>
              <textarea
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={onInputChange}
                placeholder="Safety instructions, security gate pass requirements..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {formSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{modalMode === 'create' ? 'Add Site' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
