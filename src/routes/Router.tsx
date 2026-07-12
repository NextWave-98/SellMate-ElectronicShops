import { Routes, Route, Navigate } from 'react-router-dom';
import SuperadminLayout from '../layouts/superadmin/SuperadminLayout';
import DashboardPage from '../pages/organizationadmin/DashboardPage';
import HomePage from '../pages/home/HomePage';
// import MainLayout from '../layouts/main/MainLayout';
import ShopPage from '../pages/organizationadmin/ShopPage';
import StaffPage from '../pages/organizationadmin/StaffPage';
import StockPage from '../pages/organizationadmin/StockPage';
import CategoriesPage from '../pages/organizationadmin/CategoriesPage';
import SalesPage from '../pages/organizationadmin/SalesPage';
import JobSheetsPage from '../pages/organizationadmin/JobSheetsPage';
import PartsPage from '../pages/organizationadmin/PartsPage';
import InventoryPage from '../pages/organizationadmin/InventoryPage';
import CustomersPage from '../pages/organizationadmin/CustomersPage';
import WarrantyPage from '../components/superadmin/warranty/WarrantyPage';
import SuppliersPage from '../pages/organizationadmin/SuppliersPage';
import GoodsReceiptsPage from '../pages/organizationadmin/GoodsReceiptsPage';
import StockTransfersPage from '../pages/organizationadmin/StockTransfersPage';
import ReportsPage from '../pages/organizationadmin/ReportsPage';
import AIAnalyticsPage from '../pages/organizationadmin/AIAnalyticsPage';
import AddonRequestsPage from '../pages/admin/AddonRequestsPage';
// import NotificationsPage from '../pages/superadmin/NotificationsPage';
import StockDashboardPage from '../pages/organizationadmin/StockDashboardPage';
import BarcodeGeneratorPage from '../pages/organizationadmin/BarcodeGeneratorPage';
import PaymentsPage from '../pages/organizationadmin/PaymentsPage';
import ReturnsPage from '../pages/organizationadmin/ReturnsPage';
import NotificationSettings from '../components/superadmin/notifications/NotificationSettings';
import NotificationDashboard from '../components/superadmin/notifications/NotificationDashboard';
import CourierPage from '../pages/home/CourierServicesPage';
import CourierServicesPage from '../pages/home/CourierServicesPage';
import ShipmentTrackingPage from '../pages/organizationadmin/ShipmentTrackingPage';
// Super Admin Management Pages
import PermissionsPage from '../pages/organizationadmin/PermissionsPage';
import RoleManagementPage from '../pages/organizationadmin/RoleManagementPage';
import OrganizationsPage from '../pages/organizationadmin/OrganizationsPage';
import SubscriptionsPage from '../pages/organizationadmin/SubscriptionsPage';
import SubscriptionCheckoutPage from '../pages/organizationadmin/SubscriptionCheckoutPage';
import PlatformRoleManagementPage from '../pages/platformcontroladmin/PlatformRoleManagementPage';
// New vertical pages: Vehicle Rental, Car Wash, Garage, Trade-In
import RentalPage from '../pages/organizationadmin/RentalPage';
import CarWashPage from '../pages/organizationadmin/CarWashPage';
import GaragePage from '../pages/organizationadmin/GaragePage';
import TradeInsPage from '../pages/organizationadmin/TradeInsPage';
import EstimateApprovalPage from '../pages/home/EstimateApprovalPage';
import RentalFleetPage from '../pages/home/RentalFleetPage';
import ProtectedRoute from './ProtectedRouteRedux';
import { PermissionRoute } from './PermissionRoute';
import IndustryFeatureRoute from './IndustryFeatureRoute';
import LoginPage from '../pages/auth/LoginPage';
import BranchSelectPage from '../pages/auth/BranchSelectPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import { ROLES } from '../constants/roles';
import { PERMISSIONS } from '../store/types';
import BranchLayout from '../layouts/branch/BranchLayout';
import BranchDashboardPage from '../pages/branch/BranchDashboardPage';
import POSPage from '../pages/branch/POSPage';
import QuickPOSPage from '../pages/branch/QuickPOSPage';
import ProductsPage from '../pages/branch/ProductsPage';
import BranchAddonRequestsPage from '../pages/branch/AddonRequestsPage';
import BranchCustomersPage from '../pages/branch/CustomersPage';
import BranchSalesPage from '../pages/branch/BranchSalesPage';
import BranchJobSheetsPage from '../pages/branch/JobSheetsPage';
import BranchSaleJobsPage from '../pages/branch/SaleJobsPage';
import BranchReturnsPage from '../pages/branch/ReturnsPage';
import BranchWarrantyPage from '../pages/branch/BranchWarrantyPage';
import ProfilePage from '../pages/organizationadmin/ProfilePage';
import InstallmentsPage from '../pages/branch/InstallmentsPage';
import CreateInstallmentPlanPage from '../pages/branch/CreateInstallmentPlanPage';
import InstallmentDetailPage from '../pages/branch/InstallmentDetailPage';
import EditCustomerFinancialDetailsPage from '../pages/branch/EditCustomerFinancialDetailsPage';
import AddCustomerFinancialDetailsPage from '../pages/branch/AddCustomerFinancialDetailsPage';
import BranchCourierPage from '../pages/branch/CourierPage';
import CourierPerformancePage from '../pages/branch/CourierPerformancePage';
import AdvancePaymentsPage from '../pages/branch/AdvancePaymentsPage';
import OrgAdvancePaymentsPage from '../pages/organizationadmin/AdvancePaymentsPage';
import BranchBarcodeGeneratorPage from '../pages/branch/BarcodeGeneratorPage';
import CashDrawerPage from '../pages/branch/CashDrawerPage';
import AdminLoginPage from '../pages/auth/AdminLoginPage';
import PlatformLayout from '../layouts/platform/PlatformLayout';
import PlatformOverviewPage from '../pages/platformcontroladmin/PlatformOverviewPage';
import AuthRedirect from './AuthRedirect';
// Supplier Portal Imports
import SupplierProtectedRoute from './SupplierProtectedRoute';
import SupplierLayout from '../layouts/supplier/SupplierLayout';
import SupplierLogin from '../pages/supplier/SupplierLogin';
import SupplierRegister from '../pages/supplier/SupplierRegister';
import SupplierDashboard from '../pages/supplier/SupplierDashboard';
import SupplierPurchaseOrders from '../pages/supplier/SupplierPurchaseOrders';
import SupplierPurchaseOrderDetail from '../pages/supplier/SupplierPurchaseOrderDetail';
import SupplierProfile from '../pages/supplier/SupplierProfile';
import SupplierPayments from '../pages/supplier/SupplierPayments';
import CommunicationSettingsPage from '../pages/organizationadmin/CommunicationSettingsPage';
import WhatsAppSettingsPage from '../pages/Settings/WhatsAppSettings';
import WhatsAppAISettingsPage from '../pages/Settings/WhatsAppAISettings';
import WhatsAppInboxPage from '../pages/WhatsApp/WhatsAppInbox';
import WhatsAppOrdersPage from '../pages/WhatsApp/WhatsAppOrders';
import FacebookLeadsPage from '../pages/FacebookLeads/FacebookLeads';
import FacebookLeadsSettingsPage from '../pages/Settings/FacebookLeadsSettings';
import AttendancePage from '../pages/organizationadmin/AttendancePage';
import PayrollPage from '../pages/organizationadmin/PayrollPage';
import StaffAttendancePage from '../pages/branch/StaffAttendancePage';
import WooCommercePage from '../pages/organizationadmin/WooCommercePage';
import WooCommerceOrdersPage from '../pages/organizationadmin/WooCommerceOrdersPage';
import DiscountsPage from '../pages/organizationadmin/DiscountsPage';
import POSSettingsPage from '../pages/organizationadmin/POSSettingsPage';
import AddProductPage from '../pages/organizationadmin/AddProductPage';
import EditProductPage from '../pages/organizationadmin/EditProductPage';
import AllOrdersPage from '@/pages/organizationadmin/AllOrdersPage';
import BranchAllOrdersPage from '@/pages/branch/BranchAllOrdersPage';
import ActivityLogsPage from '@/pages/organizationadmin/ActivityLogsPage';
import ProductUsagePage from '@/pages/organizationadmin/ProductUsagePage';


