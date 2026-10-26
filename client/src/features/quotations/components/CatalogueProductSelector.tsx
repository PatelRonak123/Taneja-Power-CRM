import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../products/types/product.types';
import { productService } from '../../products/services/productService';
import { Search, X, Check, HelpCircle, GitFork, Loader2 } from 'lucide-react';
import { getCategoryIcon } from '../../products/utils/categoryIcons';

interface CatalogueProductSelectorProps {
  selectedProductId: string | null;
  onSelectProduct: (product: Product | null) => void;
  disabled?: boolean;
}

export const CatalogueProductSelector: React.FC<CatalogueProductSelectorProps> = ({
  selectedProductId,
  onSelectProduct,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load and preserve currently selected product by ID
  useEffect(() => {
    if (!selectedProductId) {
      setSelectedProduct(null);
      return;
    }

    if (selectedProduct?.id === selectedProductId) {
      return;
    }

    let isCurrent = true;
    productService
      .getProductById(selectedProductId)
      .then((res) => {
        if (isCurrent && res.data) {
          setSelectedProduct(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to resolve selected catalogue product', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedProductId]);

  // Debounced server-side search
  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await productService.getProducts({
          search: searchTerm.trim() || undefined,
          limit: 25,
        });
        if (isCurrent && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error('Failed to search catalogue products', err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchTerm, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product: Product) => {
    if (product.status === 'INACTIVE') {
      return;
    }
    setSelectedProduct(product);
    onSelectProduct(product);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(null);
    onSelectProduct(null);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button / Display */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-9 px-3 py-1.5 bg-white border rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
          disabled
            ? 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-400'
            : isOpen
            ? 'border-blue-600 ring-2 ring-blue-100'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-2 min-w-0 pr-1">
            <div className="p-1 bg-blue-50 text-blue-600 rounded shrink-0">
              {getCategoryIcon(selectedProduct.category, 14)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-900 truncate">
                {selectedProduct.brand ? `[${selectedProduct.brand}] ` : ''}
                {selectedProduct.name}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>SKU: {selectedProduct.sku}</span>
                <span>•</span>
                {selectedProduct.priceOnRequest ? (
                  <span className="text-amber-700 font-semibold">Price on Request</span>
                ) : selectedProduct.minPrice && selectedProduct.maxPrice ? (
                  <span>
                    Range: ₹{Number(selectedProduct.minPrice).toLocaleString('en-IN')} - ₹
                    {Number(selectedProduct.maxPrice).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span>₹{Number(selectedProduct.price).toLocaleString('en-IN')}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-slate-400">Search catalogue equipment by SKU, name, brand...</span>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedProduct && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
              title="Clear selection"
            >
              <X size={13} />
            </button>
          )}
          <Search size={14} className="text-slate-400" />
        </div>
      </div>

      {/* Helper Badges under Selected Product */}
      {selectedProduct && (
        <div className="flex flex-col gap-0.5 mt-1">
          {selectedProduct.priceOnRequest && (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold w-fit inline-flex items-center gap-1">
              <HelpCircle size={11} />
              <span>Price on Request: Standard price is ₹0. Please enter agreed quotation price.</span>
            </span>
          )}
          {selectedProduct.minPrice && selectedProduct.maxPrice && (
            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold w-fit">
              ℹ️ Indicative Stabilizer Range: ₹{Number(selectedProduct.minPrice).toLocaleString('en-IN')} – ₹{Number(selectedProduct.maxPrice).toLocaleString('en-IN')}
            </span>
          )}
          {selectedProduct.parentProduct && (
            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold w-fit inline-flex items-center gap-1">
              <GitFork size={11} />
              <span>Host UPS: {selectedProduct.parentProduct.name} ({selectedProduct.parentProduct.sku})</span>
            </span>
          )}
        </div>
      )}

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search by name, SKU, brand, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
            />
            {isLoading && <Loader2 size={13} className="text-blue-600 animate-spin shrink-0" />}
          </div>

          {/* Results List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                {isLoading ? 'Searching catalogue...' : 'No matching catalogue products found'}
              </div>
            ) : (
              searchResults.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const isInactive = p.status === 'INACTIVE';

                return (
                  <div
                    key={p.id}
                    onClick={() => !isInactive && handleSelect(p)}
                    className={`p-2.5 flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                      isInactive
                        ? 'opacity-50 bg-slate-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-blue-50/70 hover:bg-blue-50 text-blue-950'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="p-1 bg-slate-100 text-slate-600 rounded shrink-0 mt-0.5">
                        {getCategoryIcon(p.category, 13)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">
                            {p.brand ? `[${p.brand}] ` : ''}
                            {p.name}
                          </span>
                          {isInactive && (
                            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 rounded">
                              Inactive (Unavailable)
                            </span>
                          )}
                          {p.priceOnRequest && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 rounded">
                              Price on Request
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono flex-wrap">
                          <span>SKU: {p.sku}</span>
                          {p.model && <span>• Model: {p.model}</span>}
                          {p.category && <span>• {p.category}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right font-medium">
                      {p.priceOnRequest ? (
                        <span className="text-amber-700 text-[11px]">On Request</span>
                      ) : p.minPrice && p.maxPrice ? (
                        <span className="text-slate-800 text-[11px] font-mono">
                          ₹{Number(p.minPrice).toLocaleString('en-IN')} - ₹{Number(p.maxPrice).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-900 text-[11px]">
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </span>
                      )}
                      {isSelected && (
                        <Check size={14} className="text-blue-600 ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
