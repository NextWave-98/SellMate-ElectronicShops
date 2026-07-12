import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, DollarSign, Calendar, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Payment {
    id: string;
    paymentNumber: string;
    installmentNumber: number;
    dueDate: string;
    amountDue: number;
    amountPaid: number;
    lateFee: number;
    status: 'PENDING' | 'PAID' | 'LATE' | 'DEFAULTED';
    daysOverdue: number;
    paymentDate?: string;
    paymentMethod?: string;
}

interface InstallmentPlanDetail {
    id: string;
    planNumber: string;
    customer: {
        id: string;
        customerId: string;
        name: string;
        phone: string;
        email?: string;
    };
    sale?: {
        id: string;
        saleNumber: string;
        totalAmount: number;
    };
    productDescription?: string;
    totalAmount: number;
    downPayment: number;
    financedAmount: number;
    numberOfInstallments: number;
    installmentAmount: number;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    interestRate: number;
    lateFeePercentage: number;
    lateFeeFixed: number;
    status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
    totalPaid: number;
    totalOutstanding: number;
    paymentsCompleted: number;
    paymentsMissed: number;
    startDate: string;
    endDate: string;
    firstPaymentDate: string;
    notes?: string;
    payments?: Payment[];
    createdAt: string;
}

export default function InstallmentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [plan, setPlan] = useState<InstallmentPlanDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [recordingPayment, setRecordingPayment] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentReference, setPaymentReference] = useState('');

    const { fetchData: getPlan } = useFetch(`/installments/plans/${id}`);
    const { fetchData: recordPayment } = useFetch('/installments/payments');

    useEffect(() => {
        loadPlan();
    }, [id]);

    const loadPlan = async () => {
        try {
            setLoading(true);
            const response = await getPlan({
                method: 'GET',
                silent: true,
            });

            if (response?.success && response?.data) {
                setPlan(response.data);
            }
        } catch (error) {
            toast.error('Failed to load plan details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!selectedPayment || !paymentAmount) {
            toast.error('Please enter payment amount');
            return;
        }

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setRecordingPayment(true);
            const response = await recordPayment({
                method: 'POST',
                data: {
                    installmentPaymentId: selectedPayment.id,
                    amountPaid: amount,
                    paymentMethod,
                    paymentReference: paymentReference || undefined,
                    paymentDate: new Date().toISOString(),
                },
            });

            if (response?.success) {
                toast.success('Payment recorded successfully');
                setSelectedPayment(null);
                setPaymentAmount('');
                setPaymentReference('');
                await loadPlan(); // Reload to get updated data
            }
        } catch (error) {
            toast.error('Failed to record payment');
            console.error(error);
        } finally {
            setRecordingPayment(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'COMPLETED':
                return 'bg-blue-100 text-blue-800';
            case 'DEFAULTED':
                return 'bg-red-100 text-red-800';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800';
            case 'PAID':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'LATE':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
                <p className="mt-4 text-gray-600">Loading plan details...</p>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-gray-600">Plan not found</p>
                <button
                    onClick={() => navigate('../installments')}
                    className="mt-4 text-orange-600 hover:text-orange-700"
                >
                    Back to Plans
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <button
                        onClick={() => navigate('../installments')}
                        className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">Plan {plan.planNumber}</h1>
                        <p className="text-gray-600 mt-1">Installment plan details and payment history</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(plan.status)}`}>
                    {plan.status}
                </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                Rs. {plan.totalAmount.toLocaleString()}
                            </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-gray-400" />
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                                Rs. {plan.totalPaid.toLocaleString()}
                            </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Outstanding</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">
                                Rs. {plan.totalOutstanding.toLocaleString()}
                            </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-red-400" />
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Progress</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {plan.paymentsCompleted}/{plan.numberOfInstallments}
                            </p>
                        </div>
                        <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                </Card>
            </div>

            {/* Plan Details */}
            <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Plan Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Customer Information</h3>
                        <div className="space-y-2">
                            <p className="text-sm"><span className="font-medium">Name:</span> {plan.customer.name}</p>
                            <p className="text-sm"><span className="font-medium">Phone:</span> {plan.customer.phone}</p>
                            {plan.customer.email && (
                                <p className="text-sm"><span className="font-medium">Email:</span> {plan.customer.email}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Payment Terms</h3>
                        <div className="space-y-2">
                            <p className="text-sm"><span className="font-medium">Down Payment:</span> Rs. {plan.downPayment.toLocaleString()}</p>
                            <p className="text-sm"><span className="font-medium">Financed Amount:</span> Rs. {plan.financedAmount.toLocaleString()}</p>
                            <p className="text-sm"><span className="font-medium">Installment Amount:</span> Rs. {plan.installmentAmount.toLocaleString()}</p>
                            <p className="text-sm"><span className="font-medium">Frequency:</span> {plan.frequency}</p>
                            {plan.interestRate > 0 && (
                                <p className="text-sm"><span className="font-medium">Interest Rate:</span> {plan.interestRate}%</p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Payment Schedule */}
            <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Payment Schedule</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/20">
                        <thead className="bg-white/30 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late Fee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/20 backdrop-blur-sm divide-y divide-white/20">
                            {plan.payments?.map((payment) => (
                                <tr key={payment.id} className="hover:bg-white/30">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {payment.installmentNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(payment.dueDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        Rs. {payment.amountDue.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                        Rs. {payment.amountPaid.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                        {payment.lateFee > 0 ? `Rs. ${payment.lateFee.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                                            {payment.status}
                                            {payment.daysOverdue > 0 && ` (${payment.daysOverdue}d)`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {payment.status !== 'PAID' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedPayment(payment);
                                                    setPaymentAmount((payment.amountDue - payment.amountPaid + payment.lateFee).toString());
                                                }}
                                                className="text-orange-600 hover:text-orange-900 font-medium"
                                            >
                                                <CreditCard className="w-4 h-4 inline mr-1" />
                                                Record Payment
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Record Payment Modal */}
            {selectedPayment && (
                <div
                    className="glass-modal-overlay"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) setSelectedPayment(null);
                    }}
                >
                    <div
                        className="glass-modal-panel w-full max-w-md mx-4 p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Record Payment - Installment #{selectedPayment.installmentNumber}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount Due
                                </label>
                                <p className="text-lg font-bold text-gray-900">
                                    Rs. {(selectedPayment.amountDue - selectedPayment.amountPaid + selectedPayment.lateFee).toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <Label className="mb-1">
                                    Payment Amount *
                                </Label>
                                <Input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>

                            <div>
                                <Label className="mb-1">
                                    Payment Method *
                                </Label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="MOBILE_PAYMENT">Mobile Payment</option>
                                    <option value="CHECK">Check</option>
                                </select>
                            </div>

                            <div>
                                <Label className="mb-1">
                                    Reference Number
                                </Label>
                                <Input
                                    type="text"
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder="Transaction reference (optional)"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedPayment(null);
                                        setPaymentAmount('');
                                        setPaymentReference('');
                                    }}
                                    className="flex-1"
                                    disabled={recordingPayment}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleRecordPayment}
                                    disabled={recordingPayment}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                                >
                                    {recordingPayment ? (
                                        <>
                                            <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Record Payment'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
