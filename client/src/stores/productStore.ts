import { create } from 'zustand';

interface ProductUIState {
  searchQuery: string;
  selectedCategory: string;
  selectedBrand: string;
  selectedStatus: string;
  selectedPriceOnRequest: string; // '' | 'true' | 'false'
  currentPage: number;
  pageSize: number;
  isCreateModalOpen: boolean;
  selectedProductIdForEdit: string | null;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedBrand: (brand: string) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedPriceOnRequest: (por: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setCreateModalOpen: (open: boolean) => void;
  setSelectedProductIdForEdit: (id: string | null) => void;
  resetFilters: () => void;
}

export const useProductStore = create<ProductUIState>((set) => ({
  searchQuery: '',
  selectedCategory: '',
  selectedBrand: '',
  selectedStatus: '',
  selectedPriceOnRequest: '',
  currentPage: 1,
  pageSize: 10,
  isCreateModalOpen: false,
  selectedProductIdForEdit: null,
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory, currentPage: 1 }),
  setSelectedBrand: (selectedBrand) => set({ selectedBrand, currentPage: 1 }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus, currentPage: 1 }),
  setSelectedPriceOnRequest: (selectedPriceOnRequest) => set({ selectedPriceOnRequest, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),
  setCreateModalOpen: (isCreateModalOpen) => set({ isCreateModalOpen }),
  setSelectedProductIdForEdit: (selectedProductIdForEdit) => set({ selectedProductIdForEdit }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCategory: '',
      selectedBrand: '',
      selectedStatus: '',
      selectedPriceOnRequest: '',
      currentPage: 1,
    }),
}));
