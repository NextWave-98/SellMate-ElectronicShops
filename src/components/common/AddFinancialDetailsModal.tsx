/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { Loader2, Save, CreditCard, Building2, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';

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

interface AddFinancialDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
    onSuccess: () => void;
}

export default function AddFinancialDetailsModal({ isOpen, onClose, customer, onSuccess }: AddFinancialDetailsModalProps) {
    const [loading, setLoading] = useState(false);
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

    const { fetchData: addFinancialDetails } = useFetch('/installments/financial-details');

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
                    customerId: customer.id,
                    ...formData,
                    nationalIdIssueDate: formData.nationalIdIssueDate ? new Date(formData.nationalIdIssueDate).toISOString() : undefined,
                    nationalIdExpiryDate: formData.nationalIdExpiryDate ? new Date(formData.nationalIdExpiryDate).toISOString() : undefined,
                },
            });

            if (response?.success) {
                toast.success('Financial details added successfully');
                onSuccess();
                onClose();
            }
        } catch (error) {
            toast.error('Failed to add financial details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            nationalId: customer.nicNumber || '',
            nationalIdIssueDate: customer.nationalIdIssueDate || '',
            nationalIdExpiryDate: customer.nationalIdExpiryDate || '',
            bankName: customer.bankName || '',
            bankBranch: customer.bankBranch || '',
            accountNumber: customer.bankAccountNumber || '',
            accountHolderName: '',
            companyName: customer.companyName || '',
            companyAddress: customer.companyAddress || '',
            jobPosition: customer.jobPosition || '',
            monthlyIncome: customer.monthlyIncome || undefined,
            supervisorName: customer.supervisorName || '',
            supervisorContact: customer.supervisorContact || '',
            notes: '',
        });
    };

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen, customer]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh]  p-0">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-900">Add Financial Details</DialogTitle>
                    <p className="text-gray-600 mt-1">Add financial information for {customer.name}</p>
                </DialogHeader>

                {/* Customer Info */}
                <div className="bg-gray-50 mx-6 mt-6 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Information</h3>
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

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* National ID */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            National ID Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    National ID Number *
                                </label>
                                <input
                                    type="text"
                                    name="nationalId"
                                    value={formData.nationalId}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter national ID number"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Issue Date
                                </label>
                                <input
                                    type="date"
                                    name="nationalIdIssueDate"
                                    value={formData.nationalIdIssueDate}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    name="nationalIdExpiryDate"
                                    value={formData.nationalIdExpiryDate}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-green-600" />
                            Bank Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bank Name *
                                </label>
                                <input
                                    type="text"
                                    name="bankName"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter bank name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bank Branch
                                </label>
                                <input
                                    type="text"
                                    name="bankBranch"
                                    value={formData.bankBranch}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter bank branch"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Number *
                                </label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter account number"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Holder Name
                                </label>
                                <input
                                    type="text"
                                    name="accountHolderName"
                                    value={formData.accountHolderName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter account holder name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Employment Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-purple-600" />
                            Employment Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Company Name *
                                </label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter company name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Job Position
                                </label>
                                <input
                                    type="text"
                                    name="jobPosition"
                                    value={formData.jobPosition}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter job position"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monthly Income (Rs.)
                                </label>
                                <input
                                    type="number"
                                    name="monthlyIncome"
                                    value={formData.monthlyIncome || ''}
                                    onChange={handleNumberChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter monthly income"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supervisor Name
                                </label>
                                <input
                                    type="text"
                                    name="supervisorName"
                                    value={formData.supervisorName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter supervisor name"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Company Address
                                </label>
                                <textarea
                                    name="companyAddress"
                                    value={formData.companyAddress}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter company address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supervisor Contact
                                </label>
                                <input
                                    type="text"
                                    name="supervisorContact"
                                    value={formData.supervisorContact}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                                    placeholder="Enter supervisor contact"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Notes</h3>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                            placeholder="Enter any additional notes"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Financial Details
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}