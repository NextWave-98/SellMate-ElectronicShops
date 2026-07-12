import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  Tag
} from 'lucide-react';
import type { Product } from '../../../pages/branch/POSPage';
import { formatCurrency } from '../../../utils/currency';

interface ProductGridProps {
  products: Product[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeItemType: 'all' | 'products' | 'services';
  setActiveItemType: (type: 'all' | 'products' | 'services') => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  onAddToCart: (product: Product) => void;
  isLoadingProducts?: boolean;
  totalProducts?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  searchQuery,
  setSearchQuery,
  activeItemType,
  setActiveItemType,
  selectedCategory,
  setSelectedCategory,
  onAddToCart,
  isLoadingProducts = false,
  totalProducts,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}) => {
  const [jumpPageInput, setJumpPageInput] = useState('');

  useEffect(() => {
    setJumpPageInput(String(currentPage));
  }, [currentPage]);

  const typeFilteredProducts = useMemo(() => {
    if (activeItemType === 'products') {
      return products.filter((p) => !p.isService);
    }
    if (activeItemType === 'services') {
      return products.filter((p) => p.isService);
    }
    return products;
  }, [products, activeItemType]);

  // Get unique categories from products
  const categories = useMemo(() => {
    const uniqueCategories = new Set(typeFilteredProducts.map(p => p.category));
    return [
      { id: 'all', label: 'All Products' },
      ...Array.from(uniqueCategories).map(cat => ({
        id: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1)
      }))
    ];
  }, [typeFilteredProducts]);

  const visibleProducts = typeFilteredProducts;
  const resolvedTotalProducts =
    activeItemType === 'all'
      ? Math.max(totalProducts ?? visibleProducts.length, visibleProducts.length)
      : visibleProducts.length;
  const totalPages = Math.max(1, Math.ceil(resolvedTotalProducts / pageSize));
  const startIndex = resolvedTotalProducts > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = resolvedTotalProducts > 0
    ? Math.min((currentPage - 1) * pageSize + visibleProducts.length, resolvedTotalProducts)
    : 0;

  const goToPage = () => {
    const parsed = Number(jumpPageInput);
    if (!Number.isFinite(parsed)) return;
    const target = Math.min(totalPages, Math.max(1, Math.floor(parsed)));
    onPageChange?.(target);
    setJumpPageInput(String(target));
  };

  // Get stock status color
  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return 'text-red-600';
    if (stock < 10) return 'text-orange-600';
    if (stock < 20) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header with Search and Filters */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {activeItemType === 'services' ? 'Services' : activeItemType === 'products' ? 'Products' : 'Products & Services'}
          </h3>
        </div>

        <div className="flex gap-2 mb-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'products', label: 'Products' },
            { id: 'services', label: 'Services' },
          ].map((tab) => {
            const selected = activeItemType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveItemType(tab.id as 'all' | 'products' | 'services')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selected
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search products by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border focus:outline-none border-gray-300 rounded-lg focus:ring-1 focus:ring-[#1e3a8a]-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-[#1e3a8a] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      <div className="p-4 flex-1 overflow-y-auto">
        {isLoadingProducts ? (
          <div className="text-center flex flex-col items-center justify-center h-full">
            <p className="text-gray-600 text-sm">Loading products...</p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="text-center flex flex-col items-center justify-center h-full">
            <div className="text-gray-400 mb-4">
              <Package className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleProducts.map((product) => {
              const stockColor = getStockStatusColor(product.stock);
              const isOutOfStock = !product.isService && product.stock === 0;

              return (
                <div
                  key={product.id}
                  className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all ${
                    isOutOfStock
                      ? 'border-red-200 bg-gray-50 opacity-60'
                      : 'border-gray-200 cursor-pointer hover:border-orange-300'
                  }`}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                >
                  <div className=" mb-3">
                   
                    <div className='h-48 relative'>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                          <Package className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {product.discountInfo && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {product.discountInfo.discountType === 'PERCENTAGE'
                            ? `${product.discountInfo.discountValue}% OFF`
                            : `${formatCurrency(product.discountInfo.discountAmount)} OFF`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* <div className={`${isOutOfStock ? 'bg-gray-200' : 'bg-orange-100'} p-3 rounded-lg`}>
                        <Package className={`w-6 h-6 ${isOutOfStock ? 'text-gray-400' : 'text-[#1e3a8a]'}`} />
                      </div> */}
                      <div>
                        <h4 className={`text-sm font-semibold ${isOutOfStock ? 'text-gray-500' : 'text-gray-900'}`}>
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">{product.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <div>
                      <p className={`text-lg font-bold ${isOutOfStock ? 'text-gray-500' : product.discountInfo ? 'text-red-600' : 'text-[#1e3a8a]'}`}>
                        {formatCurrency(product.price)}
                      </p>
                      {product.originalPrice !== undefined && (
                        <p className="text-xs text-gray-400 line-through">
                          {formatCurrency(product.originalPrice)}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {!product.isService && product.stock < 10 && product.stock > 0 && (
                          <AlertTriangle className="w-3 h-3 text-orange-600" />
                        )}
                        <p className={`text-xs font-medium ${stockColor}`}>
                          {product.isService ? 'Service' : isOutOfStock ? 'Out of Stock' : `Stock: ${product.stock}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isOutOfStock) onAddToCart(product);
                      }}
                      disabled={isOutOfStock}
                      className={`p-2 rounded-lg transition-all ${
                        isOutOfStock
                          ? 'bg-gray-200 cursor-not-allowed'
                          : 'bg-[#1e3a8a] hover:bg-orange-700 text-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Count */}
      {resolvedTotalProducts > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0 space-y-2">
          <p className="text-sm text-gray-600 text-center">
            Showing {startIndex}-{endIndex} of {resolvedTotalProducts} products
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Rows</label>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
              >
                {[10, 30, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                Prev
              </button>
              <span className="text-xs text-gray-600">Page {currentPage} / {totalPages}</span>
              <button
                onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                Next
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-gray-500">Go to page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  goToPage();
                }
              }}
              className="w-16 text-xs border border-gray-300 rounded-md px-2 py-1 text-center"
            />
            <button
              onClick={goToPage}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-300 bg-white"
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
