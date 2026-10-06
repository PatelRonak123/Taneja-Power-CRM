import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Calendar,
  ExternalLink,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Package,
} from 'lucide-react';
import { Customer } from '../types/customer.types';
import { customerEquipmentService } from '../../customer-equipment/services/customerEquipmentService';
import type { CustomerEquipment } from '../../customer-equipment/types/customer-equipment.types';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { navigate } from '../../../app/router/navigation';

interface CustomerEquipmentDrawerProps {
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerEquipmentDrawer: React.FC<CustomerEquipmentDrawerProps> = ({
  customer,
  onClose,
}) => {
  const [equipmentList, setEquipmentList] = useState<CustomerEquipment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer?.id) {
      loadCustomerEquipment(customer.id);
    } else {
      setEquipmentList([]);
    }
  }, [customer?.id]);

  const loadCustomerEquipment = async (customerId: string) => {
    try {
      setLoading(true);
      const items = await customerEquipmentService.getEquipmentByCustomer(customerId);
      setEquipmentList(items);
    } catch {
      setEquipmentList([]);
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  const title = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
        <Cpu size={16} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900 leading-snug">Installed Equipment & Assets</h3>
        <p className="text-xs text-slate-500 font-normal">{customer.companyName || customer.name}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between w-full">
      <span className="text-xs text-slate-500 font-medium">
        Total Owned Assets: {equipmentList.length}
      </span>
      <Button variant="outline" size="md" onClick={onClose}>
        Close
      </Button>
    </div>
  );

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} />
            Operational
          </span>
        );
      case 'NEEDS_REPAIR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle size={11} />
            Needs Repair
          </span>
        );
      case 'FAULTY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={11} />
            Faulty
          </span>
        );
      case 'REPAIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Wrench size={11} />
            Repaired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            {condition}
          </span>
        );
    }
  };

  return (
    <Drawer
      isOpen={Boolean(customer)}
      onClose={onClose}
      title={title}
      maxWidth="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            Loading customer installed assets...
          </div>
        ) : equipmentList.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Package size={36} className="mx-auto mb-2 text-slate-400" />
            <p className="font-medium text-slate-700">No Installed Assets</p>
            <p className="text-xs text-slate-400 mt-1">
              Customer does not have any physical equipment records created from dispatches yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {equipmentList.map((eq) => (
              <div
                key={eq.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {eq.assetNumber}
                    </span>
                    {getConditionBadge(eq.conditionStatus)}
                    {eq.serialNumber && (
                      <span className="text-xs text-slate-500 font-mono">
                        SN: {eq.serialNumber}
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-slate-800">
                    {eq.productName}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    {eq.model && <span>Model: {eq.model}</span>}
                    {eq.capacityRating && <span>Capacity: {eq.capacityRating}</span>}
                    {eq.installationLocation && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {eq.installationLocation}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" />
                      Delivered {eq.deliveryDate ? new Date(eq.deliveryDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ExternalLink size={13} />}
                    onClick={() => {
                      onClose();
                      navigate(`/customer-equipment/${eq.id}`);
                    }}
                  >
                    View Asset
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
