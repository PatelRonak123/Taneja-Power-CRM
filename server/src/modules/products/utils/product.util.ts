export const formatProductSku = (category: string, code: string): string => {
  return `${category.substring(0, 3).toUpperCase()}-${code.toUpperCase()}`;
};
