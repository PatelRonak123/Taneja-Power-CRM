import { useProductStore } from '../../../stores/productStore';
import { ProductQueryParams } from '../types/product.types';

export const useProductFilters = () => {
  const {
    searchQuery,
    selectedCategory,
    selectedBrand,
    selectedStatus,
    selectedPriceOnRequest,
    currentPage,
    pageSize,
    setSearchQuery,
    setSelectedCategory,
    setSelectedBrand,
    setSelectedStatus,
    setSelectedPriceOnRequest,
    setCurrentPage,
    setPageSize,
    resetFilters,
  } = useProductStore();

  const queryParams: ProductQueryParams = {
    ...(searchQuery ? { search: searchQuery } : {}),
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(selectedBrand ? { brand: selectedBrand } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(selectedPriceOnRequest ? { priceOnRequest: selectedPriceOnRequest === 'true' } : {}),
    page: currentPage,
    limit: pageSize,
  };

  return {
    searchQuery,
    selectedCategory,
    selectedBrand,
    selectedStatus,
    selectedPriceOnRequest,
    currentPage,
    pageSize,
    queryParams,
    setSearchQuery,
    setSelectedCategory,
    setSelectedBrand,
    setSelectedStatus,
    setSelectedPriceOnRequest,
    setCurrentPage,
    setPageSize,
    resetFilters,
  };
};
