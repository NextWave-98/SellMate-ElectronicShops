/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  Facebook,
  Search,
  UserPlus,
  Settings as SettingsIcon,
  RefreshCw,
  Download,
  Trash2,
  Save,
} from 'lucide-react';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import { useShopAPI } from '../../hooks/useShopAPI';
import facebookLeadsService, {
  FacebookLead,
  FacebookLeadStatus,
  FacebookLeadStats,
  StaffOption,
} from '../../services/facebookLeadsService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import alert from '../../utils/alert';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

const STATUSES: FacebookLeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];

const statusColor: Record<FacebookLeadStatus, string> = {
  NEW: 'bg-blue-600',
  CONTACTED: 'bg-amber-600',
  QUALIFIED: 'bg-purple-600',
  WON: 'bg-green-600',
  LOST: 'bg-gray-500',
};

const FacebookLeadsPage: React.FC = () => {
  const { user } = useAuthRedux();
  const businessId = user?.businessId ?? undefined;
  const { getAllBranches } = useShopAPI();

  const [leads, setLeads] = useState<FacebookLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FacebookLeadStatus | ''>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [formFilter, setFormFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FacebookLead | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [stats, setStats] = useState<FacebookLeadStats | null>(null);
  const [syncing, setSyncing] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchLeads = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await facebookLeadsService.listLeads(businessId, {
        status: statusFilter || undefined,
        branchId: branchFilter || undefined,
        formId: formFilter || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });
      setLeads(res.data);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!businessId) return;
    try {
      const res = await facebookLeadsService.getStats(businessId, branchFilter || undefined);
      setStats(res.data);
    } catch {
      /* stats are best-effort */
    }
  };

  // One-time: branches + staff for filters and assignment.
  useEffect(() => {
    (async () => {
      try {
        const res = await getAllBranches(1, 200, true);
        setBranches((res?.branches ?? []).map((b) => ({ id: b.id, name: b.name })));
      } catch {
        /* ignore */
      }
      try {
        setStaff(await facebookLeadsService.getStaff());
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [businessId, statusFilter, branchFilter, formFilter, page]);

  // Realtime: refresh when a new lead arrives for this org.
  useEffect(() => {
    if (!businessId) return;
    const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join_org', businessId));
    socket.on('new_facebook_lead', () => {
      fetchStats();
      if (page === 1) fetchLeads();
      else alert.success('New Facebook lead received.');
    });
    return () => {
      socket.off('new_facebook_lead');
      socket.disconnect();
    };
  }, [businessId, page]);

  const handleStatus = async (lead: FacebookLead, status: FacebookLeadStatus) => {
    if (!businessId) return;
    try {
      await facebookLeadsService.updateLeadStatus(businessId, lead.id, status);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
      fetchStats();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleAssign = async (lead: FacebookLead, staffId: string) => {
    if (!businessId) return;
    try {
      await facebookLeadsService.assignLead(businessId, lead.id, staffId || null);
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, assignedStaffId: staffId || null } : l)),
      );
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to assign lead');
    }
  };

  const handleConvert = async (lead: FacebookLead) => {
    if (!businessId) return;
    if (!lead.phone) {
      alert.error('This lead has no phone number and cannot be converted.');
      return;
    }
    if (!confirm(`Convert "${lead.fullName || lead.phone}" to a customer?`)) return;
    try {
      await facebookLeadsService.convertLead(businessId, lead.id);
      alert.success('Lead converted to customer.');
      fetchLeads();
      fetchStats();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to convert lead');
    }
  };

  const handleDelete = async (lead: FacebookLead) => {
    if (!businessId) return;
    if (!confirm(`Delete lead "${lead.fullName || lead.phone || lead.leadgenId}"? This cannot be undone.`))
      return;
    try {
      await facebookLeadsService.deleteLead(businessId, lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      if (selected?.id === lead.id) setSelected(null);
      fetchStats();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  };

  const handleSaveNotes = async () => {
    if (!businessId || !selected) return;
    try {
      await facebookLeadsService.updateNotes(businessId, selected.id, noteDraft || null);
      setLeads((prev) => prev.map((l) => (l.id === selected.id ? { ...l, notes: noteDraft } : l)));
      setSelected((s) => (s ? { ...s, notes: noteDraft } : s));
      alert.success('Notes saved.');
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to save notes');
    }
  };

  const handleSync = async () => {
    if (!businessId) return;
    if (!branchFilter) {
      alert.warn('Select a branch first to sync its historical leads.');
      return;
    }
    setSyncing(true);
    try {
      const res = await facebookLeadsService.syncLeads(businessId, branchFilter, formFilter || undefined);
      alert.success(
        `Synced ${res.data.synced} new lead(s) — ${res.data.skipped} already imported.`,
      );
      fetchLeads();
      fetchStats();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to sync leads');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    if (!businessId) return;
    try {
      await facebookLeadsService.exportLeads(businessId, {
        status: statusFilter || undefined,
        branchId: branchFilter || undefined,
        formId: formFilter || undefined,
        search: search || undefined,
      });
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to export leads');
    }
  };

  const openDetail = (lead: FacebookLead) => {
    setSelected(lead);
    setNoteDraft(lead.notes || '');
  };

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name || '';

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Facebook className="text-[#1877F2]" /> Facebook Leads
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`size-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLeads}>
            <RefreshCw className="size-4 mr-1" /> Refresh
          </Button>
          <Link to="/superadmin/facebook-leads/settings">
            <Button variant="outline" size="sm">
              <SettingsIcon className="size-4 mr-1" /> Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Converted" value={stats.converted} accent="text-green-600" />
          {STATUSES.map((s) => (
            <StatCard key={s} label={s} value={stats.byStatus[s] ?? 0} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-8 w-64"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchLeads();
              }
            }}
          />
        </div>
        <NativeSelect
          value={branchFilter}
          onChange={(e) => {
            setPage(1);
            setFormFilter('');
            setBranchFilter(e.target.value);
          }}
        >
          <NativeSelectOption value="">All branches</NativeSelectOption>
          {branches.map((b) => (
            <NativeSelectOption key={b.id} value={b.id}>
              {b.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as FacebookLeadStatus | '');
          }}
        >
          <NativeSelectOption value="">All statuses</NativeSelectOption>
          {STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {s}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {stats && stats.byForm.length > 0 && (
          <NativeSelect
            value={formFilter}
            onChange={(e) => {
              setPage(1);
              setFormFilter(e.target.value);
            }}
          >
            <NativeSelectOption value="">All forms</NativeSelectOption>
            {stats.byForm
              .filter((f) => f.formId)
              .map((f) => (
                <NativeSelectOption key={f.formId!} value={f.formId!}>
                  {f.formName || f.formId} ({f.count})
                </NativeSelectOption>
              ))}
          </NativeSelect>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Form</th>
                <th className="p-3">Assigned</th>
                <th className="p-3">Received</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <button
                        className="font-medium text-blue-600 hover:underline text-left"
                        onClick={() => openDetail(lead)}
                      >
                        {lead.fullName || '(no name)'}
                      </button>
                      {lead.customerId && (
                        <Badge variant="secondary" className="ml-2">
                          Customer
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div>{lead.phone || '—'}</div>
                      <div className="text-xs text-muted-foreground">{lead.email || ''}</div>
                    </td>
                    <td className="p-3">{lead.formName || '—'}</td>
                    <td className="p-3">
                      <NativeSelect
                        size="sm"
                        value={lead.assignedStaffId || ''}
                        onChange={(e) => handleAssign(lead, e.target.value)}
                      >
                        <NativeSelectOption value="">Unassigned</NativeSelectOption>
                        {staff.map((s) => (
                          <NativeSelectOption key={s.id} value={s.id}>
                            {s.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <NativeSelect
                        size="sm"
                        value={lead.status}
                        onChange={(e) => handleStatus(lead, e.target.value as FacebookLeadStatus)}
                      >
                        {STATUSES.map((s) => (
                          <NativeSelectOption key={s} value={s}>
                            {s}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {!lead.customerId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConvert(lead)}
                            disabled={!lead.phone}
                          >
                            <UserPlus className="size-4 mr-1" /> Convert
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleDelete(lead)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-background w-full max-w-md h-full overflow-y-auto p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.fullName || 'Lead'}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <Badge className={statusColor[selected.status]}>{selected.status}</Badge>
            <div className="text-sm space-y-1">
              <div>
                <strong>Phone:</strong> {selected.phone || '—'}
              </div>
              <div>
                <strong>Email:</strong> {selected.email || '—'}
              </div>
              <div>
                <strong>Form:</strong> {selected.formName || '—'}
              </div>
              <div>
                <strong>Assigned:</strong> {staffName(selected.assignedStaffId) || 'Unassigned'}
              </div>
              <div>
                <strong>Received:</strong> {new Date(selected.createdAt).toLocaleString()}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-1">Submitted fields</h3>
              <div className="space-y-1">
                {selected.fieldData?.map((f, i) => (
                  <div key={i} className="text-sm border-b py-1">
                    <span className="text-muted-foreground">{f.name}: </span>
                    {f.values?.join(', ')}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-1">Notes</h3>
              <textarea
                className="w-full min-h-24 rounded-md border bg-background p-2 text-sm"
                placeholder="Add a note about this lead…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <Button size="sm" className="mt-1" onClick={handleSaveNotes}>
                <Save className="size-4 mr-1" /> Save notes
              </Button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              {!selected.customerId && (
                <Button onClick={() => handleConvert(selected)} disabled={!selected.phone}>
                  <UserPlus className="size-4 mr-1" /> Convert to customer
                </Button>
              )}
              <Button variant="destructive" onClick={() => handleDelete(selected)}>
                <Trash2 className="size-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; accent?: string }> = ({
  label,
  value,
  accent,
}) => (
  <Card>
    <CardContent className="p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold ${accent ?? ''}`}>{value}</div>
    </CardContent>
  </Card>
);

export default FacebookLeadsPage;
