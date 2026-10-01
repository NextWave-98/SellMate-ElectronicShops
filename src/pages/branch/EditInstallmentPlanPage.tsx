import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Info, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import PlanDocuments, { type PlanDocument } from '../../components/installments/PlanDocuments';

type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

interface Row {
    id: string;
    installmentNumber: number;
    dueDate: string;
    amountDue: number;
    amountPaid: number;
    lateFee: number;
    totalAmountPaid: number;
    status: string;
}

interface Plan {
    id: string;
    planNumber: string;
    status: string;
    customer: { name: string; phone: string };
    productDescription?: string;
    notes?: string;
    totalAmount: number;
    downPayment: number;
    financedAmount: number;
    numberOfInstallments: number;
    installmentAmount: number;
    frequency: Frequency;
    interestRate: number;
    lateFeePercentage: number;
    lateFeeFixed: number;
    startDate: string;
    firstPaymentDate?: string;
    totalOutstanding: number;
    payments?: Row[];
    documents?: PlanDocument[];
}

const n = (v: unknown) => Number(v) || 0;
const round2 = (v: number) => Math.round(v * 100) / 100;
const rs = (v: unknown) => `Rs. ${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : '');
/** Same rule as the backend (annual flat interest, prorated by plan length). */
const termInYears = (count: number, f: Frequency) =>
    f === 'WEEKLY' ? (count * 7) / 365 : f === 'BIWEEKLY' ? (count * 14) / 365 : count / 12;
/** A row with any money or late fee on it is kept as-is when rescheduling. */
const touched = (r: Row) => n(r.totalAmountPaid) > 0.005 || n(r.amountPaid) > 0.005 || n(r.lateFee) > 0.005;

export default function EditInstallmentPlanPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        productDescription: '',
        notes: '',
        numberOfInstallments: '',
        frequency: 'MONTHLY' as Frequency,
        interestRate: '',
        startDate: '',
        firstPaymentDate: '',
        lateFeePercentage: '',
        lateFeeFixed: '',
    });

    const { fetchData: getPlan } = useFetch<Plan>(`/installments/plans/${id}`);
    const { fetchData: savePlan } = useFetch<Plan>(`/installments/plans/${id}`);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await getPlan({ method: 'GET', silent: true });
                if (res?.success && res.data) {
                    const p = res.data;
                    setPlan(p);
                    const open = (p.payments || []).filter((r) => !touched(r));
                    const anyPaid = (p.payments || []).some(touched);
                    setForm({
                        productDescription: p.productDescription || '',
                        notes: p.notes || '',
                        numberOfInstallments: String(p.numberOfInstallments),
                        frequency: p.frequency,
                        interestRate: String(n(p.interestRate)),
                        startDate: day(p.startDate),
                        // After payments this field means "next unpaid installment date".
                        firstPaymentDate: anyPaid ? day(open[0]?.dueDate) : day(p.firstPaymentDate || p.payments?.[0]?.dueDate),
                        lateFeePercentage: String(n(p.lateFeePercentage)),
                        lateFeeFixed: String(n(p.lateFeeFixed)),
                    });
                }
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const rows = plan?.payments || [];
    const kept = rows.filter(touched);
    const open = rows.filter((r) => !touched(r));
    const hasActivity = kept.length > 0;

    const preview = useMemo(() => {
        if (!plan) return null;
        const count = parseInt(form.numberOfInstallments, 10);
        if (!Number.isInteger(count) || count < 1) return { error: 'Enter the number of installments' };
        if (!hasActivity) {
            const rate = n(form.interestRate);
            const interest = round2(n(plan.financedAmount) * (rate / 100) * termInYears(count, form.frequency));
            const total = round2(n(plan.financedAmount) + interest);
            return { count, each: round2(total / count), interest, total };
        }
        const remainingCount = count - kept.length;
        if (remainingCount < 1) {
            return { error: `At least ${kept.length + 1} installments are needed (${kept.length} already have payments)` };
        }
        const remaining = round2(open.reduce((s, r) => s + n(r.amountDue), 0));
        return { count: remainingCount, each: round2(remaining / remainingCount), remaining };
    }, [plan, form.numberOfInstallments, form.interestRate, form.frequency, hasActivity, kept.length, open]);

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!plan) return;
        if (preview && 'error' in preview && preview.error) {
            toast.error(preview.error);
            return;
        }
        const body: Record<string, unknown> = {
            productDescription: form.productDescription,
            notes: form.notes,
            lateFeePercentage: n(form.lateFeePercentage),
            lateFeeFixed: n(form.lateFeeFixed),
            numberOfInstallments: parseInt(form.numberOfInstallments, 10),
            frequency: form.frequency,
        };
        if (form.firstPaymentDate) body.firstPaymentDate = new Date(form.firstPaymentDate).toISOString();
        if (!hasActivity) {
            body.interestRate = n(form.interestRate);
            if (form.startDate) body.startDate = new Date(form.startDate).toISOString();
        }
        setSaving(true);
        try {
            const res = await savePlan({ method: 'PUT', data: body, silent: true });
            if (res?.success) {
                toast.success('Installment plan updated');
                navigate(`../installments/${plan.id}`);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
            </div>
        );
    }
    if (!plan) {
        return <div className="p-8 text-center text-gray-600">Plan not found</div>;
    }
    const editable = plan.status === 'ACTIVE' || plan.status === 'DEFAULTED';

    return (
        <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate(`../installments/${plan.id}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">Edit Plan {plan.planNumber}</h1>
                    <p className="text-gray-600 mt-1">{plan.customer?.name} · {plan.customer?.phone}</p>
                </div>
            </div>

            {!editable && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    A {plan.status.toLowerCase()} plan cannot be edited.
                </div>
            )}

            <Card className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-gray-500">Total amount</p><p className="font-semibold">{rs(plan.totalAmount)}</p></div>
                    <div><p className="text-gray-500">Down payment</p><p className="font-semibold">{rs(plan.downPayment)}</p></div>
                    <div><p className="text-gray-500">Financed</p><p className="font-semibold">{rs(plan.financedAmount)}</p></div>
                    <div><p className="text-gray-500">Outstanding</p><p className="font-semibold text-red-600">{rs(plan.totalOutstanding)}</p></div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                    Items, total and down payment are part of the sale and cannot be changed here — cancel the plan (with stock return) and create a new one for that.
                </p>
            </Card>

            <Card className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Payment schedule</h2>
                {hasActivity ? (
                    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                            {kept.length} installment{kept.length === 1 ? '' : 's'} already {kept.length === 1 ? 'has' : 'have'} payments and stay as they are.
                            Only the remaining {open.length} ({rs(open.reduce((s, r) => s + n(r.amountDue), 0))}) will be rescheduled.
                            The interest rate and start date are locked after the first payment.
                        </span>
                    </div>
                ) : (
                    <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>No payments yet — the whole schedule is rebuilt from the financed amount.</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label className="mb-1">Number of installments (total)</Label>
                        <Input type="number" min={1} max={520} value={form.numberOfInstallments} onChange={set('numberOfInstallments')} disabled={!editable} />
                    </div>
                    <div>
                        <Label className="mb-1">Frequency</Label>
                        <select
                            value={form.frequency}
                            onChange={set('frequency')}
                            disabled={!editable}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white"
                        >
                            <option value="WEEKLY">Weekly</option>
                            <option value="BIWEEKLY">Every 14 days</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                    </div>
                    <div>
                        <Label className="mb-1">Interest rate (% per year, flat)</Label>
                        <Input type="number" min={0} step="0.01" value={form.interestRate} onChange={set('interestRate')} disabled={!editable || hasActivity} />
                    </div>
                    <div>
                        <Label className="mb-1">Start date</Label>
                        <Input type="date" value={form.startDate} onChange={set('startDate')} disabled={!editable || hasActivity} />
                    </div>
                    <div>
                        <Label className="mb-1">{hasActivity ? 'Next installment date' : 'First installment date'}</Label>
                        <Input type="date" value={form.firstPaymentDate} onChange={set('firstPaymentDate')} disabled={!editable} />
                    </div>
                </div>

                {preview && (
                    'error' in preview && preview.error ? (
                        <p className="text-sm text-red-600">{preview.error}</p>
                    ) : (
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-800">
                            {hasActivity ? (
                                <>New schedule: <b>{(preview as any).count}</b> remaining installments of about <b>{rs((preview as any).each)}</b> (total {rs((preview as any).remaining)} — unchanged).</>
                            ) : (
                                <>New schedule: <b>{(preview as any).count}</b> installments of about <b>{rs((preview as any).each)}</b> · interest {rs((preview as any).interest)} · total repayable {rs((preview as any).total)}.</>
                            )}
                        </div>
                    )
                )}
            </Card>

            <Card className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Late fee & details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="mb-1">Late fee (%) per overdue installment</Label>
                        <Input type="number" min={0} max={100} step="0.01" value={form.lateFeePercentage} onChange={set('lateFeePercentage')} disabled={!editable} />
                    </div>
                    <div>
                        <Label className="mb-1">Late fee (fixed Rs.) per overdue installment</Label>
                        <Input type="number" min={0} step="0.01" value={form.lateFeeFixed} onChange={set('lateFeeFixed')} disabled={!editable} />
                    </div>
                </div>
                <p className="text-xs text-gray-500">Late fee changes apply to late fees charged from now on; fees already charged stay.</p>
                <div>
                    <Label className="mb-1">Product description</Label>
                    <Input value={form.productDescription} onChange={set('productDescription')} maxLength={255} disabled={!editable} />
                </div>
                <div>
                    <Label className="mb-1">Notes</Label>
                    <textarea
                        value={form.notes}
                        onChange={set('notes')}
                        rows={3}
                        disabled={!editable}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                </div>
            </Card>

            <PlanDocuments
                planId={plan.id}
                documents={plan.documents || []}
                editable={plan.status !== 'CANCELLED'}
                onChange={(docs) => setPlan((p) => (p ? { ...p, documents: docs } : p))}
            />

            <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(`../installments/${plan.id}`)} disabled={saving}>
                    Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={saving || !editable}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save changes
                </Button>
            </div>
        </form>
    );
}
