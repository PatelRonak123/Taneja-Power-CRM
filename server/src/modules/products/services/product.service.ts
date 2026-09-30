import { ProductRepository } from '../repositories/product.repository.js';
import { CreateProductInput, UpdateProductInput, ListProductsQuery } from '../validators/product.validator.js';
import { ProductMapper } from '../mappers/product.mapper.js';
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

  async listProducts(query: ListProductsQuery): Promise<PaginatedProductsDto> {
    const { items, total } = await this.productRepo.findAll(query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      items: ProductMapper.toDtoList(items),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getProductById(id: string): Promise<ProductDto> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw AppError.notFound(`Product with ID "${id}" was not found`);
    }

    return ProductMapper.toDto(product);
  }

  async createProduct(input: CreateProductInput, authUser?: { userId?: string; id?: string }): Promise<ProductDto> {
    const existing = await this.productRepo.findBySku(input.sku);
    if (existing) {
      throw AppError.conflict(`Product with SKU "${input.sku}" already exists`);
    }

    const initialStock = Number(input.stockQuantity) || 0;

    return db.transaction(async (tx) => {
      const created = await this.productRepo.create(
        {
          name: input.name,
          sku: input.sku,
          description: input.description,
          category: input.category,
          price: input.price.toString(),
          stockQuantity: 0,
          status: input.status,
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

      return ProductMapper.toDto(created);
    });
  }

  async updateProduct(id: string, input: UpdateProductInput, authUser?: { userId?: string; id?: string }): Promise<ProductDto> {
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
        },
        tx
      );

      if (!updated) {
        throw AppError.internal('Failed to update product');
      }

      // Fetch refreshed product snapshot
      const refreshed = await this.productRepo.findById(id);
      return ProductMapper.toDto(refreshed || updated);
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
