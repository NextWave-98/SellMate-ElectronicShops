/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, Plus, Minus, X, Building2, Briefcase, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import AddFinancialDetailsModal from '../../components/common/AddFinancialDetailsModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MAX_DOCUMENT_IMAGES, prepareDocumentImages, formatKB } from '../../utils/documentImages';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Customer {
    id: string;
    customerId: string;
    name: string;
    phone: string;
    email?: string;
    nicNumber?: string;
    nationalIdIssueDate?: string;
    nationalIdExpiryDate?: string;
    bankName?: string;
    bankBranch?: string;
    bankAccountNumber?: string;
    companyName?: string;
    companyAddress?: string;
    jobPosition?: string;
    monthlyIncome?: number;
    supervisorName?: string;
    supervisorContact?: string;
}

interface CustomerFinancialDetails {
    nationalId: string;
    nationalIdIssueDate?: string;
    nationalIdExpiryDate?: string;
    bankName?: string;
    bankBranch?: string;
    accountNumber?: string;
    companyName?: string;
    companyAddress?: string;
    jobPosition?: string;
    monthlyIncome?: number;
    supervisorName?: string;
    supervisorContact?: string;
}

interface Product {
    id: string;
    name: string;
    unitPrice: number;
    sku?: string;
    stock?: number;
    brand?: string;
    model?: string;
    warrantyMonths?: number;
}

interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    /** Serial / IMEI numbers, comma separated (required for serial-tracked products). */
    serials?: string;
}

interface BranchOption {
    id: string;
    name: string;
    locationCode?: string;
}

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'MOBILE_PAYMENT', label: 'Mobile Payment' },
    { value: 'CHECK', label: 'Cheque' },
];

/** Plan length in years — same rule as the backend (annual flat interest). */
const termInYears = (n: number, frequency: string) =>
    frequency === 'WEEKLY' ? (n * 7) / 365 : frequency === 'BIWEEKLY' ? (n * 14) / 365 : n / 12;
const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

interface FormData {
    customerId: string;
    productDescription: string;
    totalAmount: string;
    downPayment: string;
    numberOfInstallments: string;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    interestRate: string;
    lateFeePercentage: string;
    lateFeeFixed: string;
    startDate: string;
    notes: string;
    downPaymentMethod: string;
    locationId: string;
}

