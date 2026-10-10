import { ProductRepository } from '../repositories/product.repository.js';
import { CreateProductInput, UpdateProductInput, ListProductsQuery } from '../validators/product.validator.js';
import { ProductMapper, UserContext } from '../mappers/product.mapper.js';
import { ProductDto, PaginatedProductsDto } from '../dto/product.dto.js';
import { AppError } from '../../../common/errors/AppError.js';
import { StockService } from '../../inventory/services/stock.service.js';
import { db } from '../../../database/db.js';
import { INVENTORY_REFERENCE_TYPES } from '../../../config/constants.js';

export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository = new ProductRepository(),
    private readonly stockService: StockService = new StockService()
  ) {}

  async listProducts(query: ListProductsQuery, user?: any): Promise<PaginatedProductsDto> {
    const { items, total } = await this.productRepo.findAll(query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      items: ProductMapper.toDtoList(items, user),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getProductById(id: string, user?: any): Promise<ProductDto> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw AppError.notFound(`Product with ID "${id}" was not found`);
    }

    return ProductMapper.toDto(product, user);
  }

  async createProduct(input: CreateProductInput, authUser?: UserContext): Promise<ProductDto> {
    const existing = await this.productRepo.findBySku(input.sku);
    if (existing) {
      throw AppError.conflict(`Product with SKU "${input.sku}" already exists`);
    }

    if (input.parentProductId) {
      const parent = await this.productRepo.findById(input.parentProductId);
      if (!parent) {
        throw AppError.badRequest(`Parent product with ID "${input.parentProductId}" does not exist`);
      }
    }

    const initialStock = Number(input.stockQuantity) || 0;

    // Consistency rule: Newly created price-on-request items default to INACTIVE unless explicitly set
    let finalStatus = input.status || 'ACTIVE';
    if (input.priceOnRequest && input.status === undefined) {
      finalStatus = 'INACTIVE';
    }

    return db.transaction(async (tx) => {
      const created = await this.productRepo.create(
        {
          name: input.name,
          sku: input.sku,
          description: input.description,
          category: input.category,
          price: input.price.toString(),
          stockQuantity: 0,
          status: finalStatus,

          brand: input.brand ?? null,
          model: input.model ?? null,
          subModel: input.subModel ?? null,
          series: input.series ?? null,
          warrantyDescription: input.warrantyDescription ?? null,
          hsnSac: input.hsnSac ?? null,
          gstRate: input.gstRate !== undefined && input.gstRate !== null ? input.gstRate.toString() : null,
          unit: input.unit ?? 'NOS',
          moq: input.moq ?? null,
          mrp: input.mrp !== undefined && input.mrp !== null ? input.mrp.toString() : null,
          dealerPrice: input.dealerPrice !== undefined && input.dealerPrice !== null ? input.dealerPrice.toString() : null,
          partnerPrice: input.partnerPrice !== undefined && input.partnerPrice !== null ? input.partnerPrice.toString() : null,
          dtp: input.dtp !== undefined && input.dtp !== null ? input.dtp.toString() : null,
          minPrice: input.minPrice !== undefined && input.minPrice !== null ? input.minPrice.toString() : null,
          maxPrice: input.maxPrice !== undefined && input.maxPrice !== null ? input.maxPrice.toString() : null,
          priceOnRequest: input.priceOnRequest ?? false,
          basicPrice: input.basicPrice !== undefined && input.basicPrice !== null ? input.basicPrice.toString() : null,
          gstPaidPrice: input.gstPaidPrice !== undefined && input.gstPaidPrice !== null ? input.gstPaidPrice.toString() : null,
          recommendedPrice: input.recommendedPrice !== undefined && input.recommendedPrice !== null ? input.recommendedPrice.toString() : null,
          capacityRating: input.capacityRating ?? null,
          phase: input.phase ?? null,
          technicalSpecifications: input.technicalSpecifications ?? null,
          parentProductId: input.parentProductId ?? null,
          sourceSheet: input.sourceSheet ?? null,
          sourceRowNumber: input.sourceRowNumber ?? null,
        },
        tx
      );

      if (initialStock > 0) {
        await this.stockService.addStock(
          {
            productId: created.id,
            quantity: initialStock,
            referenceType: INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
            reason: 'Opening stock on product creation',
          },
          authUser,
          tx
        );
        created.stockQuantity = initialStock;
      }

      return ProductMapper.toDto(created, authUser);
    });
  }

  async updateProduct(id: string, input: UpdateProductInput, authUser?: UserContext): Promise<ProductDto> {
    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw AppError.notFound(`Product with ID "${id}" was not found`);
    }

    if (input.sku && input.sku !== existing.sku) {
      const skuCheck = await this.productRepo.findBySku(input.sku);
      if (skuCheck) {
        throw AppError.conflict(`Product with SKU "${input.sku}" already exists`);
      }
    }

    // Validate conceptual merged product state
    const effectivePriceOnRequest =
      input.priceOnRequest !== undefined ? input.priceOnRequest : existing.priceOnRequest;

    const effectivePrice =
      input.price !== undefined ? input.price : parseFloat(existing.price);

    if (!effectivePriceOnRequest && effectivePrice <= 0) {
      throw AppError.badRequest('Price must be greater than 0 unless priceOnRequest is true');
    }

    // Merge minPrice and maxPrice against stored opposite bound
    const effectiveMinPrice =
      input.minPrice !== undefined
        ? input.minPrice
        : existing.minPrice !== null && existing.minPrice !== undefined
        ? parseFloat(existing.minPrice)
        : null;

    const effectiveMaxPrice =
      input.maxPrice !== undefined
        ? input.maxPrice
        : existing.maxPrice !== null && existing.maxPrice !== undefined
        ? parseFloat(existing.maxPrice)
        : null;

    if (effectiveMinPrice !== null && effectiveMaxPrice !== null && effectiveMinPrice > effectiveMaxPrice) {
      throw AppError.badRequest(`minPrice (${effectiveMinPrice}) cannot exceed maxPrice (${effectiveMaxPrice})`);
    }

    if (input.parentProductId !== undefined && input.parentProductId !== null) {
      if (input.parentProductId === id) {
        throw AppError.badRequest('A product cannot be its own parent product');
      }
      const parent = await this.productRepo.findById(input.parentProductId);
      if (!parent) {
        throw AppError.badRequest(`Referenced parent product with ID "${input.parentProductId}" does not exist`);
      }
      if (parent.parentProductId === id) {
        throw AppError.badRequest('Circular parent reference detected');
      }
    }

    return db.transaction(async (tx) => {
      // Direct stockQuantity mutation is REMOVED from the product repo update.
      // If stockQuantity is provided and differs from current stock, route through StockService.adjustStock
      if (input.stockQuantity !== undefined && input.stockQuantity !== existing.stockQuantity) {
        await this.stockService.adjustStock(
          {
            productId: id,
            newQuantity: input.stockQuantity,
            reason: input.adjustmentReason || 'Manual stock adjustment via product update',
          },
          authUser,
          tx
        );
      }

      const updated = await this.productRepo.update(
        id,
        {
          ...(input.name && { name: input.name }),
          ...(input.sku && { sku: input.sku }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.category && { category: input.category }),
          ...(input.price !== undefined && { price: input.price.toString() }),
          ...(input.status && { status: input.status }),

          ...(input.brand !== undefined && { brand: input.brand }),
          ...(input.model !== undefined && { model: input.model }),
          ...(input.subModel !== undefined && { subModel: input.subModel }),
          ...(input.series !== undefined && { series: input.series }),
          ...(input.warrantyDescription !== undefined && { warrantyDescription: input.warrantyDescription }),
          ...(input.hsnSac !== undefined && { hsnSac: input.hsnSac }),
          ...(input.gstRate !== undefined && { gstRate: input.gstRate !== null ? input.gstRate.toString() : null }),
          ...(input.unit !== undefined && { unit: input.unit }),
          ...(input.moq !== undefined && { moq: input.moq }),
          ...(input.mrp !== undefined && { mrp: input.mrp !== null ? input.mrp.toString() : null }),
          ...(input.dealerPrice !== undefined && { dealerPrice: input.dealerPrice !== null ? input.dealerPrice.toString() : null }),
          ...(input.partnerPrice !== undefined && { partnerPrice: input.partnerPrice !== null ? input.partnerPrice.toString() : null }),
          ...(input.dtp !== undefined && { dtp: input.dtp !== null ? input.dtp.toString() : null }),
          ...(input.minPrice !== undefined && { minPrice: input.minPrice !== null ? input.minPrice.toString() : null }),
          ...(input.maxPrice !== undefined && { maxPrice: input.maxPrice !== null ? input.maxPrice.toString() : null }),
          ...(input.priceOnRequest !== undefined && { priceOnRequest: input.priceOnRequest }),
          ...(input.basicPrice !== undefined && { basicPrice: input.basicPrice !== null ? input.basicPrice.toString() : null }),
          ...(input.gstPaidPrice !== undefined && { gstPaidPrice: input.gstPaidPrice !== null ? input.gstPaidPrice.toString() : null }),
          ...(input.recommendedPrice !== undefined && { recommendedPrice: input.recommendedPrice !== null ? input.recommendedPrice.toString() : null }),
          ...(input.capacityRating !== undefined && { capacityRating: input.capacityRating }),
          ...(input.phase !== undefined && { phase: input.phase }),
          ...(input.technicalSpecifications !== undefined && { technicalSpecifications: input.technicalSpecifications }),
          ...(input.parentProductId !== undefined && { parentProductId: input.parentProductId }),
          ...(input.sourceSheet !== undefined && { sourceSheet: input.sourceSheet }),
          ...(input.sourceRowNumber !== undefined && { sourceRowNumber: input.sourceRowNumber }),
        },
        tx
      );

      if (!updated) {
        throw AppError.internal('Failed to update product');
      }

      // Fetch refreshed product snapshot
      const refreshed = await this.productRepo.findById(id, tx);
      return ProductMapper.toDto(refreshed || updated, authUser);
    });
  }

  async deleteProduct(id: string): Promise<void> {
    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw AppError.notFound(`Product with ID "${id}" was not found`);
    }

    await this.productRepo.delete(id);
  }
}
