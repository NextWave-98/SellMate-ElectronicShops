import { useState, useCallback } from 'react';
import useFetch from './useFetch';
import type {
  SubscriptionPlan,
  SubscriptionPlansListResponse,
  SubscriptionPlanFilters,
  CreateSubscriptionPlanDTO,
  UpdateSubscriptionPlanDTO,
  BusinessSubscription,
  BusinessSubscriptionsListResponse,
  BusinessSubscriptionFilters,
  CreateBusinessSubscriptionDTO,
  UpdateBusinessSubscriptionDTO,
  SubscriptionPayment,
  SubscriptionPaymentsListResponse,
  SubscriptionPaymentFilters,
  CreateSubscriptionPaymentDTO,
  PayPalCreateOrderResponse,
  PayPalCaptureResponse,
} from '../types/subscription.types';

export const useSubscription = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscription Plans
  const plansFetch = useFetch<SubscriptionPlansListResponse>('/subscriptions-plans');
  const planByIdFetch = useFetch<SubscriptionPlan>('/subscriptions/plans/:id');
  const createPlanFetch = useFetch<SubscriptionPlan>('/subscriptions/plans');
  const updatePlanFetch = useFetch<SubscriptionPlan>('/subscriptions/plans/:id');
  const deletePlanFetch = useFetch<{ message: string }>('/subscriptions/plans/:id');

  // Business Subscriptions
  const subscriptionsFetch = useFetch<BusinessSubscriptionsListResponse>('/subscriptions/subscriptions');
  const subscriptionByIdFetch = useFetch<BusinessSubscription>('/subscriptions/subscriptions/:id');
  const activeSubscriptionFetch = useFetch<BusinessSubscription>('/subscriptions/subscriptions/business/:businessId/active');
  const createSubscriptionFetch = useFetch<BusinessSubscription>('/subscriptions/subscriptions');
  const updateSubscriptionFetch = useFetch<BusinessSubscription>('/subscriptions/subscriptions/:id');
  const cancelSubscriptionFetch = useFetch<BusinessSubscription>('/subscriptions/subscriptions/:id/cancel');
  const renewSubscriptionFetch = useFetch<BusinessSubscription>('/subscriptions/subscriptions/:id/renew');

  // Subscription Payments
  const paymentsFetch = useFetch<SubscriptionPaymentsListResponse>('/subscriptions/payments');
  const paymentByIdFetch = useFetch<SubscriptionPayment>('/subscriptions/payments/:id');
  const createPaymentFetch = useFetch<SubscriptionPayment>('/subscriptions/payments');

  // Check expiry
  const checkExpiryFetch = useFetch<{ message: string }>('/subscriptions/check-expiry');

  // PayPal
  const paypalClientIdFetch = useFetch<{ clientId: string }>('/paypal/client-id');
  const paypalCreateOrderFetch = useFetch<PayPalCreateOrderResponse>('/paypal/create-order/new-subscription');
  const paypalCaptureOrderFetch = useFetch<PayPalCaptureResponse>('/paypal/capture-order/activate');

  // ==================== SUBSCRIPTION PLANS ====================

  /**
   * Get all subscription plans
   */
  const getSubscriptionPlans = useCallback(
    async (filters?: SubscriptionPlanFilters) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();

        if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
        if (filters?.planType) queryParams.append('planType', filters.planType);

        const endpoint = queryParams.toString()
          ? `/subscription-plans-public?${queryParams.toString()}`
          : '/subscription-plans-public';

        const response = await plansFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch subscription plans';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Get subscription plan by ID
   */
  const getSubscriptionPlanById = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await planByIdFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint: `/subscriptions/plans/${id}`,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch subscription plan';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Create subscription plan
   */
  const createSubscriptionPlan = useCallback(
    async (data: CreateSubscriptionPlanDTO) => {
      setLoading(true);
      setError(null);
      try {
        const response = await createPlanFetch.fetchData({
          method: 'POST',
          endpoint: '/subscriptions/plans',
          data,
          successMessage: 'Subscription plan created successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create subscription plan';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Update subscription plan
   */
  const updateSubscriptionPlan = useCallback(
    async (id: string, data: UpdateSubscriptionPlanDTO) => {
      setLoading(true);
      setError(null);
      try {
        const response = await updatePlanFetch.fetchData({
          method: 'PUT',
          endpoint: `/subscriptions/plans/${id}`,
          data,
          successMessage: 'Subscription plan updated successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update subscription plan';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Delete subscription plan
   */
  const deleteSubscriptionPlan = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await deletePlanFetch.fetchData({
          method: 'DELETE',
          endpoint: `/subscriptions/plans/${id}`,
          successMessage: 'Subscription plan deleted successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete subscription plan';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ==================== BUSINESS SUBSCRIPTIONS ====================

  /**
   * Get all business subscriptions
   */
  const getBusinessSubscriptions = useCallback(
    async (filters?: BusinessSubscriptionFilters) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();

        if (filters?.businessId) queryParams.append('businessId', filters.businessId);
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.planId) queryParams.append('planId', filters.planId);
        if (filters?.page) queryParams.append('page', filters.page.toString());
        if (filters?.limit) queryParams.append('limit', filters.limit.toString());

        const endpoint = queryParams.toString()
          ? `/subscriptions/subscriptions?${queryParams.toString()}`
          : '/subscriptions/subscriptions';

        const response = await subscriptionsFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch business subscriptions';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Get business subscription by ID
   */
  const getBusinessSubscriptionById = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await subscriptionByIdFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint: `/subscriptions/subscriptions/${id}`,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch business subscription';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Get active subscription by business ID
   */
  const getActiveSubscriptionByBusinessId = useCallback(
    async (businessId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await activeSubscriptionFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint: `/subscriptions/subscriptions/business/${businessId}/active`,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch active subscription';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Create business subscription
   */
  const createBusinessSubscription = useCallback(
    async (data: CreateBusinessSubscriptionDTO) => {
      setLoading(true);
      setError(null);
      try {
        const response = await createSubscriptionFetch.fetchData({
          method: 'POST',
          endpoint: '/subscriptions/subscriptions',
          data,
          successMessage: 'Subscription created successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create subscription';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Update business subscription
   */
  const updateBusinessSubscription = useCallback(
    async (id: string, data: UpdateBusinessSubscriptionDTO) => {
      setLoading(true);
      setError(null);
      try {
        const response = await updateSubscriptionFetch.fetchData({
          method: 'PUT',
          endpoint: `/subscriptions/subscriptions/${id}`,
          data,
          successMessage: 'Subscription updated successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update subscription';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Cancel business subscription
   */
  const cancelBusinessSubscription = useCallback(
    async (id: string, reason: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await cancelSubscriptionFetch.fetchData({
          method: 'POST',
          endpoint: `/subscriptions/subscriptions/${id}/cancel`,
          data: { reason },
          successMessage: 'Subscription cancelled successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to cancel subscription';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Renew business subscription
   */
  const renewBusinessSubscription = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await renewSubscriptionFetch.fetchData({
          method: 'POST',
          endpoint: `/subscriptions/subscriptions/${id}/renew`,
          successMessage: 'Subscription renewed successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to renew subscription';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ==================== SUBSCRIPTION PAYMENTS ====================

  /**
   * Get subscription payments
   */
  const getSubscriptionPayments = useCallback(
    async (filters?: SubscriptionPaymentFilters) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();

        if (filters?.subscriptionId) queryParams.append('subscriptionId', filters.subscriptionId);
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.startDate) queryParams.append('startDate', filters.startDate);
        if (filters?.endDate) queryParams.append('endDate', filters.endDate);
        if (filters?.page) queryParams.append('page', filters.page.toString());
        if (filters?.limit) queryParams.append('limit', filters.limit.toString());

        const endpoint = queryParams.toString()
          ? `/subscriptions/payments?${queryParams.toString()}`
          : '/subscriptions/payments';

        const response = await paymentsFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch subscription payments';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Get subscription payment by ID
   */
  const getSubscriptionPaymentById = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await paymentByIdFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint: `/subscriptions/payments/${id}`,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch subscription payment';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Create subscription payment
   */
  const createSubscriptionPayment = useCallback(
    async (data: CreateSubscriptionPaymentDTO) => {
      setLoading(true);
      setError(null);
      try {
        const response = await createPaymentFetch.fetchData({
          method: 'POST',
          endpoint: '/subscriptions/payments',
          data,
          successMessage: 'Payment recorded successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create payment';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Check subscription expiry
   */
  const checkSubscriptionExpiry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await checkExpiryFetch.fetchData({
        method: 'POST',
        endpoint: '/subscriptions/check-expiry',
        successMessage: 'Expiry check completed',
      });
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check subscription expiry';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== PAYPAL ====================

  const getPayPalClientId = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await paypalClientIdFetch.fetchData({
        method: 'GET',
        silent: true,
        endpoint: '/paypal/client-id',
      });
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get PayPal client ID';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPayPalOrder = useCallback(
    async (data: { planId: string; billingCycle: string; currency?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await paypalCreateOrderFetch.fetchData({
          method: 'POST',
          endpoint: '/paypal/create-order/new-subscription',
          data,
          silent: true,
        });

        if (!response?.success || !response?.data || !(response.data as PayPalCreateOrderResponse).orderID) {
          throw new Error(response?.message || 'Failed to create PayPal order');
        }

        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create PayPal order';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const capturePayPalOrder = useCallback(
    async (data: { orderID: string; planId: string; billingCycle: string; autoRenew?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await paypalCaptureOrderFetch.fetchData({
          method: 'POST',
          endpoint: '/paypal/capture-order/activate',
          data,
          successMessage: 'Payment successful! Subscription activated.',
        });

        if (!response?.success || !response?.data || !(response.data as PayPalCaptureResponse).captureId) {
          throw new Error(response?.message || 'Failed to capture PayPal payment');
        }

        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to capture PayPal payment';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return {
    loading,
    error,
    // Subscription Plans
    getSubscriptionPlans,
    getSubscriptionPlanById,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    // Business Subscriptions
    getBusinessSubscriptions,
    getBusinessSubscriptionById,
    getActiveSubscriptionByBusinessId,
    createBusinessSubscription,
    updateBusinessSubscription,
    cancelBusinessSubscription,
    renewBusinessSubscription,
    // Subscription Payments
    getSubscriptionPayments,
    getSubscriptionPaymentById,
    createSubscriptionPayment,
    // PayPal
    getPayPalClientId,
    createPayPalOrder,
    capturePayPalOrder,
    // Utility
    checkSubscriptionExpiry,
    isLoading: loading,
  };
};

export default useSubscription;
