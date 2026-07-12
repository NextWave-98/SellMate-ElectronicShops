/**
 * Universal businessId Integration Script
 * 
 * This script provides patterns for updating all remaining hooks
 * Follow these patterns for each hook file
 */

// ===================================================================
// PATTERN 1: Standard Hook with Create/Update Operations
// ===================================================================

// Step 1: Add import at the top of the file
import { useAuth } from '../context/AuthContext';

// Step 2: Initialize businessId in the hook
const useHookName = () => {
  const { fetchData, loading, error, data, reset } = useFetch();
  const { user } = useAuth();
  const businessId = user?.businessId;

  // Step 3: Update POST operations
  const createItem = useCallback(async (itemData: CreateItemData) => {
    return await fetchData({
      endpoint: '/items',
      method: 'POST',
      data: { ...itemData, businessId },  // ← ADD THIS
      successMessage: 'Item created successfully',
    });
  }, [fetchData, businessId]);  // ← ADD businessId

  // Step 4: Update PUT operations
  const updateItem = useCallback(async (id: string, itemData: UpdateItemData) => {
    return await fetchData({
      endpoint: `/items/${id}`,
      method: 'PUT',
      data: { ...itemData, businessId },  // ← ADD THIS
      successMessage: 'Item updated successfully',
    });
  }, [fetchData, businessId]);  // ← ADD businessId

  // Step 5: Update PATCH operations
  const updateStatus = useCallback(async (id: string, status: string) => {
    return await fetchData({
      endpoint: `/items/${id}/status`,
      method: 'PATCH',
      data: { status, businessId },  // ← ADD THIS
      successMessage: 'Status updated',
    });
  }, [fetchData, businessId]);  // ← ADD businessId

  // Step 6: Update GET operations with filters
  const getAllItems = useCallback(async (filters?: ItemFilters) => {
    const queryParams = new URLSearchParams();
    if (businessId) queryParams.append('businessId', businessId);  // ← ADD THIS
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({ endpoint, method: 'GET', silent: true });
  }, [fetchData, businessId]);  // ← ADD businessId

  return { getAllItems, createItem, updateItem, updateStatus, loading, error, reset };
};

// ===================================================================
// PATTERN 2: Multiple useFetch Instances (like useJobSheet)
// ===================================================================

const useJobSheet = () => {
  const createJobSheetFetch = useFetch();
  const updateJobSheetFetch = useFetch();
  const { user } = useAuth();  // ← ADD THIS
  const businessId = user?.businessId;  // ← ADD THIS

  const createJobSheet = useCallback(
    async (data: CreateJobSheetData) => {
      return createJobSheetFetch.fetchData({
        endpoint: '/jobsheets',
        method: 'POST',
        data: { ...data, businessId },  // ← ADD businessId
        successMessage: 'Job sheet created successfully!',
      });
    },
    [createJobSheetFetch, businessId]  // ← ADD businessId
  );

  const updateJobSheet = useCallback(
    async (id: string, data: UpdateJobSheetData) => {
      return updateJobSheetFetch.fetchData({
        endpoint: `/jobsheets/${id}`,
        method: 'PUT',
        data: { ...data, businessId },  // ← ADD businessId
        successMessage: 'Job sheet updated successfully!',
      });
    },
    [updateJobSheetFetch, businessId]  // ← ADD businessId
  );

  return { createJobSheet, updateJobSheet };
};

// ===================================================================
// SPECIFIC HOOKS TO UPDATE
// ===================================================================

/*
1. useJobSheet.ts
   - Import useAuth
   - Add businessId to: createJobSheet, updateJobSheet, updateJobStatus
   - Add businessId to: addPartToJob, addProductToJob, createPayment

2. useDevice.ts / useDevicesBranch.ts
   - Import useAuth
   - Add businessId to: createDevice, updateDevice

3. useProductCategory.ts
   - Import useAuth
   - Add businessId to: createCategory, updateCategory

4. useGoodsReceipt.ts
   - Import useAuth
   - Add businessId to: createGoodsReceipt, updateGoodsReceipt, updateGoodsReceiptItem

5. useProductReturn.ts
   - Import useAuth
   - Add businessId to: createReturn, updateReturn

6. useStock.ts / useStockTransfer.ts
   - Import useAuth
   - Add businessId to: createStockRelease, createBranchTransfer, updateStockRelease

7. useWarranty.ts
   - Import useAuth
   - Add businessId to all create/update operations

8. useLocation.ts / useBranch.ts
   - Import useAuth
   - Add businessId to: createLocation, updateLocation

9. useStaff.ts
   - Import useAuth
   - Add businessId to: createStaff, updateStaff

10. useRole.ts
    - Import useAuth
    - Add businessId to: createRole, updateRole

11. useCourier.ts
    - Import useAuth
    - Add businessId to all courier operations

12. useAddonRequest.ts
    - Import useAuth
    - Add businessId to: createAddonRequest, updateAddonRequest

13. useSubscription.ts
    - Import useAuth
    - Add businessId to all subscription operations

14. useNotification.ts
    - Import useAuth
    - Add businessId to: updateNotificationSettings

15. useSMS.ts
    - Import useAuth
    - Add businessId to SMS operations
*/

// ===================================================================
// QUICK FIND & REPLACE PATTERNS (Use with caution!)
// ===================================================================

/*
FIND:    const { fetchData, loading, error, data, reset } = useFetch();
REPLACE: const { fetchData, loading, error, data, reset } = useFetch();
         const { user } = useAuth();
         const businessId = user?.businessId;

FIND:    data: createData,
REPLACE: data: { ...createData, businessId },

FIND:    data: updateData,
REPLACE: data: { ...updateData, businessId },

FIND:    }, [fetchData]);
REPLACE: }, [fetchData, businessId]);

FIND:    }, [xxxFetch]);
REPLACE: }, [xxxFetch, businessId]);
*/

// ===================================================================
// TESTING CHECKLIST
// ===================================================================

/*
After updating each hook:
1. ✓ Verify import statement added
2. ✓ Verify businessId initialized
3. ✓ Check all POST methods have businessId
4. ✓ Check all PUT methods have businessId
5. ✓ Check all PATCH methods have businessId
6. ✓ Check all dependencies updated
7. ✓ Run TypeScript compiler (npm run build)
8. ✓ Test in development with actual API calls
9. ✓ Verify backend receives businessId
10. ✓ Check for any console errors
*/

export {};
