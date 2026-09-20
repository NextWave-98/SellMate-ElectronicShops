import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Check,
  Package,
  Users,
  Zap,
  Star,
  Award,
  ChevronDown,
  ArrowLeft,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSubscription } from '../../hooks/useSubscription';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import type { SubscriptionPlan, BillingCycle } from '../../types/subscription.types';

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel?: () => void;
        onError?: (err: unknown) => void;
        style?: Record<string, unknown>;
      }) => { render: (selector: string) => void };
    };
  }
}

const BILLING_CYCLES: { value: BillingCycle; label: string; discount: string }[] = [
  { value: 'MONTHLY', label: 'Monthly', discount: '' },
  { value: 'QUARTERLY', label: 'Quarterly', discount: 'Save 5%' },
  { value: 'SEMI_ANNUAL', label: 'Semi-Annual', discount: 'Save 10%' },
  { value: 'ANNUAL', label: 'Annual', discount: 'Save 20%' },
];

const PLAN_ICONS: Record<string, React.ReactNode> = {
  BASIC: <Zap className="w-7 h-7" />,
  STANDARD: <Package className="w-7 h-7" />,
  PROFESSIONAL: <Star className="w-7 h-7" />,
  PREMIUM: <Award className="w-7 h-7" />,
  ENTERPRISE: <Users className="w-7 h-7" />,
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  BASIC: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    accent: 'bg-orange-600',
  },
  STANDARD: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    accent: 'bg-amber-600',
  },
  PROFESSIONAL: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    accent: 'bg-yellow-600',
  },
  PREMIUM: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    accent: 'bg-orange-700',
  },
  ENTERPRISE: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    accent: 'bg-red-600',
  },
};

