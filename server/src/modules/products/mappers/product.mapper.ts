import { ProductEntity } from '../../../database/schema/products.js';
import { ProductDto } from '../dto/product.dto.js';

export class ProductMapper {
  static toDto(entity: ProductEntity): ProductDto {
    return {
      id: entity.id,
      name: entity.name,
      sku: entity.sku,
      description: entity.description,
      category: entity.category,
      price: parseFloat(entity.price),
      stockQuantity: entity.stockQuantity,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  static toDtoList(entities: ProductEntity[]): ProductDto[] {
    return entities.map((entity) => ProductMapper.toDto(entity));
  }
}
