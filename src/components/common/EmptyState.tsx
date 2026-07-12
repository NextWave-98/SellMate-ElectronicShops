// 📭 Empty State Components

import type { LucideIcon } from 'lucide-react';
import { BarChart3, ShoppingCart, Package, Users, TrendingUp, FileText, Search, Filter } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Generic empty state component
 */
export function EmptyState({ icon: Icon, title, message, action, className = '' }: EmptyStateProps) {
  const IconComponent = Icon || FileText;
  
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <IconComponent className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Empty sales data state
 */
export function EmptySalesState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="No Sales Data"
      message="There are no sales recorded for the selected period. Start recording sales to see analytics and insights here."
      action={onAction ? { label: 'Record First Sale', onClick: onAction } : undefined}
    />
  );
}

/**
 * Empty chart data state
 */
export function EmptyChartState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <BarChart3 className="w-16 h-16 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
      <p className="text-sm text-gray-600">Chart data will appear here when available</p>
    </div>
  );
}

/**
 * Empty search results state
 */
export function EmptySearchState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <Search className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
      <p className="text-gray-600 max-w-md mb-6">
        We couldn't find any results matching your search criteria. Try adjusting your filters or search terms.
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Filter className="w-4 h-4 mr-2" />
          Clear Filters
        </button>
      )}
    </div>
  );
}

/**
 * Empty products list state
 */
export function EmptyProductsState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Package className="w-10 h-10 text-gray-400 mb-3" />
      <h4 className="text-sm font-medium text-gray-900 mb-1">No Products Found</h4>
      <p className="text-xs text-gray-500">Top products will appear here</p>
    </div>
  );
}

/**
 * Empty staff/users list state
 */
export function EmptyStaffState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Users className="w-10 h-10 text-gray-400 mb-3" />
      <h4 className="text-sm font-medium text-gray-900 mb-1">No Staff Data</h4>
      <p className="text-xs text-gray-500">Staff performance will appear here</p>
    </div>
  );
}

/**
 * Empty trends data state
 */
export function EmptyTrendsState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <TrendingUp className="w-10 h-10 text-gray-400 mb-3" />
      <h4 className="text-sm font-medium text-gray-900 mb-1">No Trends Data</h4>
      <p className="text-xs text-gray-500">Sales trends will appear here</p>
    </div>
  );
}

/**
 * Empty table state
 */
export function EmptyTableState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="bg-gray-100 rounded-full p-4 mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Error state component
 */
export function ErrorState({ 
  title = 'Something Went Wrong', 
  message = 'We encountered an error while loading the data. Please try again.',
  onRetry 
}: { 
  title?: string; 
  message?: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-red-100 rounded-full p-6 mb-4">
        <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
