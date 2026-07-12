import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Package, Layers, Tag } from 'lucide-react';
import { useProduct, type ProductItem } from '../../../hooks/useProduct';

interface VariantPOSSearchProps {
  onSelect?: (product: ProductItem) => void;
  onView?: (product: ProductItem) => void;
  onEdit?: (product: ProductItem) => void;
  onManageVariants?: (product: ProductItem) => void;
  placeholder?: string;
  className?: string;
}

export default function VariantPOSSearch({
  onSelect,
  onView,
  onEdit,
  onManageVariants,
  placeholder = 'Search: name, SKU, barcode, brand, category, tags, variants...',
  className = '',
}: VariantPOSSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const productHook = useProduct();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await productHook.getAllProducts({ search: q, limit: 20 });
        if (res?.data) {
          setResults(res.data as ProductItem[]);
          setIsOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [productHook]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setHighlightIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 280);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = (product: ProductItem) => {
    onSelect?.(product);
    setQuery(product.name);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const getStockTotal = (product: ProductItem) => product.inventorySummary?.totalQuantity ?? 0;

  const getStockBadgeClass = (product: ProductItem) => {
    const qty = getStockTotal(product);
    if (qty === 0) return 'text-red-600 bg-red-50 border border-red-200';
    if (qty <= (product.minStockLevel ?? 5)) return 'text-amber-700 bg-amber-50 border border-amber-200';
    return 'text-green-700 bg-green-50 border border-green-200';
  };

  const renderVariantAttrBadges = (product: ProductItem) => {
    if (!product.variantAttributes || Object.keys(product.variantAttributes).length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(product.variantAttributes).map(([k, v]) => (
          <span
            key={k}
            className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full"
          >
            <Tag className="w-2.5 h-2.5 text-orange-400" />
            <span className="capitalize text-orange-400">{k}:</span>
            <span className="font-medium">{String(v)}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-5 h-5 text-gray-400 pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm bg-white shadow-sm"
        />
        {loading && (
          <div className="absolute right-3 w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin pointer-events-none" />
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
        >
          <div className="sticky top-0 bg-gray-50 border-b border-gray-100 px-4 py-2 text-xs text-gray-500 font-medium">
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </div>
          {results.map((product, idx) => (
            <div
              key={product.id}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                idx === highlightIndex ? 'bg-orange-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(product)}
            >
              {/* Icon */}
              <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                {product.hasVariants ? (
                  <Layers className="w-4 h-4 text-orange-600" />
                ) : (
                  <Package className="w-4 h-4 text-orange-600" />
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{product.name}</span>
                  {product.hasVariants && (
                    <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full font-medium">
                      Has Variants
                    </span>
                  )}
                  {product.parentProductId && (
                    <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                      Variant
                    </span>
                  )}
                </div>

                {/* Variant attribute badges */}
                {renderVariantAttrBadges(product)}

                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {product.sku && (
                    <span className="text-xs text-gray-400">SKU: {product.sku}</span>
                  )}
                  {product.productCode && (
                    <span className="text-xs text-gray-400">#{product.productCode}</span>
                  )}
                  {product.brand && (
                    <span className="text-xs text-gray-500 font-medium">{product.brand}</span>
                  )}
                  {product.category?.name && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {product.category.name}
                    </span>
                  )}
                </div>

                {/* Per-location stock */}
                {product.inventorySummary?.locations && product.inventorySummary.locations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {product.inventorySummary.locations.slice(0, 3).map((loc) => (
                      <span
                        key={loc.locationId}
                        className="text-xs text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded"
                      >
                        {loc.locationName}: <span className={loc.quantity === 0 ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold'}>{loc.quantity}</span>
                      </span>
                    ))}
                    {product.inventorySummary.locations.length > 3 && (
                      <span className="text-xs text-gray-400">+{product.inventorySummary.locations.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Price + Stock */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-sm font-bold text-green-700">
                  LKR {product.unitPrice?.toLocaleString()}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStockBadgeClass(product)}`}>
                  {getStockTotal(product)} in stock
                </span>
                {/* Quick actions */}
                <div className="flex gap-1 mt-0.5">
                  {onView && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(product); setIsOpen(false); }}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      View
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(product); setIsOpen(false); }}
                      className="text-xs text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      Edit
                    </button>
                  )}
                  {onManageVariants && product.hasVariants && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onManageVariants(product); setIsOpen(false); }}
                      className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                    >
                      Variants
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && !loading && query.trim() && results.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-5 text-center"
        >
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No products found for "<strong>{query}</strong>"</p>
          <p className="text-xs text-gray-400 mt-1">Try name, SKU, barcode, brand, category, tags, or variant attributes</p>
        </div>
      )}
    </div>
  );
}
