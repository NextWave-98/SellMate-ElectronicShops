import React from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import type { CartItem } from '../../../pages/branch/POSPage';
import { formatCurrency } from '../../../utils/currency';

interface CartSummaryProps {
  cartItems: CartItem[];
  total: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  cartItems,
  total,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onCheckout
}) => {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-6 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Current Order</h3>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Cart Items */}
      <div className="p-4 flex-1 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="text-center flex flex-col items-center justify-center h-full">
            <div className="text-gray-400 mb-4">
              <ShoppingCart className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cart is empty</h3>
            <p className="text-sm text-gray-600">Add products to start an order</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => {
              const isNearLimit = !item.isService && item.quantity >= item.stock * 0.8;
              const isAtLimit = !item.isService && item.quantity >= item.stock;

              return (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                      {!item.isService ? (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatCurrency(item.price)} each
                        </p>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Service Amount</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={Number.isFinite(item.price) ? item.price : 0}
                            onChange={(e) => onUpdatePrice(item.id, Number(e.target.value))}
                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800"
                          />
                        </div>
                      )}
                      {isNearLimit && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-orange-600" />
                          <p className="text-xs text-orange-600 font-medium">
                            {isAtLimit ? 'Max quantity' : 'Low stock'}
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="p-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={!item.isService && item.quantity >= item.stock}
                        className={`p-1.5 border rounded-lg transition-colors ${
                          !item.isService && item.quantity >= item.stock
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Item Total */}
                    <p className="text-sm font-bold text-orange-600">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary and Checkout */}
      {cartItems.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          {/* Price Breakdown */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-orange-600">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={onCheckout}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 transition-colors shadow-sm hover:shadow-md"
          >
            <CreditCard className="w-5 h-5" />
            Proceed to Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default CartSummary;
