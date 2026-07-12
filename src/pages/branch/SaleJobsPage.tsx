import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import useSaleJob from '../../hooks/useSaleJob';
import { useStaff } from '../../hooks/useStaff';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import {
  SALE_JOB_TYPE_LABELS,
  type SaleJob,
  type SaleJobType,
  type JobStatus,
} from '../../types/saleJob.types';
import {
  Briefcase,
  UserPlus,
  UserMinus,
  Play,
  CheckCircle2,
  RefreshCcw,
  Search,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  WAITING_PARTS: 'bg-amber-100 text-amber-700',
  WAITING_APPROVAL: 'bg-amber-100 text-amber-700',
  QUALITY_CHECK: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  READY_DELIVERY: 'bg-teal-100 text-teal-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'text-gray-500',
  NORMAL: 'text-gray-700',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600 font-semibold',
};

const JOB_TYPES: SaleJobType[] = ['PHOTO_FRAME', 'GRAPHIC_DESIGN', 'PRINTING', 'CUSTOM', 'OTHER'];
const STATUSES: JobStatus[] = [
  'PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK',
  'COMPLETED', 'READY_DELIVERY', 'DELIVERED', 'ON_HOLD', 'CANCELLED',
];

type Tab = 'all' | 'mine';

const SaleJobsPage = () => {
  const { user } = useAuth();
  const { hasPermission, isAdmin, isManager } = usePermissions();
  const { getSaleJobs, getMyJobs, claimJob, assignJob, unassignJob, updateStatus, completeJob } = useSaleJob();
  const { getAllStaff } = useStaff();

  const canAssign = isAdmin || isManager || hasPermission('salejobs.assign');
  const currentUserId = user?.id;

  const [tab, setTab] = useState<Tab>('all');
  const [jobs, setJobs] = useState<SaleJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  // Assign dialog
  const [assignTarget, setAssignTarget] = useState<SaleJob | null>(null);
  const [staffOptions, setStaffOptions] = useState<Array<{ userId: string; name: string }>>([]);
  const [selectedStaff, setSelectedStaff] = useState('');

  // Complete dialog
  const [completeTarget, setCompleteTarget] = useState<SaleJob | null>(null);
  // Opt-in: customer is NOT notified unless the staff explicitly ticks the box.
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [completeRemarks, setCompleteRemarks] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = {
      search: search || undefined,
      status: statusFilter || undefined,
      jobType: typeFilter || undefined,
      unassignedOnly: tab === 'all' ? unassignedOnly : undefined,
      limit: 100,
    };
    const res = tab === 'mine' ? await getMyJobs(params) : await getSaleJobs(params);
    const payload = (res?.data as { data?: SaleJob[] }) ?? {};
    setJobs(Array.isArray(payload.data) ? payload.data : []);
    setLoading(false);
  }, [tab, search, statusFilter, typeFilter, unassignedOnly, getSaleJobs, getMyJobs]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter, typeFilter, unassignedOnly]);

  const openAssign = async (job: SaleJob) => {
    setAssignTarget(job);
    setSelectedStaff(job.assignedToId || '');
    try {
      const res = await getAllStaff(1, 100, { branchId: job.locationId, isActive: true });
      const list = (res as { staff?: Array<{ user: { id: string; name: string } }> })?.staff ?? [];
      setStaffOptions(list.map((m) => ({ userId: m.user.id, name: m.user.name })));
    } catch {
      setStaffOptions([]);
    }
  };

  const doAssign = async () => {
    if (!assignTarget || !selectedStaff) return;
    await assignJob(assignTarget.id, selectedStaff);
    setAssignTarget(null);
    load();
  };

  const doClaim = async (job: SaleJob) => {
    await claimJob(job.id);
    load();
  };

  const doUnassign = async (job: SaleJob) => {
    await unassignJob(job.id);
    load();
  };

  const doStart = async (job: SaleJob) => {
    await updateStatus(job.id, 'IN_PROGRESS');
    load();
  };

  const doComplete = async () => {
    if (!completeTarget) return;
    await completeJob(completeTarget.id, { remarks: completeRemarks || undefined, notifyCustomer });
    setCompleteTarget(null);
    setCompleteRemarks('');
    setNotifyCustomer(false);
    load();
  };

  const isFinished = (s: JobStatus) => s === 'COMPLETED' || s === 'DELIVERED' || s === 'CANCELLED';

  const rows = useMemo(() => jobs, [jobs]);

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="sale-jobs-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Sale Jobs</h1>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['all', 'mine'] as Tab[]).map((t) => (
          <button
            key={t}
            data-testid={`tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500'
            }`}
          >
            {t === 'all' ? 'All Jobs' : 'My Jobs'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
          <input
            data-testid="job-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search job # / title / customer"
            className="pl-8 pr-3 py-2 text-sm border rounded-md w-64"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="py-2 px-2 text-sm border rounded-md">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="py-2 px-2 text-sm border rounded-md">
          <option value="">All types</option>
          {JOB_TYPES.map((t) => <option key={t} value={t}>{SALE_JOB_TYPE_LABELS[t]}</option>)}
        </select>
        {tab === 'all' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
            Unassigned only
          </label>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">Job #</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Assignee</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No jobs found.</td></tr>
            )}
            {!loading && rows.map((job) => {
              const mine = job.assignedToId && job.assignedToId === currentUserId;
              const canUnassign = !!job.assignedToId && (canAssign || mine);
              return (
                <tr key={job.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{job.jobNumber}</td>
                  <td className="px-3 py-2">{job.title}</td>
                  <td className="px-3 py-2">{SALE_JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</td>
                  <td className="px-3 py-2">{job.customer?.name || job.customerName || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[job.status] || 'bg-gray-100'}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`px-3 py-2 ${PRIORITY_STYLES[job.priority] || ''}`}>{job.priority}</td>
                  <td className="px-3 py-2">{job.assignedTo?.name || (job.assignedToId ? 'Assigned' : <span className="text-gray-400">Unassigned</span>)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end flex-wrap">
                      {!job.assignedToId && !isFinished(job.status) && (
                        <Button data-testid="btn-claim" size="sm" variant="outline" onClick={() => doClaim(job)}>
                          <UserPlus className="w-3.5 h-3.5 mr-1" /> Claim
                        </Button>
                      )}
                      {canAssign && !isFinished(job.status) && (
                        <Button data-testid="btn-assign" size="sm" variant="outline" onClick={() => openAssign(job)}>
                          <UserPlus className="w-3.5 h-3.5 mr-1" /> {job.assignedToId ? 'Reassign' : 'Assign'}
                        </Button>
                      )}
                      {canUnassign && !isFinished(job.status) && (
                        <Button data-testid="btn-unassign" size="sm" variant="ghost" onClick={() => doUnassign(job)}>
                          <UserMinus className="w-3.5 h-3.5 mr-1" /> Unassign
                        </Button>
                      )}
                      {job.status === 'PENDING' && (mine || canAssign) && (
                        <Button data-testid="btn-start" size="sm" variant="ghost" onClick={() => doStart(job)}>
                          <Play className="w-3.5 h-3.5 mr-1" /> Start
                        </Button>
                      )}
                      {!isFinished(job.status) && (mine || canAssign) && (
                        <Button data-testid="btn-complete" size="sm" onClick={() => setCompleteTarget(job)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {assignTarget?.jobNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Staff member (same branch)</label>
            <select
              data-testid="assign-staff-select"
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full py-2 px-2 text-sm border rounded-md"
            >
              <option value="">Select staff…</option>
              {staffOptions.map((s) => <option key={s.userId} value={s.userId}>{s.name}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>Cancel</Button>
            <Button data-testid="assign-confirm" onClick={doAssign} disabled={!selectedStaff}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={!!completeTarget} onOpenChange={(o) => !o && setCompleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete {completeTarget?.jobNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              data-testid="complete-remarks"
              value={completeRemarks}
              onChange={(e) => setCompleteRemarks(e.target.value)}
              placeholder="Completion remarks (optional)"
              className="w-full py-2 px-2 text-sm border rounded-md"
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm">
              <input data-testid="notify-customer" type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} />
              Notify customer via SMS / Email / WhatsApp — optional, off by default
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>Cancel</Button>
            <Button data-testid="complete-confirm" onClick={doComplete}>Confirm Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaleJobsPage;
