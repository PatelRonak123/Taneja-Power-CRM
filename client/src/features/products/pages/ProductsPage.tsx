import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useProductFilters } from '../hooks/useProductFilters';
import { ProductHeader } from '../modules/ProductHeader/ProductHeader';
import { ProductFilters } from '../modules/ProductFilters/ProductFilters';
import { ProductTable } from '../modules/ProductTable/ProductTable';
import { ProductForm } from '../modules/ProductForm/ProductForm';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Product } from '../types/product.types';

export const ProductsPage: React.FC = () => {
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
    <div className="products-page">
      <ProductHeader
        totalCount={meta?.total || products.length}
        onAddProduct={handleOpenAddModal}
      />

      <ProductFilters
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onStatusChange={setSelectedStatus}
        onReset={resetFilters}
      />

      {isLoading ? (
        <LoadingSpinner message="Retrieving grid power equipment..." />
      ) : isError ? (
        <ErrorAlert
          title="Telemetry Error"
          message={(error as any)?.message || 'Failed to fetch equipment data'}
          onRetry={() => refetch()}
        />
      ) : (
        <ProductTable
          products={products}
          onEdit={handleOpenEditModal}
          onDelete={deleteProduct}
          onDeployFirst={handleOpenAddModal}
        />
      )}

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
