/**
 * Hooks Index
 * Central export file for all custom hooks
 */

// Auth hooks
export { useAuthRedux } from './useAuthRedux';
export { usePermissions } from './usePermissions';

// Permission hooks
export {
  usePermissionCheck,
  useButtonPermission,
  useAllButtonPermissions,
  useMultiplePermissions,
  useConditionalRender,
} from './usePermissionCheck';

// Data hooks - named exports
export { useBranch } from './useBranch';
export { useDashboard } from './useDashboard';
export { useGoodsReceipt } from './useGoodsReceipt';
export { useLocation } from './useLocation';
export { useReports } from './useReports';
export { useStaff } from './useStaff';
export { useRole } from './useRole';

// Data hooks - default exports
export { default as useAddonRequest } from './useAddonRequest';
export { default as useBranchSales } from './useBranchSales';
export { default as useBusinessProfile } from './useBusinessProfile';
export { default as useCustomer } from './useCustomer';
export { default as useDevice } from './useDevice';
export { default as useDevicesBranch } from './useDevicesBranch';
export { default as useFetch } from './useFetch';
export { default as useInventory } from './useInventory';
export { default as useJobSheet } from './useJobSheet';
export { default as useNotification } from './useNotification';
export { default as useProduct } from './useProduct';
export { default as useProductCategory } from './useProductCategory';
export { default as useProductReturn } from './useProductReturn';
export { default as useProfile } from './useProfile';
export { default as usePurchaseOrder } from './usePurchaseOrder';
export { default as useSales } from './useSales';
export { default as useShopAPI } from './useShopAPI';
export { default as useSMS } from './useSMS';
export { default as useStock } from './useStock';
export { default as useStockTransfer } from './useStockTransfer';
export { default as useSupplier } from './useSupplier';
export { default as useDiscount } from './useDiscount';
export { default as useWarranty } from './useWarranty';

// Supplier Portal hooks
export { useSupplierAuth } from './useSupplierAuth';
export { useSupplierPortal } from './useSupplierPortal';
export { default as useCourier } from './useCourier';

// Communication hooks
export { default as useCommunicationCredentials } from './useCommunicationCredentials';
