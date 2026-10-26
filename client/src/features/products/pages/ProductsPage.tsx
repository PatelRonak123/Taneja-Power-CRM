import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useProductFilters } from '../hooks/useProductFilters';
import { ProductHeader } from '../modules/ProductHeader/ProductHeader';
import { ProductFilters } from '../modules/ProductFilters/ProductFilters';
import { ProductTable } from '../modules/ProductTable/ProductTable';
import { ProductGrid } from '../modules/ProductGrid/ProductGrid';
import { ProductForm } from '../modules/ProductForm/ProductForm';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Product } from '../types/product.types';
import { useAuthStore } from '@/stores/authStore';
import { StockAdjustmentModal } from '../../inventory/components/StockAdjustmentModal';
import { StockMovementHistoryModal } from '../../inventory/components/StockMovementHistoryModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';
  const isAccountantOffice =
    user?.role === 'USER' &&
    (user?.designation || '').toLowerCase().includes('accountant');
  // Accountant Office users can also create and edit products (for procurement workflow)
  const canManageProducts = isManagerOrAdmin || isAccountantOffice;

  const {
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
  } = useProductFilters();

  const { products, meta, isLoading, isError, error, refetch, deleteProduct } =
    useProducts(queryParams);

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState<Product | null>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);

  // Live metrics calculations
  const totalCount = meta?.total !== undefined ? meta.total : products.length;
  const totalUnits = products.reduce((sum, item) => sum + (Number(item.stockQuantity) || 0), 0);
  const totalValuation = products.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.stockQuantity) || 0),
    0
  );
  const activeCount = products.filter((p) => p.status === 'ACTIVE').length;

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // Pagination bounds
  const totalPages = meta?.totalPages || 1;
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Executive Hero & KPI Metrics */}
      <ProductHeader
        totalCount={totalCount}
        totalUnits={totalUnits}
        totalValuation={totalValuation}
        activeCount={activeCount}
        onAddProduct={handleOpenAddModal}
        canCreate={canManageProducts}
      />

      {/* Advanced Filters & View Switcher */}
      <ProductFilters
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedBrand={selectedBrand}
        selectedStatus={selectedStatus}
        selectedPriceOnRequest={selectedPriceOnRequest}
        viewMode={viewMode}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onBrandChange={setSelectedBrand}
        onStatusChange={setSelectedStatus}
        onPriceOnRequestChange={setSelectedPriceOnRequest}
        onViewModeChange={setViewMode}
        onReset={resetFilters}
      />

      {/* Main Content Area: Loading / Error / Table or Grid */}
      {isLoading ? (
        <LoadingSpinner message="Retrieving grid power equipment & telemetry..." />
      ) : isError ? (
        <ErrorAlert
          title="Telemetry Error"
          message={(error as any)?.message || 'Failed to fetch equipment data'}
          onRetry={() => refetch()}
        />
      ) : viewMode === 'table' ? (
        <ProductTable
          products={products}
          onEdit={handleOpenEditModal}
          onDelete={deleteProduct}
          onViewDetails={(p) => setViewingProduct(p)}
          onDeployFirst={canManageProducts ? handleOpenAddModal : undefined}
          onAdjustStock={(p) => setSelectedProductForAdjustment(p)}
          onViewHistory={(p) => setSelectedProductForHistory(p)}
          canEdit={canManageProducts}
          canDelete={isAdmin}
        />
      ) : (
        <ProductGrid
          products={products}
          onEdit={handleOpenEditModal}
          onDelete={deleteProduct}
          onViewDetails={(p) => setViewingProduct(p)}
          onDeployFirst={canManageProducts ? handleOpenAddModal : undefined}
          canEdit={canManageProducts}
          canDelete={isAdmin}
        />
      )}

      {/* Pagination Footer */}
      {!isLoading && !isError && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-xs text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-900">{startItem}</strong> to{' '}
              <strong className="text-slate-900">{endItem}</strong> of{' '}
              <strong className="text-slate-900">{totalCount}</strong> products
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next Page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy / Edit Asset Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Edit Catalogue Equipment Master' : 'Deploy New Power Asset'}
        maxWidth="lg"
      >
        <ProductForm
          product={editingProduct}
          onSuccess={handleCloseModal}
          onCancel={handleCloseModal}
        />
      </Modal>

      {/* View Full Product Specifications Modal */}
      <ProductDetailModal
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={!!selectedProductForAdjustment}
        onClose={() => setSelectedProductForAdjustment(null)}
        product={selectedProductForAdjustment}
        onSuccess={() => refetch()}
      />

      {/* Stock Movement History Ledger Modal */}
      <StockMovementHistoryModal
        isOpen={!!selectedProductForHistory}
        onClose={() => setSelectedProductForHistory(null)}
        product={selectedProductForHistory}
      />
    </div>
  );
};

export default ProductsPage;
