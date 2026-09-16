import React from 'react';
import {
  Building2,
  MapPin,
  RefreshCw,
  Phone,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Customer } from '../types/customer.types';

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  deletingCustomerId: string | null;
  onOpenDestinations: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onOpenCreate: () => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  loading,
  searchQuery,
  statusFilter,
  deletingCustomerId,
  onOpenDestinations,
  onEditCustomer,
  onDeleteCustomer,
  page,
  limit,
  totalPages,
  totalCount,
  onPageChange,
  onOpenCreate,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
          <RefreshCw size={32} className="animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Fetching customer records from database...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400">
            <Building2 size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Customers Found</h3>
          <p className="text-xs text-slate-500 max-w-md">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No client accounts match the current search or filter criteria.'
              : 'No customers registered yet. Click "Add New Customer" above to create one.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <button
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>Add First Customer</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6 min-w-60">Customer & Company</th>
                  <th className="py-3.5 px-4 min-w-45">Contact Details</th>
                  <th className="py-3.5 px-4 min-w-40">Primary Location</th>
                  <th className="py-3.5 px-4 min-w-32.5">Service Destinations</th>
                  <th className="py-3.5 px-4 min-w-30">Status</th>
                  <th className="py-3.5 px-4 min-w-32.5">Registered Date</th>
                  <th className="py-3.5 px-6 text-right min-w-30">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {customers.map((cust) => {
                  const initials = cust.name
                    ? cust.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'CU';

                  return (
                    <tr key={cust.id} className="hover:bg-blue-50/20 transition-colors">
                      {/* Customer & Company */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{cust.name}</span>
                            <span className="text-xs text-slate-500 font-medium">
                              {cust.companyName || 'Individual Client'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          {cust.phone ? (
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              <span>{cust.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No phone</span>
                          )}
                          {cust.email && <span className="text-slate-500 text-xs">{cust.email}</span>}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        {cust.city || cust.state ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800 text-xs">
                              {[cust.city, cust.state].filter(Boolean).join(', ')}
                            </span>
                            {cust.pincode && (
                              <span className="text-[11px] text-slate-400">PIN: {cust.pincode}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>

                      {/* Destinations count */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => onOpenDestinations(cust)}
                          title="Click to view/manage customer destinations"
                        >
                          <MapPin size={11} />
                          <span>
                            {cust.destinationCount || 0}{' '}
                            {cust.destinationCount === 1 ? 'Site' : 'Sites'}
                          </span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            cust.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cust.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {cust.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                        {new Date(cust.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer shadow-2xs"
                            onClick={() => onEditCustomer(cust)}
                            title="Edit Customer"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shadow-2xs"
                            onClick={() => onDeleteCustomer(cust)}
                            title="Delete Customer"
                            disabled={deletingCustomerId === cust.id}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-black text-slate-900">{totalCount}</span> customers
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 font-bold text-slate-900">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

