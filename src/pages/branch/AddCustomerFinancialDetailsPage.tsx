/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, CreditCard, Building2, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Customer {
    id: string;
    customerId: string;
    name: string;
    phone: string;
    email?: string;
}

interface FinancialDetails {
    nationalId: string;
    nationalIdIssueDate?: string;
    nationalIdExpiryDate?: string;
    bankName: string;
    bankBranch?: string;
    accountNumber: string;
    accountHolderName?: string;
    companyName: string;
    companyAddress?: string;
    jobPosition?: string;
    monthlyIncome?: number;
    supervisorName?: string;
    supervisorContact?: string;
    notes?: string;
}

export default function AddCustomerFinancialDetailsPage() {
    const navigate = useNavigate();
    const { customerId } = useParams<{ customerId: string }>();
    const [loading, setLoading] = useState(false);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loadingCustomer, setLoadingCustomer] = useState(true);

    const [formData, setFormData] = useState<FinancialDetails>({
        nationalId: '',
        nationalIdIssueDate: '',
        nationalIdExpiryDate: '',
        bankName: '',
        bankBranch: '',
        accountNumber: '',
        accountHolderName: '',
        companyName: '',
        companyAddress: '',
        jobPosition: '',
        monthlyIncome: undefined,
        supervisorName: '',
        supervisorContact: '',
        notes: '',
    });

    const { fetchData: getCustomer } = useFetch(`/customers/${customerId}`);
    const { fetchData: addFinancialDetails } = useFetch('/installments/financial-details');

    useEffect(() => {
        loadCustomer();
    }, [customerId]);

    const loadCustomer = async () => {
        try {
            setLoadingCustomer(true);
            const response = await getCustomer({
                method: 'GET',
                silent: true,
            });

            if (response?.success && response?.data) {
                setCustomer(response.data);
            } else {
                toast.error('Customer not found');
                navigate('../customers');
            }
        } catch (error) {
            toast.error('Failed to load customer');
            console.error(error);
            navigate('../customers');
        } finally {
            setLoadingCustomer(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value === '' ? undefined : parseFloat(value) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nationalId || !formData.bankName || !formData.accountNumber || !formData.companyName) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const response = await addFinancialDetails({
                method: 'POST',
                data: {
                    customerId,
                    ...formData,
                    nationalIdIssueDate: formData.nationalIdIssueDate ? new Date(formData.nationalIdIssueDate).toISOString() : undefined,
                    nationalIdExpiryDate: formData.nationalIdExpiryDate ? new Date(formData.nationalIdExpiryDate).toISOString() : undefined,
                },
            });

            if (response?.success) {
                toast.success('Financial details added successfully');
                navigate(`../customers/${customerId}`);
            }
        } catch (error) {
            toast.error('Failed to add financial details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loadingCustomer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
                <p className="mt-4 text-gray-600">Loading customer...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-gray-600">Customer not found</p>
                <button
                    onClick={() => navigate('../customers')}
                    className="mt-4 text-orange-600 hover:text-orange-700"
                >
                    Back to Customers
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('../customers')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Add Financial Details</h1>
                    <p className="text-gray-600 mt-1">Add financial information for {customer.name}</p>
                </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Customer Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Customer ID</p>
                        <p className="font-medium text-gray-900">{customer.customerId}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">{customer.phone}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* National ID */}
                <Card className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        National ID Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="mb-1">
                                National ID Number *
                            </Label>
                            <Input
                                type="text"
                                name="nationalId"
                                value={formData.nationalId}
                                onChange={handleChange}
                                required
                                placeholder="123456789V"
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Issue Date
                            </Label>
                            <Input
                                type="date"
                                name="nationalIdIssueDate"
                                value={formData.nationalIdIssueDate}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Expiry Date
                            </Label>
                            <Input
                                type="date"
                                name="nationalIdExpiryDate"
                                value={formData.nationalIdExpiryDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </Card>

                {/* Bank Details */}
                <Card className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-green-600" />
                        Bank Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-1">
                                Bank Name *
                            </Label>
                            <Input
                                type="text"
                                name="bankName"
                                value={formData.bankName}
                                onChange={handleChange}
                                required
                                placeholder="Bank of Ceylon"
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Branch
                            </Label>
                            <Input
                                type="text"
                                name="bankBranch"
                                value={formData.bankBranch}
                                onChange={handleChange}
                                placeholder="Colombo Main"
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Account Number *
                            </Label>
                            <Input
                                type="text"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleChange}
                                required
                                placeholder="1234567890"
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Account Holder Name
                            </Label>
                            <Input
                                type="text"
                                name="accountHolderName"
                                value={formData.accountHolderName}
                                onChange={handleChange}
                                placeholder="John Doe"
                            />
                        </div>
                    </div>
                </Card>

                {/* Employment Details */}
                <Card className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-purple-600" />
                        Employment Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-1">
                                Company Name *
                            </Label>
                            <Input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                required
                                placeholder="ABC Company Ltd"
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Job Position
                            </Label>
                            <Input
                                type="text"
                                name="jobPosition"
                                value={formData.jobPosition}
                                onChange={handleChange}
                                placeholder="Software Engineer"
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Monthly Income (Rs.)
                            </Label>
                            <Input
                                type="number"
                                name="monthlyIncome"
                                value={formData.monthlyIncome || ''}
                                onChange={handleNumberChange}
                                min="0"
                                step="0.01"
                                placeholder="50000"
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Supervisor Name
                            </Label>
                            <Input
                                type="text"
                                name="supervisorName"
                                value={formData.supervisorName}
                                onChange={handleChange}
                                placeholder="Jane Smith"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label className="mb-1">
                                Company Address
                            </Label>
                            <Input
                                type="text"
                                name="companyAddress"
                                value={formData.companyAddress}
                                onChange={handleChange}
                                placeholder="123 Main St, Colombo"
                            />
                        </div>
                        <div>
                            <Label className="mb-1">
                                Supervisor Contact
                            </Label>
                            <Input
                                type="text"
                                name="supervisorContact"
                                value={formData.supervisorContact}
                                onChange={handleChange}
                                placeholder="+94 77 123 4567"
                            />
                        </div>
                    </div>
                </Card>

                {/* Notes */}
                <Card className="p-6">
                    <Label className="mb-2">
                        Additional Notes
                    </Label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        placeholder="Any additional financial information..."
                    />
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('../customers')}
                        className="flex-1"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 inline mr-2" />
                                Save Financial Details
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}