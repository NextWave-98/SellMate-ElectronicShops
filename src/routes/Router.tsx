import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperadminLayout from '../layouts/superadmin/SuperadminLayout';

// ─── Lazily-loaded route components ─────────────────────────────────────────
// Each of these becomes its own chunk, fetched only when the route is visited.
// Guards, layouts and the login/landing pages stay eagerly imported above.
const DashboardPage = lazy(() => import('../pages/organizationadmin/DashboardPage'));
const ShopPage = lazy(() => import('../pages/organizationadmin/ShopPage'));
const StaffPage = lazy(() => import('../pages/organizationadmin/StaffPage'));
const StockPage = lazy(() => import('../pages/organizationadmin/StockPage'));
const CategoriesPage = lazy(() => import('../pages/organizationadmin/CategoriesPage'));
const SalesPage = lazy(() => import('../pages/organizationadmin/SalesPage'));
const JobSheetsPage = lazy(() => import('../pages/organizationadmin/JobSheetsPage'));
const PartsPage = lazy(() => import('../pages/organizationadmin/PartsPage'));
const InventoryPage = lazy(() => import('../pages/organizationadmin/InventoryPage'));
const CustomersPage = lazy(() => import('../pages/organizationadmin/CustomersPage'));
const WarrantyPage = lazy(() => import('../components/superadmin/warranty/WarrantyPage'));
const SuppliersPage = lazy(() => import('../pages/organizationadmin/SuppliersPage'));
const GoodsReceiptsPage = lazy(() => import('../pages/organizationadmin/GoodsReceiptsPage'));
const StockTransfersPage = lazy(() => import('../pages/organizationadmin/StockTransfersPage'));
const ReportsPage = lazy(() => import('../pages/organizationadmin/ReportsPage'));
const AccountingLayout = lazy(() => import('../pages/organizationadmin/accounting/AccountingLayout'));
const AccountingAccountsPage = lazy(() => import('../pages/organizationadmin/accounting/AccountingAccountsPage'));
const AccountingJournalsPage = lazy(() => import('../pages/organizationadmin/accounting/AccountingJournalsPage'));
const AccountingReportsPage = lazy(() => import('../pages/organizationadmin/accounting/AccountingReportsPage'));
const SystemUsagePage = lazy(() => import('../pages/organizationadmin/SystemUsagePage'));
const AIAnalyticsPage = lazy(() => import('../pages/organizationadmin/AIAnalyticsPage'));
const AddonRequestsPage = lazy(() => import('../pages/admin/AddonRequestsPage'));
const StockDashboardPage = lazy(() => import('../pages/organizationadmin/StockDashboardPage'));
const BarcodeGeneratorPage = lazy(() => import('../pages/organizationadmin/BarcodeGeneratorPage'));
const PaymentsPage = lazy(() => import('../pages/organizationadmin/PaymentsPage'));
const InvoicesPage = lazy(() => import('../pages/organizationadmin/InvoicesPage'));
const PublicInvoicePage = lazy(() => import('../pages/public/PublicInvoicePage'));
const PublicBillPage = lazy(() => import('../pages/public/PublicBillPage'));
const ReturnsPage = lazy(() => import('../pages/organizationadmin/ReturnsPage'));
const NotificationSettings = lazy(() => import('../components/superadmin/notifications/NotificationSettings'));
const NotificationDashboard = lazy(() => import('../components/superadmin/notifications/NotificationDashboard'));
const CourierPage = lazy(() => import('../pages/home/CourierServicesPage'));
const CourierServicesPage = lazy(() => import('../pages/home/CourierServicesPage'));
const ShipmentTrackingPage = lazy(() => import('../pages/organizationadmin/ShipmentTrackingPage'));
const PermissionsPage = lazy(() => import('../pages/organizationadmin/PermissionsPage'));
const RoleManagementPage = lazy(() => import('../pages/organizationadmin/RoleManagementPage'));
const OrganizationsPage = lazy(() => import('../pages/organizationadmin/OrganizationsPage'));
const SubscriptionsPage = lazy(() => import('../pages/organizationadmin/SubscriptionsPage'));
const SubscriptionCheckoutPage = lazy(() => import('../pages/organizationadmin/SubscriptionCheckoutPage'));
const PlatformRoleManagementPage = lazy(() => import('../pages/platformcontroladmin/PlatformRoleManagementPage'));
const WebsiteCmsLayout = lazy(() => import('../pages/organizationadmin/websitecms/WebsiteCmsLayout'));
const CmsSettingsPage = lazy(() => import('../pages/organizationadmin/websitecms/CmsSettingsPage'));
const CmsPagesPage = lazy(() => import('../pages/organizationadmin/websitecms/CmsPagesPage'));
const CmsBlogPage = lazy(() => import('../pages/organizationadmin/websitecms/CmsBlogPage'));
const CmsTestimonialsPage = lazy(() => import('../pages/organizationadmin/websitecms/CmsTestimonialsPage'));
const BranchSelectPage = lazy(() => import('../pages/auth/BranchSelectPage'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const BranchDashboardPage = lazy(() => import('../pages/branch/BranchDashboardPage'));
const POSPage = lazy(() => import('../pages/branch/POSPage'));
const QuickPOSPage = lazy(() => import('../pages/branch/QuickPOSPage'));
const CustomerDisplayPage = lazy(() => import('../pages/branch/CustomerDisplayPage'));
const ProductsPage = lazy(() => import('../pages/branch/ProductsPage'));
const BranchAddonRequestsPage = lazy(() => import('../pages/branch/AddonRequestsPage'));
const BranchCustomersPage = lazy(() => import('../pages/branch/CustomersPage'));
const BranchSalesPage = lazy(() => import('../pages/branch/BranchSalesPage'));
const BranchJobSheetsPage = lazy(() => import('../pages/branch/JobSheetsPage'));
const BranchSaleJobsPage = lazy(() => import('../pages/branch/SaleJobsPage'));
const BranchReturnsPage = lazy(() => import('../pages/branch/ReturnsPage'));
const BranchWarrantyPage = lazy(() => import('../pages/branch/BranchWarrantyPage'));
const ProfilePage = lazy(() => import('../pages/organizationadmin/ProfilePage'));
const InstallmentsPage = lazy(() => import('../pages/branch/InstallmentsPage'));
const CreateInstallmentPlanPage = lazy(() => import('../pages/branch/CreateInstallmentPlanPage'));
const InstallmentDetailPage = lazy(() => import('../pages/branch/InstallmentDetailPage'));
const EditInstallmentPlanPage = lazy(() => import('../pages/branch/EditInstallmentPlanPage'));
const EditCustomerFinancialDetailsPage = lazy(() => import('../pages/branch/EditCustomerFinancialDetailsPage'));
const AddCustomerFinancialDetailsPage = lazy(() => import('../pages/branch/AddCustomerFinancialDetailsPage'));
const BranchCourierPage = lazy(() => import('../pages/branch/CourierPage'));
const CourierPerformancePage = lazy(() => import('../pages/branch/CourierPerformancePage'));
const AdvancePaymentsPage = lazy(() => import('../pages/branch/AdvancePaymentsPage'));
const OrgAdvancePaymentsPage = lazy(() => import('../pages/organizationadmin/AdvancePaymentsPage'));
const BranchBarcodeGeneratorPage = lazy(() => import('../pages/branch/BarcodeGeneratorPage'));
const CashDrawerPage = lazy(() => import('../pages/branch/CashDrawerPage'));
const CashDrawerOverviewPage = lazy(() => import('../pages/organizationadmin/CashDrawerOverviewPage'));
const OrgNotificationsPage = lazy(() => import('../pages/organizationadmin/NotificationsPage'));
const AdminLoginPage = lazy(() => import('../pages/auth/AdminLoginPage'));
const PlatformOverviewPage = lazy(() => import('../pages/platformcontroladmin/PlatformOverviewPage'));
const SupplierLogin = lazy(() => import('../pages/supplier/SupplierLogin'));
const SupplierRegister = lazy(() => import('../pages/supplier/SupplierRegister'));
const SupplierDashboard = lazy(() => import('../pages/supplier/SupplierDashboard'));
const SupplierPurchaseOrders = lazy(() => import('../pages/supplier/SupplierPurchaseOrders'));
const SupplierPurchaseOrderDetail = lazy(() => import('../pages/supplier/SupplierPurchaseOrderDetail'));
const SupplierProfile = lazy(() => import('../pages/supplier/SupplierProfile'));
const SupplierPayments = lazy(() => import('../pages/supplier/SupplierPayments'));
const CommunicationSettingsPage = lazy(() => import('../pages/organizationadmin/CommunicationSettingsPage'));
const WhatsAppSettingsPage = lazy(() => import('../pages/Settings/WhatsAppSettings'));
const WhatsAppAISettingsPage = lazy(() => import('../pages/Settings/WhatsAppAISettings'));
const WhatsAppInboxPage = lazy(() => import('../pages/WhatsApp/WhatsAppInbox'));
const WhatsAppOrdersPage = lazy(() => import('../pages/WhatsApp/WhatsAppOrders'));
const FacebookLeadsPage = lazy(() => import('../pages/FacebookLeads/FacebookLeads'));
const FacebookLeadsSettingsPage = lazy(() => import('../pages/Settings/FacebookLeadsSettings'));
const LeadFormsPage = lazy(() => import('../pages/FacebookLeads/LeadFormsPage'));
const AttendancePage = lazy(() => import('../pages/organizationadmin/AttendancePage'));
const PayrollPage = lazy(() => import('../pages/organizationadmin/PayrollPage'));
const StaffAttendancePage = lazy(() => import('../pages/branch/StaffAttendancePage'));
const KioskAttendancePage = lazy(() => import('../pages/branch/KioskAttendancePage'));
const WooCommercePage = lazy(() => import('../pages/organizationadmin/WooCommercePage'));
const WooCommerceOrdersPage = lazy(() => import('../pages/organizationadmin/WooCommerceOrdersPage'));
const DiscountsPage = lazy(() => import('../pages/organizationadmin/DiscountsPage'));
const FreeOffersPage = lazy(() => import('../pages/organizationadmin/FreeOffersPage'));
const POSSettingsPage = lazy(() => import('../pages/organizationadmin/POSSettingsPage'));
const AddProductPage = lazy(() => import('../pages/organizationadmin/AddProductPage'));
const EditProductPage = lazy(() => import('../pages/organizationadmin/EditProductPage'));
const BranchStaffReportsPage = lazy(() => import('../pages/branch/BranchStaffReportsPage'));
const CrmTasksPage = lazy(() => import('../pages/organizationadmin/CrmTasksPage'));
const WebsiteOrdersPage = lazy(() => import('../pages/organizationadmin/WebsiteOrdersPage'));
const StaffSkillsPage = lazy(() => import('../pages/organizationadmin/StaffSkillsPage'));
const TradeInLayout = lazy(() => import('../pages/organizationadmin/tradein/TradeInLayout'));
const TradeInsListPage = lazy(() => import('../pages/organizationadmin/tradein/TradeInsListPage'));
const TradeInRulesPage = lazy(() => import('../pages/organizationadmin/tradein/TradeInRulesPage'));

import HomePage from '../pages/home/HomePage';
// import MainLayout from '../layouts/main/MainLayout';
// import NotificationsPage from '../pages/superadmin/NotificationsPage';
// Super Admin Management Pages
import ProtectedRoute from './ProtectedRouteRedux';
import { PermissionRoute } from './PermissionRoute';
import IndustryFeatureRoute from './IndustryFeatureRoute';
import OrgFeatureRoute from './OrgFeatureRoute';
import LoginPage from '../pages/auth/LoginPage';
import { ROLES } from '../constants/roles';
import { PERMISSIONS } from '../store/types';
import BranchLayout from '../layouts/branch/BranchLayout';
import PlatformLayout from '../layouts/platform/PlatformLayout';
import AuthRedirect from './AuthRedirect';
// Supplier Portal Imports
import SupplierProtectedRoute from './SupplierProtectedRoute';
import SupplierLayout from '../layouts/supplier/SupplierLayout';
import AllOrdersPage from '@/pages/organizationadmin/AllOrdersPage';
import BranchAllOrdersPage from '@/pages/branch/BranchAllOrdersPage';
import ActivityLogsPage from '@/pages/organizationadmin/ActivityLogsPage';
import ProductUsagePage from '@/pages/organizationadmin/ProductUsagePage';
import SerialNumbersPage from '@/pages/organizationadmin/SerialNumbersPage';


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
  <Suspense
    fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    }
  >
  <Routes>

      {/* <Route path="/home" element={<MainLayout />}> */}
        <Route path='/' element={<HomePage />} />
      {/* </Route> */}

      {/* Auth Routes - Wrap with AuthRedirect to handle already authenticated users */}
      <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
      <Route path="/admin/login" element={<AuthRedirect><AdminLoginPage /></AuthRedirect>} />
      <Route path="/select-branch" element={<BranchSelectPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/invoice/:shareToken" element={<PublicInvoicePage />} />
      {/* Customer-facing Quick POS bill link   no auth, resolved by token */}
      <Route path="/bill/:shareToken" element={<PublicBillPage />} />
      <Route path="/pos/customer-display" element={<CustomerDisplayPage />} />

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
        <Route path="system-usage" element={<SystemUsagePage />} />
        <Route path="quick-pos" element={
          <PermissionRoute permission={PERMISSIONS.SALES_CREATE}>
            <QuickPOSPage />
          </PermissionRoute>
        } />
        <Route path="cash-drawer" element={
          <PermissionRoute permission={PERMISSIONS.SALES_READ}>
            <CashDrawerOverviewPage />
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
          <PermissionRoute permission={PERMISSIONS.PRODUCTS_CREATE}>
            <AddProductPage />
          </PermissionRoute>
        } />
        <Route path="stock/management/edit/:productId" element={
          <PermissionRoute permission={PERMISSIONS.PRODUCTS_UPDATE}>
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
        <Route path="invoices" element={
          <PermissionRoute module="invoices">
            <InvoicesPage />
          </PermissionRoute>
        } />
        <Route path="installments" element={
          <PermissionRoute module="installments">
            <InstallmentsPage />
          </PermissionRoute>
        } />
        <Route path="installments/create" element={
          <PermissionRoute module="installments">
            <CreateInstallmentPlanPage />
          </PermissionRoute>
        } />
        <Route path="installments/:id" element={
          <PermissionRoute module="installments">
            <InstallmentDetailPage />
          </PermissionRoute>
        } />
        <Route path="installments/:id/edit" element={
          <PermissionRoute module="installments">
            <EditInstallmentPlanPage />
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
        <Route path="crm-tasks" element={
          <PermissionRoute module="crm">
            <CrmTasksPage />
          </PermissionRoute>
        } />
        <Route path="website-orders" element={
          <PermissionRoute module="sales">
            <WebsiteOrdersPage />
          </PermissionRoute>
        } />
        <Route path="staff-skills" element={
          <PermissionRoute module="staff">
            <StaffSkillsPage />
          </PermissionRoute>
        } />
        <Route path="trade-ins" element={
          <PermissionRoute module="tradein">
            <IndustryFeatureRoute feature="tradein">
              <TradeInLayout />
            </IndustryFeatureRoute>
          </PermissionRoute>
        }>
          <Route index element={<TradeInsListPage />} />
          <Route path="rules" element={<TradeInRulesPage />} />
        </Route>
        {/* Warranty is now an organization CHOICE, not a consequence of the
            organization's industry type   so the industry guard is gone and the
            org-feature guard takes its place. A clothing shop that sells
            warrantied goods can switch it on; an electronics shop that does not
            want it can leave it off. */}
        <Route path="warranty/management" element={
          <PermissionRoute module="warranty">
            <OrgFeatureRoute feature="warranty">
              <WarrantyPage />
            </OrgFeatureRoute>
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
        <Route path="serials" element={
          <PermissionRoute module="inventory">
            <SerialNumbersPage />
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
        <Route path="accounting" element={
          <PermissionRoute permissions={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT]}>
            <AccountingLayout />
          </PermissionRoute>
        }>
          <Route index element={<AccountingAccountsPage />} />
          <Route path="journals" element={<AccountingJournalsPage />} />
          <Route path="reports" element={<AccountingReportsPage />} />
        </Route>
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
        <Route path="facebook-leads/forms" element={
          <PermissionRoute permissions={[PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE]}>
            <LeadFormsPage />
          </PermissionRoute>
        } />
        <Route path="website" element={
          <PermissionRoute module="cms">
            <WebsiteCmsLayout />
          </PermissionRoute>
        }>
          <Route index element={<CmsSettingsPage />} />
          <Route path="pages" element={<CmsPagesPage />} />
          <Route path="blog" element={<CmsBlogPage />} />
          <Route path="testimonials" element={<CmsTestimonialsPage />} />
        </Route>
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
        <Route path="free-offers" element={
          <PermissionRoute module="products">
            <FreeOffersPage />
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
        <Route path="system-usage" element={<SystemUsagePage />} />
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
        <Route path="products/add" element={
          <PermissionRoute permission={PERMISSIONS.PRODUCTS_CREATE}>
            <AddProductPage />
          </PermissionRoute>
        } />
        <Route path="products/edit/:productId" element={
          <PermissionRoute permission={PERMISSIONS.PRODUCTS_UPDATE}>
            <EditProductPage />
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
        <Route path="notifications" element={
          <OrgNotificationsPage />
        } />
        <Route path="customers" element={
          <PermissionRoute module="customers">
            <BranchCustomersPage />
          </PermissionRoute>
        } />
        <Route path="crm-tasks" element={
          <PermissionRoute module="crm">
            <CrmTasksPage />
          </PermissionRoute>
        } />
        <Route path="website-orders" element={
          <PermissionRoute module="sales">
            <WebsiteOrdersPage />
          </PermissionRoute>
        } />
        <Route path="staff-skills" element={
          <PermissionRoute module="staff">
            <StaffSkillsPage />
          </PermissionRoute>
        } />
        <Route path="trade-ins" element={
          <PermissionRoute module="tradein">
            <IndustryFeatureRoute feature="tradein">
              <TradeInLayout />
            </IndustryFeatureRoute>
          </PermissionRoute>
        }>
          <Route index element={<TradeInsListPage />} />
          <Route path="rules" element={<TradeInRulesPage />} />
        </Route>
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
            <OrgFeatureRoute feature="warranty">
              <BranchWarrantyPage />
            </OrgFeatureRoute>
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
        <Route path="installments/:id/edit" element={
          <PermissionRoute permission={PERMISSIONS.INSTALLMENTS_UPDATE}>
            <EditInstallmentPlanPage />
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
        <Route path="serials" element={
          <PermissionRoute module="inventory">
            <SerialNumbersPage />
          </PermissionRoute>
        } />
        <Route path="website" element={
          <PermissionRoute module="cms">
            <WebsiteCmsLayout />
          </PermissionRoute>
        }>
          <Route index element={<CmsSettingsPage />} />
          <Route path="pages" element={<CmsPagesPage />} />
          <Route path="blog" element={<CmsBlogPage />} />
          <Route path="testimonials" element={<CmsTestimonialsPage />} />
        </Route>
        <Route path="woocommerce/orders" element={
          <PermissionRoute module="products">
            <WooCommerceOrdersPage />
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
        <Route path="facebook-leads/forms" element={
          <PermissionRoute permissions={[PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE]}>
            <LeadFormsPage />
          </PermissionRoute>
        } />
        <Route path="attendance" element={<StaffAttendancePage />} />
        <Route path="attendance/kiosk" element={<KioskAttendancePage />} />
        <Route path="staff-reports" element={<BranchStaffReportsPage />} />
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
        <Route path="accounting" element={
          <PermissionRoute permissions={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT]}>
            <AccountingLayout />
          </PermissionRoute>
        }>
          <Route index element={<AccountingAccountsPage />} />
          <Route path="journals" element={<AccountingJournalsPage />} />
          <Route path="reports" element={<AccountingReportsPage />} />
        </Route>
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200"><h2 className="text-2xl font-bold text-gray-900">Settings - Coming Soon</h2></div>} />
      </Route>

    </Routes>
  </Suspense>
);

export default AppRouter;