function getPriceForCycle(plan: SubscriptionPlan, cycle: BillingCycle): number {
  switch (cycle) {
    case 'MONTHLY': return Number(plan.monthly_price) || 0;
    case 'QUARTERLY': return Number(plan.quarterly_price) || 0;
    case 'SEMI_ANNUAL': return Number(plan.semi_annual_price) || 0;
    case 'ANNUAL': return Number(plan.annual_price) || 0;
    default: return Number(plan.monthly_price) || 0;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(amount);
}

export default function SubscriptionCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paypalButtonRef = useRef<HTMLDivElement>(null);
  const paypalRenderedRef = useRef(false);

  const { getSubscriptionPlans, getPayPalClientId, createPayPalOrder, capturePayPalOrder } =
    useSubscription();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [autoRenew, setAutoRenew] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paypalScriptLoaded, setPaypalScriptLoaded] = useState(false);
  const [paypalScriptError, setPaypalScriptError] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [checkoutResult, setCheckoutResult] = useState<{ captureId?: string } | null>(null);

  // Handle return from PayPal redirect (fallback for non-popup flow)
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setCheckoutStatus('success');
    } else if (status === 'cancelled') {
      toast('Payment cancelled. You can try again anytime.', { icon: 'ℹ️' });
    }
  }, [searchParams]);

  // Load plans
  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSubscriptionPlans({ isActive: true });
      if (response?.data?.plans) {
        setPlans(response.data.plans);
        if (!selectedPlan && response.data.plans.length > 0) {
          const standard = response.data.plans.find((p: SubscriptionPlan) =>
            p.plan_type === 'STANDARD'
          );
          setSelectedPlan(standard || response.data.plans[0]);
        }
      }
    } catch {
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, [getSubscriptionPlans, selectedPlan]);

  // Load PayPal client ID
  const loadPayPalClientId = useCallback(async () => {
    try {
      const response = await getPayPalClientId();
      if (response?.data?.clientId) {
        setPaypalClientId(response.data.clientId);
      } else {
        setPaypalScriptError(true);
        toast.error('PayPal is not configured on this server');
      }
    } catch {
      setPaypalScriptError(true);
    }
  }, [getPayPalClientId]);

  useEffect(() => {
    loadPlans();
    loadPayPalClientId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load PayPal JS SDK once we have the client ID
  useEffect(() => {
    if (!paypalClientId || paypalScriptLoaded) return;

    const existingScript = document.getElementById('paypal-sdk');
    if (existingScript) {
      setPaypalScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => setPaypalScriptLoaded(true);
    script.onerror = () => {
      setPaypalScriptError(true);
      toast.error('Failed to load PayPal SDK');
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup   it's global
    };
  }, [paypalClientId, paypalScriptLoaded]);

  // Render PayPal buttons whenever plan/cycle/script changes
  useEffect(() => {
    if (!paypalScriptLoaded || !window.paypal || !selectedPlan || !paypalButtonRef.current) return;
    if (checkoutStatus !== 'idle') return;

    // Clear previous buttons
    paypalButtonRef.current.innerHTML = '';
    paypalRenderedRef.current = false;

    if (paypalRenderedRef.current) return;
    paypalRenderedRef.current = true;

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'pay',
        height: 50,
      },
      createOrder: async () => {
        if (!selectedPlan) throw new Error('No plan selected');
        setCheckoutStatus('processing');
        try {
          const response = await createPayPalOrder({
            planId: selectedPlan.id,
            billingCycle,
            currency: 'USD',
          });
          if (!response?.data?.orderID) throw new Error('Failed to create PayPal order');
          return response.data.orderID as string;
        } catch (err) {
          setCheckoutStatus('idle');
          const message = err instanceof Error ? err.message : 'Failed to create PayPal order';
          toast.error(message);
          throw err;
        }
      },
      onApprove: async (data: { orderID: string }) => {
        try {
          setCheckoutStatus('processing');
          const response = await capturePayPalOrder({
            orderID: data.orderID,
            planId: selectedPlan!.id,
            billingCycle,
            autoRenew,
          });
          if (response?.data?.captureId) {
            setCheckoutResult({ captureId: response.data.captureId });
            setCheckoutStatus('success');
          } else {
            throw new Error('Capture failed');
          }
        } catch {
          setCheckoutStatus('error');
          toast.error('Payment capture failed. Please contact support.');
        }
      },
      onCancel: () => {
        setCheckoutStatus('idle');
        toast('Payment cancelled.', { icon: 'ℹ️' });
      },
      onError: (err: unknown) => {
        setCheckoutStatus('error');
        const message = err instanceof Error ? err.message : 'PayPal encountered an error. Please try again.';
        toast.error(message);
      },
    }).render('#paypal-button-container');
  }, [paypalScriptLoaded, selectedPlan, billingCycle, autoRenew, checkoutStatus, createPayPalOrder, capturePayPalOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (checkoutStatus === 'success') {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,var(--color-green-50),var(--color-emerald-50))] flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">
              Your <strong>{selectedPlan?.name}</strong> subscription has been activated.
            </p>
          </div>

          {/* Payment Details */}
          <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/30 p-4 mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Payment Details</h3>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Transaction ID</span>
              <span className="font-mono text-gray-900">{checkoutResult?.captureId || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Paid</span>
              <span className="font-semibold text-orange-600">{formatCurrency(getPriceForCycle(selectedPlan!, billingCycle))}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Plan</span>
              <span className="text-gray-900">{selectedPlan?.name}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Billing Cycle</span>
              <span className="text-gray-900 capitalize">{billingCycle.replace('_', ' ')}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment Method</span>
              <span className="text-gray-900">PayPal</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment Date</span>
              <span className="text-gray-900">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => navigate('/platform/subscriptions?tab=payments')}
            >
              View Payment History
            </Button>
            <Button
              variant="outline"
              className="w-full border-orange-600 text-orange-600 hover:bg-orange-50"
              onClick={() => navigate('/superadmin/dashboard')}
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <h1 className="text-xl font-bold text-gray-900">Subscription Checkout</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Plan Selection */}
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Choose Plan */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-sm flex items-center justify-center font-bold">1</span>
                Choose Your Plan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const colors = PLAN_COLORS[plan.plan_type] || PLAN_COLORS.BASIC;
                  const isSelected = selectedPlan?.id === plan.id;
                  const price = getPriceForCycle(plan, billingCycle);

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? `${colors.border} bg-white shadow-md ring-2 ring-orange-500 ring-offset-1`
                          : 'border-white/40 bg-white/30 backdrop-blur-sm hover:border-white/60 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={`w-10 h-10 ${colors.bg} ${colors.text} rounded-lg flex items-center justify-center mb-3`}>
                        {PLAN_ICONS[plan.plan_type] || <Package className="w-5 h-5" />}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-base">{plan.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 mb-3 line-clamp-2">{plan.description}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(price)}
                        <span className="text-sm font-normal text-gray-500">
                          {billingCycle === 'MONTHLY' ? '/mo' :
                           billingCycle === 'QUARTERLY' ? '/qtr' :
                           billingCycle === 'SEMI_ANNUAL' ? '/6mo' : '/yr'}
                        </span>
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-gray-600">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-500 shrink-0" />
                          {plan.max_users} users
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-500 shrink-0" />
                          {plan.max_products} products
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-500 shrink-0" />
                          {plan.max_branches} branch{plan.max_branches !== 1 ? 'es' : ''}
                        </li>
                        {plan.pos_enabled && (
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-green-500 shrink-0" />
                            POS enabled
                          </li>
                        )}
                        {plan.advanced_reporting && (
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-green-500 shrink-0" />
                            Advanced reports
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Billing Cycle */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-sm flex items-center justify-center font-bold">2</span>
                Billing Cycle
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BILLING_CYCLES.map((cycle) => (
                  <button
                    key={cycle.value}
                    onClick={() => setBillingCycle(cycle.value)}
                    className={`relative rounded-lg border-2 p-3 text-center transition-all ${
                      billingCycle === cycle.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-white/40 bg-white/30 backdrop-blur-sm text-gray-700 hover:border-white/60'
                    }`}
                  >
                    <p className="font-medium text-sm">{cycle.label}</p>
                    {cycle.discount && (
                      <span className="mt-1 inline-block text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                        {cycle.discount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Options */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-sm flex items-center justify-center font-bold">3</span>
                Options
              </h2>
              <div className="flex items-center gap-3 p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/30">
                <input
                  id="auto-renew"
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-white/40 rounded"
                />
                <label htmlFor="auto-renew" className="text-sm text-gray-700 cursor-pointer">
                  <span className="font-medium">Auto-renew subscription</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Automatically renew when your subscription expires
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT: Order Summary + PayPal */}
          <div className="space-y-4">
            {/* Order Summary */}
            <Card className="p-6 sticky top-6">
              <h3 className="font-semibold text-gray-900 text-base mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                Order Summary
              </h3>

              {selectedPlan ? (
                <>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Plan</span>
                      <span className="font-medium text-gray-900">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Billing</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {billingCycle.replace('_', ' ').toLowerCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Auto-renew</span>
                      <span className={`font-medium ${autoRenew ? 'text-green-600' : 'text-gray-500'}`}>
                        {autoRenew ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <hr className="border-white/20" />
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-orange-600">
                        {formatCurrency(getPriceForCycle(selectedPlan, billingCycle))}
                      </span>
                    </div>
                  </div>

                  {/* Trial badge */}
                  {selectedPlan.trial_days > 0 && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200 text-xs text-green-700">
                      🎉 Includes a <strong>{selectedPlan.trial_days}-day free trial</strong>
                    </div>
                  )}

                  {/* PayPal Button Area */}
                  <div className="mt-4">
                    {paypalScriptError ? (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-700 font-medium">PayPal unavailable</p>
                        <p className="text-xs text-red-500 mt-1">PayPal is not configured on this server.</p>
                      </div>
                    ) : !paypalScriptLoaded ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading PayPal...
                      </div>
                    ) : checkoutStatus === 'processing' ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing payment...
                      </div>
                    ) : checkoutStatus === 'error' ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-red-50 rounded-lg text-center text-sm text-red-700">
                          <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                          Payment failed. Please try again.
                        </div>
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700"
                          onClick={() => setCheckoutStatus('idle')}
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : (
                      <div ref={paypalButtonRef} id="paypal-button-container" />
                    )}
                  </div>

                  {/* Trust indicators */}
                  <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Shield className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      Secure payment via PayPal
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      Cancel anytime from your account
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <ChevronDown className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      Instant activation after payment
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select a plan to continue</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
