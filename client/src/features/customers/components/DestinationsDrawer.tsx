import React from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin,
  X,
  Layers,
  Plus,
  RefreshCw,
  Navigation,
  User as UserIcon,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Customer, CustomerDestination } from '../types/customer.types';

interface DestinationsDrawerProps {
  customer: Customer | null;
  destinations: CustomerDestination[];
  loading: boolean;
  onClose: () => void;
  onAddDestination: () => void;
  onEditDestination: (destination: CustomerDestination) => void;
  onDeleteDestination: (destination: CustomerDestination) => void;
  deletingDestinationId: string | null;
}

export const DestinationsDrawer: React.FC<DestinationsDrawerProps> = ({
  customer,
  destinations,
  loading,
  onClose,
  onAddDestination,
  onEditDestination,
  onDeleteDestination,
  deletingDestinationId,
}) => {
  if (!customer) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
        <div
          className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Customer Destinations & Facilities</h2>
                <p className="text-xs text-slate-500 mt-0.5">{customer.companyName || customer.name}</p>
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

          {/* Toolbar in Drawer */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Layers size={15} className="text-indigo-600" />
              <span>
                {destinations.length} Registered Destination{destinations.length === 1 ? '' : 's'}
              </span>
            </div>

            <button
              onClick={onAddDestination}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Facility / Site</span>
            </button>
          </div>

          {/* Destinations List Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                <RefreshCw size={28} className="animate-spin text-indigo-600" />
                <p className="text-xs font-semibold text-slate-500">Loading registered sites...</p>
              </div>
            ) : destinations.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <MapPin size={36} className="text-slate-300" />
                <h3 className="text-sm font-extrabold text-slate-900">No Destination Sites Registered</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Add factory locations, corporate offices, or field facilities to track work orders and configure GPS coordinates.
                </p>
                <button
                  onClick={onAddDestination}
                  className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Register First Site</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {destinations.map((dest) => (
                  <div
                    key={dest.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <MapPin size={14} />
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{dest.name}</h4>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dest.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {dest.status}
                        </span>
                      </div>

                      {dest.address && <p className="text-xs text-slate-600">{dest.address}</p>}

                      {(dest.city || dest.state) && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          {[dest.city, dest.state, dest.pincode].filter(Boolean).join(', ')}
                        </p>
                      )}

                      {dest.contactPerson && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1">
                          <UserIcon size={12} className="text-slate-400 shrink-0" />
                          <span>
                            {dest.contactPerson} {dest.contactPhone ? `(${dest.contactPhone})` : ''}
                          </span>
                        </div>
                      )}

                      {dest.latitude && dest.longitude && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Navigation size={12} className="text-indigo-500 shrink-0" />
                          <span>
                            {dest.latitude}, {dest.longitude}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEditDestination(dest)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer"
                        title="Edit Site"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteDestination(dest)}
                        disabled={deletingDestinationId === dest.id}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 transition-all cursor-pointer disabled:opacity-35"
                        title="Delete Site"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/70 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
