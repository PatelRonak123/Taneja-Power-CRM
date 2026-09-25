import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { ProductQueryParams, CreateProductPayload, UpdateProductPayload } from '../types/product.types';
import { toast } from '../../../utils/toast';

export const useProducts = (params?: ProductQueryParams) => {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.getProducts(params),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) => productService.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      productService.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Equipment asset deleted successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to delete product', err?.message);
    },
  });

  return {
    products: productsQuery.data?.data || [],
    meta: productsQuery.data?.meta,
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    error: productsQuery.error,
    refetch: productsQuery.refetch,
    createProduct: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateProduct: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteProduct: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
