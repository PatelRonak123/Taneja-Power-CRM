import React from 'react';
import { formatCurrency } from '../utils/productFormatters';

interface ProductPriceProps {
  price: number;
  className?: string;
}

export const ProductPrice: React.FC<ProductPriceProps> = ({ price, className = '' }) => {
  return <span className={`font-semibold text-amber-400 ${className}`}>{formatCurrency(price)}</span>;
};
