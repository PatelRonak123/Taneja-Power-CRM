import React from 'react';
import {
  MapPin,
  Layers,
  Plus,
  RefreshCw,
  Navigation,
  User as UserIcon,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Customer, CustomerDestination } from '../types/customer.types';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { StatusPill } from '../../../components/ui/StatusPill';

interface DestinationsDrawerProps {
  customer: Customer | null;
  destinations: CustomerDestination[];
  loading: boolean;
  onClose: () => void;
  onAddDestination: () => void;
  onEditDestination: (destination: CustomerDestination) => void;
  onDeleteDestination: (destination: CustomerDestination) => void;
  deletingDestinationId: string | null;
  canManage?: boolean;
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
  canManage = true,
}) => {
  if (!customer) return null;

  const title = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
        <MapPin size={16} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900 leading-snug">Customer Destinations & Facilities</h3>
        <p className="text-xs text-slate-500 font-normal">{customer.companyName || customer.name}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end w-full">
      <Button variant="outline" size="md" onClick={onClose}>
        Close
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen={Boolean(customer)}
      onClose={onClose}
      title={title}
      maxWidth="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Toolbar in Drawer */}
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Layers size={14} className="text-indigo-600" />
            <span>
              {destinations.length} Registered Destination{destinations.length === 1 ? '' : 's'}
            </span>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={onAddDestination}
            >
              Add Facility / Site
            </Button>
          )}
        </div>

        {/* Destinations List Body */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-center">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <p className="text-xs font-medium text-slate-500">Loading registered sites...</p>
          </div>
        ) : destinations.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center gap-2.5 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
              <MapPin size={20} />
            </div>
            <h4 className="text-[13px] font-semibold text-slate-900">No Destination Sites Registered</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Add factory locations, corporate offices, or field facilities to track work orders and GPS coordinates.
            </p>
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={onAddDestination}
                className="mt-1"
              >
                Register First Site
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {destinations.map((dest) => (
              <div
                key={dest.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-indigo-300 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <MapPin size={13} />
                      </div>
                      <h5 className="font-semibold text-slate-900 text-[13px]">{dest.name}</h5>
                    </div>
                    <StatusPill
                      variant={dest.status === 'ACTIVE' ? 'success' : 'neutral'}
                      size="xs"
                    >
                      {dest.status}
                    </StatusPill>
                  </div>

                  {dest.address && <p className="text-xs text-slate-600">{dest.address}</p>}

                  {(dest.city || dest.state) && (
                    <p className="text-[11px] text-slate-500">
                      {[dest.city, dest.state, dest.pincode].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {dest.contactPerson && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-0.5">
                      <UserIcon size={12} className="text-slate-400 shrink-0" />
                      <span>
                        {dest.contactPerson} {dest.contactPhone ? `(${dest.contactPhone})` : ''}
                      </span>
                    </div>
                  )}

                  {dest.latitude && dest.longitude && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                      <Navigation size={12} className="text-indigo-500 shrink-0" />
                      <span>
                        {dest.latitude}, {dest.longitude}
                      </span>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditDestination(dest)}
                      className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                      title="Edit Site"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDestination(dest)}
                      disabled={deletingDestinationId === dest.id}
                      className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-35 shadow-2xs"
                      title="Delete Site"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
