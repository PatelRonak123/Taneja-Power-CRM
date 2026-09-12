import React from 'react';
import { formatCurrency } from '../utils/productFormatters';

interface ProductPriceProps {
  price: number;
  className?: string;
}

export const ProductPrice: React.FC<ProductPriceProps> = ({ price, className = '' }) => {
  return (
    <span className={`product-price-tag ${className}`}>
      {formatCurrency(price)}
    </span>
  );
};

export default ProductPrice;
