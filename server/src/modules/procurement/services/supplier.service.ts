import { SupplierRepository, ListSuppliersQuery } from '../repositories/supplier.repository.js';
import { ProcurementNumberService } from './procurement-number.service.js';
import { SupplierEntity, NewSupplierEntity } from '../../../database/schema/procurement.js';
import { AppError } from '../../../common/errors/AppError.js';
import { SUPPLIER_STATUSES } from '../../../config/constants.js';

export class SupplierService {
  constructor(
    private readonly supplierRepo: SupplierRepository = new SupplierRepository(),
    private readonly numberService: ProcurementNumberService = new ProcurementNumberService()
  ) {}

  async createSupplier(data: {
    supplierCode?: string;
    name: string;
    legalName?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gstin?: string | null;
    pan?: string | null;
    paymentTerms?: string | null;
    notes?: string | null;
    status?: string;
  }): Promise<SupplierEntity> {
    let code = data.supplierCode?.trim();
    if (!code) {
      code = await this.numberService.generateNumber('SUP');
    } else {
      const existing = await this.supplierRepo.findByCode(code);
      if (existing) {
        throw AppError.conflict(`Supplier code "${code}" already exists`, 'DUPLICATE_SUPPLIER_CODE');
      }
    }

    const newSupplier: NewSupplierEntity = {
      supplierCode: code,
      name: data.name.trim(),
      legalName: data.legalName?.trim() || null,
      contactPerson: data.contactPerson?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      pincode: data.pincode?.trim() || null,
      gstin: data.gstin?.trim() || null,
      pan: data.pan?.trim() || null,
      paymentTerms: data.paymentTerms?.trim() || null,
      notes: data.notes?.trim() || null,
      status: data.status || SUPPLIER_STATUSES.ACTIVE,
    };

    return this.supplierRepo.create(newSupplier);
  }

  async getSupplierById(id: string): Promise<SupplierEntity> {
    const supplier = await this.supplierRepo.findById(id);
    if (!supplier) {
      throw AppError.notFound(`Supplier with ID "${id}" was not found`, 'SUPPLIER_NOT_FOUND');
    }
    return supplier;
  }

  async listSuppliers(query: ListSuppliersQuery): Promise<{ data: SupplierEntity[]; total: number }> {
    return this.supplierRepo.find(query);
  }

  async updateSupplier(id: string, data: Partial<NewSupplierEntity>): Promise<SupplierEntity> {
    const existing = await this.getSupplierById(id);

    if (data.supplierCode && data.supplierCode !== existing.supplierCode) {
      const duplicate = await this.supplierRepo.findByCode(data.supplierCode);
      if (duplicate && duplicate.id !== id) {
        throw AppError.conflict(`Supplier code "${data.supplierCode}" already exists`, 'DUPLICATE_SUPPLIER_CODE');
      }
    }

    return this.supplierRepo.update(id, data);
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.getSupplierById(id);

    const hasPos = await this.supplierRepo.hasPurchaseOrders(id);
    if (hasPos) {
      throw AppError.badRequest(
        'Cannot delete supplier referenced by purchase orders. Please mark as INACTIVE instead.',
        undefined,
        'SUPPLIER_HAS_PURCHASE_ORDERS'
      );
    }

    await this.supplierRepo.delete(id);
  }

  async setSupplierStatus(id: string, status: string): Promise<SupplierEntity> {
    await this.getSupplierById(id);
    if (!Object.values(SUPPLIER_STATUSES).includes(status as any)) {
      throw AppError.badRequest(`Invalid supplier status: ${status}`, undefined, 'INVALID_STATUS');
    }
    return this.supplierRepo.update(id, { status });
  }
}
