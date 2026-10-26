import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, Package } from 'lucide-react';
import { Product } from '../../products/types/product.types';

interface CatalogEquipmentSelectorProps {
  products: Product[];
  selectedProductId: string | null | undefined;
  onSelect: (productId: string | null) => void;
}

export const CatalogEquipmentSelector: React.FC<CatalogEquipmentSelectorProps> = ({
  products,
  selectedProductId,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    const matches = products.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      const matchCat = p.category?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      return Boolean(matchName || matchSku || matchCat || matchDesc);
    });

    // Ensure the currently selected product remains present in list so <select> doesn't lose value
    if (selectedProductId && !matches.some((p) => p.id === selectedProductId)) {
      const selected = products.find((p) => p.id === selectedProductId);
      if (selected) {
        matches.unshift(selected);
      }
    }
    return matches;
  }, [products, searchQuery, selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 relative">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
          <Package size={12} className="text-slate-400" />
          <span>Select Catalog Equipment</span>
        </label>
        {searchQuery.trim() ? (
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'match' : 'matches'}
          </span>
        ) : selectedProduct ? (
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
            SKU: {selectedProduct.sku}
          </span>
        ) : null}
      </div>

      {/* Product Search Input along with Dropdown */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search products by name, SKU..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => {
            if (searchQuery.trim()) {
              setIsDropdownOpen(true);
            }
          }}
          className="w-full pl-8 pr-7 py-1.5 text-xs text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setIsDropdownOpen(false);
            }}
            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            title="Clear search"
          >
            <X size={12} />
          </button>
        )}

        {/* Quick Searched Products Floating Results */}
        {isDropdownOpen && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95">
            <div className="p-2 bg-slate-50/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between sticky top-0 backdrop-blur-xs border-b border-slate-100">
              <span>Matching Products ({filteredProducts.length})</span>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-normal capitalize"
              >
                Close
              </button>
            </div>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const isSelected = selectedProductId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p.id);
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2.5 hover:bg-blue-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected ? 'bg-blue-50/70 border-l-2 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">{p.name}</span>
                        {isSelected && <Check size={12} className="text-blue-600 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-semibold">
                          {p.sku}
                        </span>
                        {p.category && <span>&bull; {p.category}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 shrink-0 tabular-nums">
                      ₹{Number(p.price).toLocaleString('en-IN')}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-xs text-slate-400 text-center italic">
                No products found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Catalog Equipment Dropdown Select */}
      <select
        value={selectedProductId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
      >
        <option value="">-- Custom / Manual Entry --</option>
        {filteredProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.sku}) - ₹{Number(p.price).toLocaleString('en-IN')}
          </option>
        ))}
        {filteredProducts.length === 0 && searchQuery && (
          <option disabled value="__none__">
            No products found matching "{searchQuery}"
          </option>
        )}
      </select>
    </div>
  );
};
