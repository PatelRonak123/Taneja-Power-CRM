import { useProductStore } from '../../../stores/productStore';

export const useProductFilters = () => {
  const {
    searchQuery,
    selectedCategory,
    selectedStatus,
    currentPage,
    pageSize,
    setSearchQuery,
    setSelectedCategory,
    setSelectedStatus,
    setCurrentPage,
    setPageSize,
    resetFilters,
  } = useProductStore();

  const queryParams = {
    ...(searchQuery ? { search: searchQuery } : {}),
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    page: currentPage,
    limit: pageSize,
  };

  return {
    searchQuery,
    selectedCategory,
    selectedStatus,
    currentPage,
    pageSize,
    queryParams,
    setSearchQuery,
    setSelectedCategory,
    setSelectedStatus,
    setCurrentPage,
    setPageSize,
    resetFilters,
  };
};
