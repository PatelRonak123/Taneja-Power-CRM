import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useProductFilters } from '../hooks/useProductFilters';
import { ProductHeader } from '../modules/ProductHeader/ProductHeader';
import { ProductFilters } from '../modules/ProductFilters/ProductFilters';
import { ProductTable } from '../modules/ProductTable/ProductTable';
import { ProductGrid } from '../modules/ProductGrid/ProductGrid';
import { ProductForm } from '../modules/ProductForm/ProductForm';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Product } from '../types/product.types';
import { useAuthStore } from '@/stores/authStore';

export const ProductsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';

  const {
    searchQuery,
    selectedCategory,
    selectedStatus,
    queryParams,
    setSearchQuery,
    setSelectedCategory,
    setSelectedStatus,
    resetFilters,
  } = useProductFilters();

  const { products, meta, isLoading, isError, error, refetch, deleteProduct } =
    useProducts(queryParams);

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Calculate live catalog metrics
  const totalCount = meta?.total || products.length;
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

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Executive Hero & KPI Metrics */}
      <ProductHeader
        totalCount={totalCount}
        totalUnits={totalUnits}
        totalValuation={totalValuation}
        activeCount={activeCount}
        onAddProduct={handleOpenAddModal}
        canCreate={isManagerOrAdmin}
      />

      {/* Advanced Filters & View Switcher */}
      <ProductFilters
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        viewMode={viewMode}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onStatusChange={setSelectedStatus}
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
          onDeployFirst={isManagerOrAdmin ? handleOpenAddModal : undefined}
          canEdit={isManagerOrAdmin}
          canDelete={isAdmin}
        />
      ) : (
        <ProductGrid
          products={products}
          onEdit={handleOpenEditModal}
          onDelete={deleteProduct}
          onDeployFirst={isManagerOrAdmin ? handleOpenAddModal : undefined}
          canEdit={isManagerOrAdmin}
          canDelete={isAdmin}
        />
      )}

      {/* Deploy / Edit Asset Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Edit Power Equipment' : 'Deploy New Power Asset'}
        maxWidth="lg"
      >
        <ProductForm
          product={editingProduct}
          onSuccess={handleCloseModal}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default ProductsPage;