export default function CreateInstallmentPlanPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const userLocationId: string = (user as any)?.locationId || (user as any)?.branchId || '';
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchingCustomers, setSearchingCustomers] = useState(false);
    const [financialDetails, setFinancialDetails] = useState<CustomerFinancialDetails | null>(null);
    const [loadingFinancialDetails, setLoadingFinancialDetails] = useState(false);
    const [showAddFinancialDetailsModal, setShowAddFinancialDetailsModal] = useState(false);

    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [searchingProducts, setSearchingProducts] = useState(false);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const [formData, setFormData] = useState<FormData>({
        customerId: '',
        productDescription: '',
        totalAmount: '',
        downPayment: '',
        numberOfInstallments: '12',
        frequency: 'MONTHLY',
        interestRate: '0',
        lateFeePercentage: '2',
        lateFeeFixed: '0',
        startDate: new Date().toISOString().split('T')[0],
        notes: '',
        downPaymentMethod: 'CASH',
        locationId: userLocationId,
    });

    const { fetchData: searchCustomers } = useFetch('/customers/search');
    const { fetchData: getFinancialDetails } = useFetch('/installments/financial-details');
    const { fetchData: searchProducts } = useFetch('/products');
    const { fetchData: createPlan } = useFetch('/installments/plans');
    const { fetchData: uploadPlanDocuments } = useFetch('');
    // Document images picked before the plan exists; uploaded right after it is created.
    const [docFiles, setDocFiles] = useState<File[]>([]);
    const [preparingDocs, setPreparingDocs] = useState(false);
    const docInputRef = useRef<HTMLInputElement>(null);
    const handleDocFiles = async (list: FileList | null) => {
        if (!list || list.length === 0) return;
        setPreparingDocs(true);
        try {
            const { files, errors } = await prepareDocumentImages(Array.from(list), docFiles.length);
            errors.forEach((e) => toast.error(e));
            if (files.length) setDocFiles((prev) => [...prev, ...files].slice(0, MAX_DOCUMENT_IMAGES));
        } finally {
            setPreparingDocs(false);
            if (docInputRef.current) docInputRef.current.value = '';
        }
    };
    const { fetchData: fetchBranches } = useFetch('/locations');

    // Org admins are not tied to a branch: let them pick the branch the goods leave from.
    useEffect(() => {
        if (userLocationId) return;
        (async () => {
            try {
                const response: any = await fetchBranches({ method: 'GET', silent: true, endpoint: '/locations?branch=branch' });
                const list = response?.data?.locations || response?.locations || [];
                setBranches(list.map((b: any) => ({ id: b.id, name: b.name, locationCode: b.locationCode })));
                if (list.length === 1) setFormData(prev => ({ ...prev, locationId: list[0].id }));
            } catch (error) {
                console.error('Failed to load branches:', error);
            }
        })();
    }, [userLocationId]);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                handleSearchCustomers();
            } else {
                setCustomers([]);
            }
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [searchQuery]);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (productSearchQuery.trim().length >= 2) {
                handleSearchProducts();
            } else {
                setProducts([]);
            }
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [productSearchQuery]);

    // Update total amount when cart changes
    useEffect(() => {
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const productDesc = cartItems.map(item => `${item.name} (${item.quantity})`).join(', ');
        setFormData(prev => ({
            ...prev,
            totalAmount: total.toString(),
            productDescription: productDesc,
        }));
    }, [cartItems]);

    const handleSearchCustomers = async () => {
        try {
            setSearchingCustomers(true);
            const response = await searchCustomers({
                method: 'GET',
                data: { query: searchQuery, limit: 10 },
                silent: true,
            });

            if (response?.success && Array.isArray(response.data)) {
                setCustomers(response.data.map((c: any) => ({
                    id: c.id,
                    customerId: c.customerId,
                    name: c.name,
                    phone: c.phone,
                    email: c.email,
                    nicNumber: c.nicNumber,
                    nationalIdIssueDate: c.nationalIdIssueDate,
                    nationalIdExpiryDate: c.nationalIdExpiryDate,
                    bankName: c.bankName,
                    bankBranch: c.bankBranch,
                    bankAccountNumber: c.bankAccountNumber,
                    companyName: c.companyName,
                    companyAddress: c.companyAddress,
                    jobPosition: c.jobPosition,
                    monthlyIncome: c.monthlyIncome,
                    supervisorName: c.supervisorName,
                    supervisorContact: c.supervisorContact,
                })));
            }
        } catch (error) {
            console.error('Failed to search customers:', error);
        } finally {
            setSearchingCustomers(false);
        }
    };

    const handleSearchProducts = async () => {
        try {
            setSearchingProducts(true);
            const response = await searchProducts({
                method: 'GET',
                data: { search: productSearchQuery, limit: 20 },
                silent: true,
            });

            if (response?.success && Array.isArray(response.data)) {
                setProducts(response.data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    unitPrice: parseFloat(p.unitPrice) || 0,
                    sku: p.sku,
                    stock: p._count?.inventory || 0,
                    brand: p.brand,
                    model: p.model,
                    warrantyMonths: p.warrantyMonths,
                })));
            }
        } catch (error) {
            console.error('Failed to search products:', error);
        } finally {
            setSearchingProducts(false);
        }
    };

    const loadFinancialDetails = async (customerId: string) => {
        try {
            setLoadingFinancialDetails(true);
            const response = await getFinancialDetails({
                method: 'GET',
                endpoint: `/installments/financial-details/${customerId}`,
                silent: true,
            });

            if (response?.success && response?.data) {
                const financialData = response.data;
                setFinancialDetails({
                    nationalId: financialData.nationalId,
                    nationalIdIssueDate: financialData.nationalIdIssuedDate,
                    nationalIdExpiryDate: financialData.nationalIdExpiryDate,
                    bankName: financialData.bankName,
                    bankBranch: financialData.bankBranch,
                    accountNumber: financialData.accountNumber,
                    companyName: financialData.companyName,
                    companyAddress: financialData.companyAddress,
                    jobPosition: financialData.jobPosition,
                    monthlyIncome: financialData.monthlyIncome,
                    supervisorName: financialData.supervisorName,
                    supervisorContact: financialData.supervisorPhone,
                });
            } else {
                setFinancialDetails(null);
            }
        } catch (error) {
            console.error('Failed to load financial details:', error);
            setFinancialDetails(null);
        } finally {
            setLoadingFinancialDetails(false);
        }
    };

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setFormData({ ...formData, customerId: customer.id });
        setSearchQuery('');
        setCustomers([]);
        loadFinancialDetails(customer.id);
    };

    const handleAddProduct = (product: Product) => {
        const existingItem = cartItems.find(item => item.productId === product.id);

        if (existingItem) {
            setCartItems(cartItems.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCartItems([...cartItems, {
                productId: product.id,
                name: product.name,
                price: product.unitPrice,
                quantity: 1,
            }]);
        }
        setProductSearchQuery('');
        setProducts([]);
        toast.success(`Added ${product.name} to plan`);
    };

    const handleUpdateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCartItems(cartItems.filter(item => item.productId !== productId));
        } else {
            setCartItems(cartItems.map(item =>
                item.productId === productId ? { ...item, quantity } : item
            ));
        }
    };

    const handleRemoveProduct = (productId: string) => {
        setCartItems(cartItems.filter(item => item.productId !== productId));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const calculateFinancedAmount = () => {
        const total = parseFloat(formData.totalAmount) || 0;
        const down = parseFloat(formData.downPayment) || 0;
        return total - down;
    };

    /** Annual flat interest for the length of the plan (matches the backend). */
    const calculateInterest = () => {
        const financed = calculateFinancedAmount();
        const installments = parseInt(formData.numberOfInstallments) || 1;
        const rate = parseFloat(formData.interestRate) || 0;
        if (rate <= 0 || financed <= 0) return 0;
        return round2(financed * (rate / 100) * termInYears(installments, formData.frequency));
    };

    const calculateTotalPayable = () => round2(calculateFinancedAmount() + calculateInterest());

    const calculateInstallmentAmount = () => {
        const installments = parseInt(formData.numberOfInstallments) || 1;
        return round2(calculateTotalPayable() / installments);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomer) {
            toast.error('Please select a customer');
            return;
        }

        if (!financialDetails) {
            toast.error('Please add financial details for the customer before creating an installment plan');
            return;
        }

        if (cartItems.length === 0) {
            toast.error('Please add at least one product');
            return;
        }

        if (!formData.locationId) {
            toast.error('Please select the branch the goods are sold from');
            return;
        }

        const installmentsCount = parseInt(formData.numberOfInstallments);
        if (!Number.isInteger(installmentsCount) || installmentsCount < 1) {
            toast.error('Number of installments must be at least 1');
            return;
        }

        const totalAmount = parseFloat(formData.totalAmount);
        const downPayment = parseFloat(formData.downPayment);

        if (isNaN(totalAmount) || totalAmount <= 0) {
            toast.error('Please enter a valid total amount');
            return;
        }

        if (isNaN(downPayment) || downPayment < 0) {
            toast.error('Please enter a valid down payment');
            return;
        }

        if (downPayment >= totalAmount) {
            toast.error('Down payment must be less than total amount');
            return;
        }

        try {
            setLoading(true);
            const response = await createPlan({
                method: 'POST',
                data: {
                    customerId: formData.customerId,
                    locationId: formData.locationId,
                    // A real sale is created from these items: stock is deducted
                    // and the down payment is recorded on the sale.
                    items: cartItems.map(item => {
                        const serials = (item.serials || '').split(/[,\n]/).map(x => x.trim()).filter(Boolean);
                        return {
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            ...(serials.length ? { serialNumbers: serials } : {}),
                        };
                    }),
                    downPaymentMethod: formData.downPaymentMethod,
                    productDescription: formData.productDescription,
                    totalAmount,
                    downPayment,
                    numberOfInstallments: installmentsCount,
                    frequency: formData.frequency,
                    interestRate: parseFloat(formData.interestRate) || 0,
                    lateFeePercentage: parseFloat(formData.lateFeePercentage) || 0,
                    lateFeeFixed: parseFloat(formData.lateFeeFixed) || 0,
                    startDate: new Date(formData.startDate).toISOString(),
                    notes: formData.notes || undefined,
                },
            });

            if (response?.success && response?.data) {
                const created: any = response.data;
                toast.success(created.sale?.saleNumber
                    ? `Installment plan created (sale ${created.sale.saleNumber})`
                    : 'Installment plan created successfully');
                if (docFiles.length > 0) {
                    // The plan already exists; a failed upload must not look like a failed plan.
                    const form = new FormData();
                    docFiles.forEach((f) => form.append('documents', f));
                    const up = await uploadPlanDocuments({
                        endpoint: `/installments/plans/${created.id}/documents`,
                        method: 'POST',
                        data: form,
                        contentType: 'multipart/form-data',
                        silent: true,
                    });
                    if (!up?.success) {
                        toast.error('Plan created, but the documents could not be uploaded. Add them from the plan page.');
                    }
                }
                navigate(`../installments/${created.id}`);
            }
        } catch (error) {
            toast.error('Failed to create installment plan');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('../installments')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Installment Plan</h1>
                    <p className="text-gray-600 mt-1">Set up a new payment plan for a customer</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Customer Information</h2>

                    {!selectedCustomer ? (
                        <div className="space-y-3">
                            <Label>
                                Search Customer <span className="text-red-500">*</span>
                            </Label>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Name, phone or customer ID..."
                                    className="pl-10 pr-4"
                                />
                            </div>

                            {/* Results */}
                            {customers.length > 0 && (
                                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto bg-white shadow-sm">
                                    {customers.map((cust) => (
                                        <button
                                            key={cust.id}
                                            type="button"
                                            onClick={() => handleSelectCustomer(cust)}
                                            className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors"
                                        >
                                            <div className="font-medium text-gray-900">{cust.name}</div>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                {cust.customerId} • {cust.phone}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchingCustomers && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Searching customers...</span>
                                </div>
                            )}

                            {searchQuery.trim() && customers.length === 0 && !searchingCustomers && (
                                <p className="text-sm text-gray-500 py-2">No customers found</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Selected Customer Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                                            {financialDetails ? (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                    Financial Details ✓
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                    Financial Details Required
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {selectedCustomer.customerId} • {selectedCustomer.phone}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomer(null);
                                            setFormData({ ...formData, customerId: '' });
                                            setFinancialDetails(null);
                                        }}
                                        className="text-sm text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>

                            {/* Financial Info Section */}
                            {loadingFinancialDetails ? (
                                <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Loading financial information...
                                </div>
                            ) : financialDetails ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-gray-700">Financial Details</h3>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`../customers/${selectedCustomer.id}/financial-details/edit`)}
                                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* National ID */}
                                        <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <CreditCard className="h-4 w-4 text-blue-600" />
                                                <span className="text-sm font-semibold text-blue-900">National ID</span>
                                            </div>
                                            <p className="text-blue-800 font-medium">{financialDetails.nationalId || " "}</p>
                                        </div>

                                        {/* Bank */}
                                        {financialDetails.bankName && (
                                            <div className="bg-green-50/70 border border-green-100 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Building2 className="h-4 w-4 text-green-600" />
                                                    <span className="text-sm font-semibold text-green-900">Bank</span>
                                                </div>
                                                <p className="text-green-800">{financialDetails.bankName}</p>
                                                {financialDetails.accountNumber && (
                                                    <p className="text-xs text-green-700 mt-1">
                                                        A/C: {financialDetails.accountNumber}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Employment */}
                                        {financialDetails.companyName && (
                                            <div className="bg-purple-50/70 border border-purple-100 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Briefcase className="h-4 w-4 text-purple-600" />
                                                    <span className="text-sm font-semibold text-purple-900">Employment</span>
                                                </div>
                                                <p className="text-purple-800">{financialDetails.companyName}</p>
                                                {financialDetails.monthlyIncome && (
                                                    <p className="text-xs text-purple-700 mt-1">
                                                        Income: Rs. {financialDetails.monthlyIncome.toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-red-800 font-medium">
                                                Financial details are required to create an installment plan.
                                            </p>
                                            <p className="text-sm text-red-700 mt-1">
                                                Please add bank, employment, and national ID information before proceeding.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddFinancialDetailsModal(true)}
                                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 whitespace-nowrap"
                                        >
                                            Add Financial Details
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* Product Selection */}
                <Card className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Select Products</h2>

                    {/* Product Search */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                type="text"
                                value={productSearchQuery}
                                onChange={(e) => setProductSearchQuery(e.target.value)}
                                placeholder="Search products by name, SKU, or brand..."
                                className="pl-10 pr-4"
                            />
                        </div>

                        {/* Product Search Results */}
                        {products.length > 0 && (
                            <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                                {products.map((product) => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => handleAddProduct(product)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900">{product.name}</div>
                                            <div className="text-sm text-gray-500">
                                                {product.sku && `${product.sku} • `}
                                                Rs. {product.unitPrice.toLocaleString()}
                                                {product.stock !== undefined && ` • Stock: ${product.stock}`}
                                            </div>
                                        </div>
                                        <Plus className="w-5 h-5 text-orange-600" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {searchingProducts && (
                            <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Searching products...
                            </div>
                        )}
                    </div>

                    {/* Selected Products Cart */}
                    {cartItems.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-700">Selected Products:</h3>
                            {cartItems.map((item) => (
                                <div key={item.productId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-600">Rs. {item.price.toLocaleString()} each</p>
                                        <input
                                            type="text"
                                            value={item.serials || ''}
                                            onChange={(e) => setCartItems(cartItems.map(ci =>
                                                ci.productId === item.productId ? { ...ci, serials: e.target.value } : ci
                                            ))}
                                            placeholder="Serial / IMEI (comma separated, if tracked)"
                                            className="mt-2 w-full max-w-sm px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                                className="p-1 hover:bg-gray-200 rounded"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                                className="p-1 hover:bg-gray-200 rounded"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <p className="w-24 text-right font-semibold text-gray-900">
                                            Rs. {(item.price * item.quantity).toLocaleString()}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveProduct(item.productId)}
                                            className="p-1 hover:bg-red-100 rounded text-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                <span className="font-semibold text-gray-900">Total:</span>
                                <span className="text-xl font-bold text-orange-600">
                                    Rs. {cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Payment Terms */}
                <Card className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Terms</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!userLocationId && (
                            <div className="md:col-span-2">
                                <Label className="mb-1">
                                    Branch (stock is taken from here) *
                                </Label>
                                <select
                                    name="locationId"
                                    value={formData.locationId}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                >
                                    <option value="">Select branch...</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}{b.locationCode ? ` (${b.locationCode})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <Label className="mb-1">
                                Down Payment *
                            </Label>
                            <Input
                                type="number"
                                name="downPayment"
                                value={formData.downPayment}
                                onChange={handleChange}
                                required
                                min="0"
                                step="0.01"
                                placeholder="20000"
                            />
                        </div>

                        <div>
                            <Label className="mb-1">
                                Down Payment Method
                            </Label>
                            <select
                                name="downPaymentMethod"
                                value={formData.downPaymentMethod}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            >
                                {PAYMENT_METHODS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label className="mb-1">
                                Number of Installments *
                            </Label>
                            <Input
                                type="number"
                                name="numberOfInstallments"
                                value={formData.numberOfInstallments}
                                onChange={handleChange}
                                required
                                min="1"
                            />
                        </div>

                        <div>
                            <Label className="mb-1">
                                Payment Frequency *
                            </Label>
                            <select
                                name="frequency"
                                value={formData.frequency}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            >
                                <option value="WEEKLY">Weekly</option>
                                <option value="BIWEEKLY">Bi-weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                        </div>

                        <div>
                            <Label className="mb-1">
                                Interest Rate (% per year, flat)
                            </Label>
                            <Input
                                type="number"
                                name="interestRate"
                                value={formData.interestRate}
                                onChange={handleChange}
                                min="0"
                                step="0.1"
                            />
                        </div>

                        <div>
                            <Label className="mb-1">
                                Start Date *
                            </Label>
                            <Input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <Label className="mb-1">
                                Late Fee Percentage (%)
                            </Label>
                            <Input
                                type="number"
                                name="lateFeePercentage"
                                value={formData.lateFeePercentage}
                                onChange={handleChange}
                                min="0"
                                step="0.1"
                            />
                            <p className="text-xs text-gray-500 mt-1">Charged once per overdue installment</p>
                        </div>

                        <div>
                            <Label className="mb-1">
                                Late Fee Fixed (Rs.)
                            </Label>
                            <Input
                                type="number"
                                name="lateFeeFixed"
                                value={formData.lateFeeFixed}
                                onChange={handleChange}
                                min="0"
                                step="1"
                            />
                            <p className="text-xs text-gray-500 mt-1">If set, used instead of the percentage</p>
                        </div>
                    </div>
                </Card>

                {/* Summary */}
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Plan Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Interest</p>
                            <p className="text-xl font-bold text-gray-900">
                                Rs. {calculateInterest().toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Payable (after down payment)</p>
                            <p className="text-xl font-bold text-gray-900">
                                Rs. {calculateTotalPayable().toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Financed Amount</p>
                            <p className="text-xl font-bold text-gray-900">
                                Rs. {calculateFinancedAmount().toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Installment Amount</p>
                            <p className="text-xl font-bold text-gray-900">
                                Rs. {calculateInstallmentAmount().toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Installments</p>
                            <p className="text-xl font-bold text-gray-900">
                                {formData.numberOfInstallments} payments
                            </p>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <Card className="p-6">
                    <Label className="mb-2">
                        Notes
                    </Label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        placeholder="Additional notes or terms..."
                    />
                </Card>

                {/* Documents (optional, max 5 images) */}
                <Card className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <Label className="mb-1">Documents (optional)</Label>
                            <p className="text-xs text-gray-500">
                                NIC, agreement, bills… up to {MAX_DOCUMENT_IMAGES} images, max 5 MB each. Saved compressed (WebP/AVIF).
                            </p>
                        </div>
                        {docFiles.length < MAX_DOCUMENT_IMAGES && (
                            <>
                                <input
                                    ref={docInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleDocFiles(e.target.files)}
                                />
                                <Button type="button" variant="outline" disabled={preparingDocs} onClick={() => docInputRef.current?.click()}>
                                    {preparingDocs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                    Add images
                                </Button>
                            </>
                        )}
                    </div>
                    {docFiles.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                            {docFiles.map((f, i) => (
                                <div key={`${f.name}-${i}`} className="relative rounded-lg overflow-hidden border border-gray-200">
                                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 object-cover" />
                                    <p className="px-2 py-1 text-[11px] text-gray-500 truncate">{formatKB(f.size)}</p>
                                    <button
                                        type="button"
                                        onClick={() => setDocFiles((prev) => prev.filter((_, j) => j !== i))}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-white/90 text-red-600 shadow"
                                        title="Remove"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('../installments')}
                        className="flex-1"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading || !selectedCustomer || !financialDetails || cartItems.length === 0}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                                Creating Plan...
                            </>
                        ) : (
                            'Create Installment Plan'
                        )}
                    </Button>
                </div>
            </form>

            {/* Add Financial Details Modal */}
            {selectedCustomer && (
                <AddFinancialDetailsModal
                    isOpen={showAddFinancialDetailsModal}
                    onClose={() => setShowAddFinancialDetailsModal(false)}
                    customer={selectedCustomer}
                    onSuccess={() => {
                        // Reload financial details after adding
                        loadFinancialDetails(selectedCustomer.id);
                    }}
                />
            )}
        </div>
    );
}