/**
 * App Router
 * 
 * Route Protection Strategy:
 * - /platform/* : SUPER_ADMIN only - Platform management (organizations, permissions, subscriptions)
 * - /superadmin/* : SUPER_ADMIN only - Operational dashboard and business management
 * 
 * - /admin/* : ADMIN (organization admin) - manages their OWN business
 *   - No access to organization management
 *   - Can manage their business settings, staff, etc.
 * 
 * - /:branchCode/* : MANAGER, STAFF (and higher roles)
 *   - Branch-level operations
 */

const AppRouter = () => (
  <Routes>

      {/* <Route path="/home" element={<MainLayout />}> */}
        <Route path='/' element={<HomePage />} />
      {/* </Route> */}

      {/* Auth Routes - Wrap with AuthRedirect to handle already authenticated users */}
      <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
      <Route path="/admin/login" element={<AuthRedirect><AdminLoginPage /></AuthRedirect>} />
      <Route path="/select-branch" element={<BranchSelectPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* PUBLIC: garage estimate approval from SMS/WhatsApp link (token-secured) */}
      <Route path="/estimate-approval/:id" element={<EstimateApprovalPage />} />

      {/* PUBLIC: customer-facing rental fleet browse + booking request */}
      <Route path="/rent/:businessId" element={<RentalFleetPage />} />

      {/* Supplier Portal Routes - Public (Login/Register) */}
      <Route path="/supplier/login" element={<AuthRedirect><SupplierLogin /></AuthRedirect>} />
      <Route path="/supplier/register" element={<AuthRedirect><SupplierRegister /></AuthRedirect>} />

      {/* Supplier Portal Routes - Protected */}
      <Route
        path="/supplier"
        element={
          <SupplierProtectedRoute>
            <SupplierLayout />
          </SupplierProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/supplier/dashboard" replace />} />
        <Route path="dashboard" element={<SupplierDashboard />} />
        <Route path="purchase-orders" element={<SupplierPurchaseOrders />} />
        <Route path="purchase-orders/:id" element={<SupplierPurchaseOrderDetail />} />
        <Route path="payments" element={<SupplierPayments />} />
        <Route path="profile" element={<SupplierProfile />} />
      </Route>

      {/* 
        Organization Admin Routes - ADMIN only (organization-scoped)
        For managing their own business operations
        NOT for platform management - that's in /platform routes
      */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute 
            allowedRoles={[ROLES.ADMIN]} 
            allowedRoleNames={['ADMIN']}
            requireSuperAdmin={false}
          >
            <SuperadminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="quick-pos" element={
          <PermissionRoute permission={PERMISSIONS.SALES_CREATE}>
            <QuickPOSPage />
          </PermissionRoute>
        } />
        <Route path="shops/management" element={
          <PermissionRoute module="locations">
            <ShopPage />
          </PermissionRoute>
        } />
        <Route path="staff/management" element={
          <PermissionRoute module="users">
            <StaffPage />
          </PermissionRoute>
        } />
        <Route path="stock/management" element={
          <PermissionRoute module="products">
            <StockPage />
          </PermissionRoute>
        } />
        <Route path="stock/management/add" element={
          <PermissionRoute module="products">
            <AddProductPage />
          </PermissionRoute>
        } />
        <Route path="stock/management/edit/:productId" element={
          <PermissionRoute module="products">
            <EditProductPage />
          </PermissionRoute>
        } />
        <Route path="stock/dashboard" element={
          <PermissionRoute permission={PERMISSIONS.INVENTORY_READ}>
            <StockDashboardPage />
          </PermissionRoute>
        } />
        <Route path="stock/barcodes" element={
          <PermissionRoute module="products">
            <BarcodeGeneratorPage />
          </PermissionRoute>
        } />
        <Route path="categories/management" element={
          <PermissionRoute module="productcategories">
            <CategoriesPage />
          </PermissionRoute>
        } />
        <Route path="sales/monitor" element={
          <PermissionRoute module="sales">
            <SalesPage />
          </PermissionRoute>
        } />
        <Route path="orders/monitor" element={
          <PermissionRoute module="sales">
            <AllOrdersPage />
          </PermissionRoute>
        } />
        <Route path="sales" element={
          <PermissionRoute module="sales">
            <SalesPage />
          </PermissionRoute>
        } />
        <Route path="advance-payments" element={
          <PermissionRoute module="sales">
            <OrgAdvancePaymentsPage />
          </PermissionRoute>
        } />
        <Route path="job-sheets/monitor" element={
          <PermissionRoute module="jobsheets">
            <IndustryFeatureRoute feature="jobsheets">
              <JobSheetsPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="sale-jobs/monitor" element={
          <PermissionRoute module="salejobs">
            <BranchSaleJobsPage />
          </PermissionRoute>
        } />
        <Route path="parts/management" element={
          <PermissionRoute module="parts">
            <IndustryFeatureRoute feature="parts">
              <PartsPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="payments/management" element={
          <PermissionRoute module="payments">
            <PaymentsPage />
          </PermissionRoute>
        } />
        <Route path="installments" element={
          <PermissionRoute module="installments">
            <InstallmentsPage />
          </PermissionRoute>
        } />
        <Route path="inventory/monitor" element={
          <PermissionRoute module="inventory">
            <InventoryPage />
          </PermissionRoute>
        } />
        <Route path="customers/management" element={
          <PermissionRoute module="customers">
            <CustomersPage />
          </PermissionRoute>
        } />
        <Route path="warranty/management" element={
          <PermissionRoute module="warranty">
            <IndustryFeatureRoute feature="warranty">
              <WarrantyPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        {/* New verticals — industry-gated */}
        <Route path="rental" element={
          <PermissionRoute module="rental">
            <IndustryFeatureRoute feature="rental">
              <RentalPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="carwash" element={
          <PermissionRoute module="carwash">
            <IndustryFeatureRoute feature="carwash">
              <CarWashPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="garage" element={
          <PermissionRoute module="garage">
            <IndustryFeatureRoute feature="garage">
              <GaragePage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="trade-ins" element={
          <PermissionRoute module="tradein">
            <IndustryFeatureRoute feature="tradein">
              <TradeInsPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="suppliers/management" element={
          <PermissionRoute
            permissions={[
              PERMISSIONS.SUPPLIERS_READ,
              PERMISSIONS.SUPPLIERS_CREATE,
              PERMISSIONS.PURCHASEORDERS_READ,
              PERMISSIONS.PURCHASEORDERS_CREATE,
            ]}
          >
            <SuppliersPage />
          </PermissionRoute>
        } />
        <Route path="goods-receipts" element={
          <PermissionRoute module="goodsreceipts">
            <GoodsReceiptsPage />
          </PermissionRoute>
        } />
        <Route path="product-usage" element={
          <PermissionRoute module="inventory">
            <ProductUsagePage />
          </PermissionRoute>
        } />
        <Route path="addon-requests" element={
          <PermissionRoute permission={PERMISSIONS.PRODUCTS_READ}>
            <AddonRequestsPage />
          </PermissionRoute>
        } />
        <Route path="transfers" element={
          <PermissionRoute module="stock-transfers">
            <StockTransfersPage />
          </PermissionRoute>
        } />
        <Route path="reports" element={
          <PermissionRoute permissions={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT]}>
            <ReportsPage />
          </PermissionRoute>
        } />
        <Route path="activity-logs" element={
          <PermissionRoute permission={PERMISSIONS.ACTIVITYLOGS_READ}>
            <ActivityLogsPage />
          </PermissionRoute>
        } />
        <Route path="ai-analytics" element={
          <PermissionRoute module="aianalytics">
            <AIAnalyticsPage />
          </PermissionRoute>
        } />
        <Route path="returns" element={
          <PermissionRoute module="productreturns">
            <ReturnsPage />
          </PermissionRoute>
        } />
        <Route path="notifications/dashboard" element={
          <PermissionRoute module="notifications">
            <NotificationDashboard />
          </PermissionRoute>
        } />
        <Route path="notifications/settings" element={
          <PermissionRoute permission={PERMISSIONS.NOTIFICATIONS_MANAGE}>
            <NotificationSettings />
          </PermissionRoute>
        } />
        <Route path="roles/management" element={
          <PermissionRoute module="roles">
            <RoleManagementPage />
          </PermissionRoute>
        } />
        <Route path="courier/services" element={
          <PermissionRoute module="couriers">
            <CourierServicesPage />
          </PermissionRoute>
        } />
        <Route path="courier/shipments" element={
          <PermissionRoute module="couriers">
            <ShipmentTrackingPage />
          </PermissionRoute>
        } />
            {/* <Route path="courier/shipments/monitor" element={
              <PermissionRoute module="couriers">
            <CourierPage />
          </PermissionRoute>
        } /> */}
        <Route path="courier/management" element={
          <PermissionRoute module="couriers">
            <CourierPage />
          </PermissionRoute>
        } />
        <Route path="communication/settings" element={
          <PermissionRoute module="communication">
            <CommunicationSettingsPage />
          </PermissionRoute>
        } />
        <Route path="communication/whatsapp" element={
          <PermissionRoute permissions={[PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW]}>
            <WhatsAppSettingsPage />
          </PermissionRoute>
        } />
        <Route path="communication/whatsapp/ai" element={
          <PermissionRoute permissions={[PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW]}>
            <WhatsAppAISettingsPage />
          </PermissionRoute>
        } />
        <Route path="communication/whatsapp/inbox" element={
          <PermissionRoute permissions={[PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW]}>
            <WhatsAppInboxPage />
          </PermissionRoute>
        } />
        <Route path="communication/whatsapp/orders" element={
          <PermissionRoute permissions={[PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW]}>
            <WhatsAppOrdersPage />
          </PermissionRoute>
        } />
        <Route path="facebook-leads" element={
          <PermissionRoute permissions={[PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE]}>
            <FacebookLeadsPage />
          </PermissionRoute>
        } />
        <Route path="facebook-leads/settings" element={
          <PermissionRoute permissions={[PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE]}>
            <FacebookLeadsSettingsPage />
          </PermissionRoute>
        } />
        <Route path="woocommerce" element={
          <PermissionRoute module="products">
            <WooCommercePage />
          </PermissionRoute>
        } />
        <Route path="woocommerce/orders" element={
          <PermissionRoute module="products">
            <WooCommerceOrdersPage />
          </PermissionRoute>
        } />
        <Route path="discounts" element={
          <PermissionRoute module="products">
            <DiscountsPage />
          </PermissionRoute>
        } />
        <Route path="attendance" element={
          <PermissionRoute module="attendance">
            <AttendancePage />
          </PermissionRoute>
        } />
        <Route path="payroll" element={
          <PermissionRoute module="payroll">
            <PayrollPage />
          </PermissionRoute>
        } />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="pos/settings" element={<POSSettingsPage />} />
        <Route path="subscription/checkout" element={<SubscriptionCheckoutPage />} />
        <Route path="settings" element={<div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200"><h2 className="text-2xl font-bold text-gray-900">Settings - Coming Soon</h2></div>} />
      </Route>

      {/* 
        Platform Management Routes - SUPER_ADMIN only
        Separate layout for organization/permission/subscription management
      */}
      <Route
        path="/platform"
        element={
          <ProtectedRoute 
            allowedRoles={[ROLES.SUPER_ADMIN]} 
            allowedRoleNames={['SUPER_ADMIN']}
            requireSuperAdmin={true}
          >
            <PlatformLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/platform/overview" replace />} />
        <Route path="overview" element={<PlatformOverviewPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="roles" element={<PlatformRoleManagementPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="settings" element={<div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200"><h2 className="text-2xl font-bold text-gray-900">Platform Settings - Coming Soon</h2></div>} />
      </Route>

      {/* Branch Routes - Protected (Manager, Staff, and higher roles) */}
      <Route
        path="/:branchCode"
        element={
          // <ProtectedRoute allowedRoles={[ROLES.MANAGER,ROLES.SUPER_ADMIN]}>
            <BranchLayout />
          // </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<BranchDashboardPage />} />
        <Route path="pos" element={
          <PermissionRoute permission={PERMISSIONS.SALES_CREATE}>
            <POSPage />
          </PermissionRoute>
        } />
        <Route path="quick-pos" element={
          <PermissionRoute permission={PERMISSIONS.SALES_CREATE}>
            <QuickPOSPage />
          </PermissionRoute>
        } />
        <Route path="products" element={
          <PermissionRoute module="products">
            <ProductsPage />
          </PermissionRoute>
        } />
        <Route path="addon-requests" element={
          <PermissionRoute permission={PERMISSIONS.PRODUCTS_READ}>
            <BranchAddonRequestsPage />
          </PermissionRoute>
        } />
        <Route path="sales" element={
          <PermissionRoute module="sales">
            <BranchSalesPage />
          </PermissionRoute>
        } />
        <Route path="advance-payments" element={
          <PermissionRoute module="sales">
            <AdvancePaymentsPage />
          </PermissionRoute>
        } />

        <Route path="orders" element={
          <PermissionRoute module="sales">
            <BranchAllOrdersPage />
          </PermissionRoute>
        } />
        <Route path="cash-drawer" element={
          <PermissionRoute permission={PERMISSIONS.SALES_CREATE}>
            <CashDrawerPage />
          </PermissionRoute>
        } />
        <Route path="customers" element={
          <PermissionRoute module="customers">
            <BranchCustomersPage />
          </PermissionRoute>
        } />
        <Route path="customers/:customerId/financial-details/edit" element={
          <PermissionRoute permission={PERMISSIONS.CUSTOMER_FINANCIALS_UPDATE}>
            <EditCustomerFinancialDetailsPage />
          </PermissionRoute>
        } />
        <Route path="customers/:customerId/financial-details/add" element={
          <PermissionRoute permission={PERMISSIONS.CUSTOMER_FINANCIALS_CREATE}>
            <AddCustomerFinancialDetailsPage />
          </PermissionRoute>
        } />
        <Route path="jobsheets" element={
          <PermissionRoute module="jobsheets">
            <IndustryFeatureRoute feature="jobsheets">
              <BranchJobSheetsPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="sale-jobs" element={
          <PermissionRoute module="salejobs">
            <BranchSaleJobsPage />
          </PermissionRoute>
        } />
        <Route path="parts" element={
          <PermissionRoute module="parts">
            <IndustryFeatureRoute feature="parts">
              <PartsPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="returns" element={
          <PermissionRoute module="productreturns">
            <BranchReturnsPage />
          </PermissionRoute>
        } />
        <Route path="warranty" element={
          <PermissionRoute module="warranty">
            <IndustryFeatureRoute feature="warranty">
              <BranchWarrantyPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        {/* New verticals — branch level (same pages, businessId-scoped APIs) */}
        <Route path="rental" element={
          <PermissionRoute module="rental">
            <IndustryFeatureRoute feature="rental">
              <RentalPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="carwash" element={
          <PermissionRoute module="carwash">
            <IndustryFeatureRoute feature="carwash">
              <CarWashPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="garage" element={
          <PermissionRoute module="garage">
            <IndustryFeatureRoute feature="garage">
              <GaragePage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="trade-ins" element={
          <PermissionRoute module="tradein">
            <IndustryFeatureRoute feature="tradein">
              <TradeInsPage />
            </IndustryFeatureRoute>
          </PermissionRoute>
        } />
        <Route path="installments" element={
          <PermissionRoute permission={PERMISSIONS.INSTALLMENTS_READ}>
            <InstallmentsPage />
          </PermissionRoute>
        } />
        <Route path="installments/create" element={
          <PermissionRoute permission={PERMISSIONS.INSTALLMENTS_CREATE}>
            <CreateInstallmentPlanPage />
          </PermissionRoute>
        } />
        <Route path="installments/:id" element={
          <PermissionRoute permission={PERMISSIONS.INSTALLMENTS_READ}>
            <InstallmentDetailPage />
          </PermissionRoute>
        } />
        <Route path="courier" element={
          <PermissionRoute module="couriers">
            <BranchCourierPage />
          </PermissionRoute>
        } />
        <Route path="courier/performance" element={
          <PermissionRoute module="couriers">
            <CourierPerformancePage />
          </PermissionRoute>
        } />
        <Route path="barcodes" element={
          <PermissionRoute module="products">
            <BranchBarcodeGeneratorPage />
          </PermissionRoute>
        } />
        <Route path="stock/dashboard" element={
          <PermissionRoute permission={PERMISSIONS.INVENTORY_READ}>
            <StockDashboardPage />
          </PermissionRoute>
        } />
        <Route path="product-usage" element={
          <PermissionRoute module="inventory">
            <ProductUsagePage />
          </PermissionRoute>
        } />
        <Route path="woocommerce/orders" element={
          <PermissionRoute module="products">
            <WooCommerceOrdersPage />
          </PermissionRoute>
        } />
        <Route path="attendance" element={<StaffAttendancePage />} />
        <Route path="suppliers/management" element={
          <PermissionRoute
            permissions={[
              PERMISSIONS.SUPPLIERS_READ,
              PERMISSIONS.SUPPLIERS_CREATE,
              PERMISSIONS.PURCHASEORDERS_READ,
              PERMISSIONS.PURCHASEORDERS_CREATE,
            ]}
          >
            <SuppliersPage />
          </PermissionRoute>
        } />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200"><h2 className="text-2xl font-bold text-gray-900">Settings - Coming Soon</h2></div>} />
      </Route>

    </Routes>
);

export default AppRouter;