import { ProductRepository } from '../repositories/product.repository.js';
import { CreateProductInput, UpdateProductInput, ListProductsQuery } from '../validators/product.validator.js';
import { ProductMapper } from '../mappers/product.mapper.js';
import { ProductDto, PaginatedProductsDto } from '../dto/product.dto.js';
import { AppError } from '../../../common/errors/AppError.js';

export class ProductService {
  constructor(private readonly productRepo: ProductRepository = new ProductRepository()) {}

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

  async createProduct(input: CreateProductInput): Promise<ProductDto> {
    const existing = await this.productRepo.findBySku(input.sku);
    if (existing) {
      throw AppError.conflict(`Product with SKU "${input.sku}" already exists`);
    }

    const created = await this.productRepo.create({
      name: input.name,
      sku: input.sku,
      description: input.description,
      category: input.category,
      price: input.price.toString(),
      stockQuantity: input.stockQuantity,
      status: input.status,
    });

    return ProductMapper.toDto(created);
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<ProductDto> {
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

    const updated = await this.productRepo.update(id, {
      ...(input.name && { name: input.name }),
      ...(input.sku && { sku: input.sku }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category && { category: input.category }),
      ...(input.price !== undefined && { price: input.price.toString() }),
      ...(input.stockQuantity !== undefined && { stockQuantity: input.stockQuantity }),
      ...(input.status && { status: input.status }),
    });

    if (!updated) {
      throw AppError.internal('Failed to update product');
    }

    return ProductMapper.toDto(updated);
  }

  async deleteProduct(id: string): Promise<void> {
    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw AppError.notFound(`Product with ID "${id}" was not found`);
    }

    await this.productRepo.delete(id);
  }
}
