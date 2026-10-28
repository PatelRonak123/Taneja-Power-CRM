import React from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Edit2,
  Trash2,
  Plus,
  CalendarClock,
  Cpu,
} from 'lucide-react';
import { Customer } from '../types/customer.types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
  TableEmptyState,
  TableLoadingState,
} from '../../../components/ui/table';
import { StatusPill } from '../../../components/ui/StatusPill';
import { Button } from '../../../components/ui/Button';

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  deletingCustomerId: string | null;
  onOpenDestinations: (customer: Customer) => void;
  onOpenFollowUps?: (customer: Customer) => void;
  onOpenEquipment?: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onOpenCreate: () => void;
  isAdmin?: boolean;
  isAccountant?: boolean;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  loading,
  searchQuery,
  statusFilter,
  deletingCustomerId,
  onOpenDestinations,
  onOpenFollowUps,
  onOpenEquipment,
  onEditCustomer,
  onDeleteCustomer,
  page,
  limit,
  totalPages,
  totalCount,
  onPageChange,
  onOpenCreate,
  isAdmin = false,
  isAccountant = false,
}) => {
  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <Table density="standard">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-60">Customer & Company</TableHead>
              <TableHead className="min-w-45">Contact Details</TableHead>
              <TableHead className="min-w-40">Primary Location</TableHead>
              <TableHead className="min-w-32.5">Service Destinations</TableHead>
              <TableHead className="min-w-30">Status</TableHead>
              <TableHead className="min-w-32.5">Registered Date</TableHead>
              <TableHead align="right" className="min-w-30">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingState columns={7} rows={6} />
            ) : customers.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={<Building2 size={24} />}
                title="No Customers Found"
                description={
                  searchQuery || statusFilter !== 'ALL'
                    ? 'No client accounts match the current search or filter criteria.'
                    : 'No customers registered yet. Click "Add New Customer" above to create one.'
                }
                action={
                  !searchQuery && statusFilter === 'ALL' && !isAccountant ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      onClick={onOpenCreate}
                    >
                      Add First Customer
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              customers.map((cust) => {
                const initials = cust.name
                  ? cust.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'CU';

                return (
                  <TableRow key={cust.id}>
                    {/* Customer & Company */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 text-[13px] truncate">{cust.name}</span>
                          <span className="text-xs text-slate-500 font-normal truncate">
                            {cust.companyName || 'Individual Client'}
                          </span>
                          {cust.createdBy && (
                            <span className="text-[11px] text-slate-400 font-normal truncate">
                              By: {cust.createdBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                            <Phone size={11} className="text-slate-400 shrink-0" />
                            <span className="tabular-nums">{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No phone</span>
                        )}
                        {cust.email && <span className="text-slate-500 text-xs truncate">{cust.email}</span>}
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      {cust.city || cust.state ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 text-xs">
                            {[cust.city, cust.state].filter(Boolean).join(', ')}
                          </span>
                          {cust.pincode && (
                            <span className="text-[11px] text-slate-400 tabular-nums">PIN: {cust.pincode}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">—</span>
                      )}
                    </TableCell>

                    {/* Destinations count */}
                    <TableCell>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70 hover:bg-indigo-100 transition-colors cursor-pointer"
                        onClick={() => onOpenDestinations(cust)}
                        title="Click to view/manage customer destinations"
                      >
                        <MapPin size={11} />
                        <span className="tabular-nums">
                          {cust.destinationCount || 0}{' '}
                          {cust.destinationCount === 1 ? 'Site' : 'Sites'}
                        </span>
                      </button>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusPill
                        variant={cust.status === 'ACTIVE' ? 'success' : 'neutral'}
                        size="xs"
                        dot
                        dotPulse={cust.status === 'ACTIVE'}
                      >
                        {cust.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </StatusPill>
                    </TableCell>

                    {/* Registered Date */}
                    <TableCell className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(cust.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onOpenEquipment && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
                            onClick={() => onOpenEquipment(cust)}
                            title="Installed Equipment & Assets"
                            aria-label={`Equipment for ${cust.name}`}
                          >
                            <Cpu size={13} />
                          </button>
                        )}

                        {onOpenFollowUps && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-indigo-600"
                            onClick={() => onOpenFollowUps(cust)}
                            title="Customer Follow-ups & Reminders"
                            aria-label={`Follow-ups for ${cust.name}`}
                          >
                            <CalendarClock size={13} />
                          </button>
                        )}

                        {!isAccountant && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
                            onClick={() => onEditCustomer(cust)}
                            title="Edit Customer"
                            aria-label={`Edit ${cust.name}`}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shadow-2xs focus-visible:outline-2 focus-visible:outline-rose-600"
                            onClick={() => onDeleteCustomer(cust)}
                            title="Delete Customer"
                            aria-label={`Delete ${cust.name}`}
                            disabled={deletingCustomerId === cust.id}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && customers.length > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={onPageChange}
          entityName="customers"
        />
      )}
    </div>
  );
};
