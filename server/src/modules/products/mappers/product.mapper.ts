import { ProductEntity } from '../../../database/schema/products.js';
import { ProductDto } from '../dto/product.dto.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export interface UserContext {
  userId?: string;
  id?: string;
  role?: string;
  designation?: string | null;
  workType?: string | null;
}

export class ProductMapper {
  private static canViewCommercialTiers(user?: UserContext | null): boolean {
    if (!user || !user.role) return false;
    const role = user.role.toUpperCase();
    if (role === APP_CONSTANTS.ROLES.ADMIN || role === APP_CONSTANTS.ROLES.MANAGER) {
      return true;
    }
    const designation = (user.designation || '').toLowerCase();
    if (designation.includes('sales') || designation.includes('accountant')) {
      return true;
    }
    if (role === 'SALES' || role === 'SALES_OFFICE' || role === 'ACCOUNTANT') {
      return true;
    }
    return false;
  }

  static toDto(entity: ProductEntity, user?: UserContext | null): ProductDto {
    const isCommercial = ProductMapper.canViewCommercialTiers(user);

    const dto: ProductDto = {
      id: entity.id,
      name: entity.name,
      sku: entity.sku,
      description: entity.description,
      category: entity.category,
      price: parseFloat(entity.price),
      stockQuantity: entity.stockQuantity,
      status: entity.status,

      brand: entity.brand ?? null,
      model: entity.model ?? null,
      subModel: entity.subModel ?? null,
      series: entity.series ?? null,
      warrantyDescription: entity.warrantyDescription ?? null,
      hsnSac: entity.hsnSac ?? null,
      gstRate: entity.gstRate !== null && entity.gstRate !== undefined ? parseFloat(entity.gstRate) : null,
      unit: entity.unit ?? 'NOS',
      moq: entity.moq ?? null,
      mrp: entity.mrp !== null && entity.mrp !== undefined ? parseFloat(entity.mrp) : null,
      priceOnRequest: entity.priceOnRequest ?? false,
      capacityRating: entity.capacityRating ?? null,
      phase: entity.phase ?? null,
      technicalSpecifications: entity.technicalSpecifications ?? null,
      parentProductId: entity.parentProductId ?? null,
      parentProduct: (entity as any).parentProduct ?? null,

      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };

    if (isCommercial) {
      dto.minPrice = entity.minPrice !== null && entity.minPrice !== undefined ? parseFloat(entity.minPrice) : null;
      dto.maxPrice = entity.maxPrice !== null && entity.maxPrice !== undefined ? parseFloat(entity.maxPrice) : null;
      dto.dealerPrice = entity.dealerPrice !== null && entity.dealerPrice !== undefined ? parseFloat(entity.dealerPrice) : null;
      dto.partnerPrice = entity.partnerPrice !== null && entity.partnerPrice !== undefined ? parseFloat(entity.partnerPrice) : null;
      dto.dtp = entity.dtp !== null && entity.dtp !== undefined ? parseFloat(entity.dtp) : null;
      dto.basicPrice = entity.basicPrice !== null && entity.basicPrice !== undefined ? parseFloat(entity.basicPrice) : null;
      dto.gstPaidPrice = entity.gstPaidPrice !== null && entity.gstPaidPrice !== undefined ? parseFloat(entity.gstPaidPrice) : null;
      dto.recommendedPrice = entity.recommendedPrice !== null && entity.recommendedPrice !== undefined ? parseFloat(entity.recommendedPrice) : null;
      dto.sourceSheet = entity.sourceSheet ?? null;
      dto.sourceRowNumber = entity.sourceRowNumber ?? null;
    }

    return dto;
  }

  static toDtoList(entities: ProductEntity[], user?: UserContext | null): ProductDto[] {
    return entities.map((entity) => ProductMapper.toDto(entity, user));
  }
}

