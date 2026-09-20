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
  Package,
  Truck,
  X,
} from 'lucide-react';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import { useShopAPI } from '../../hooks/useShopAPI';
import facebookLeadsService, { LEAD_STATUSES } from '../../services/facebookLeadsService';
import type {
  FacebookLead,
  FacebookLeadStatus,
  FacebookLeadStats,
  StaffOption,
  CreateOrderPayload,
} from '../../services/facebookLeadsService';
import LeadInteractionPanel from '../../components/FacebookLeads/LeadInteractionPanel';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import alert from '../../utils/alert';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

const STATUS_META: Record<FacebookLeadStatus, { label: string; color: string }> = {
  NEW: { label: 'New', color: 'bg-blue-600' },
  CONTACTED: { label: 'Contacted', color: 'bg-amber-600' },
  QUALIFIED: { label: 'Qualified', color: 'bg-purple-600' },
  WON: { label: 'Won', color: 'bg-green-600' },
  LOST: { label: 'Lost', color: 'bg-gray-500' },
  ORDER_CONFIRMED: { label: 'Order Confirmed', color: 'bg-emerald-600' },
  ON_HOLD: { label: 'On Hold', color: 'bg-yellow-500' },
  CALL_ATTEMPT_1: { label: 'Call Attempt 1', color: 'bg-sky-500' },
  CALL_ATTEMPT_2: { label: 'Call Attempt 2', color: 'bg-sky-600' },
  CALL_ATTEMPT_3: { label: 'Call Attempt 3', color: 'bg-sky-700' },
  NO_RESPONSE: { label: 'No Response', color: 'bg-orange-500' },
  REJECTED: { label: 'Rejected', color: 'bg-red-600' },
  ORDER_CREATED: { label: 'Order Created', color: 'bg-green-700' },
};

const statusLabel = (s: FacebookLeadStatus) => STATUS_META[s]?.label ?? s;
const statusColor: Record<FacebookLeadStatus, string> = Object.fromEntries(
  (Object.keys(STATUS_META) as FacebookLeadStatus[]).map((s) => [s, STATUS_META[s].color]),
) as Record<FacebookLeadStatus, string>;

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

  // Create-order modal state
  const [orderLead, setOrderLead] = useState<FacebookLead | null>(null);
  const [orderForm, setOrderForm] = useState<CreateOrderPayload>({
    recipientAddress: '',
    recipientCity: '',
  });
  const [orderSubmitting, setOrderSubmitting] = useState(false);

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
        `Synced ${res.data.synced} new lead(s)   ${res.data.skipped} already imported.`,
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

  const openOrder = (lead: FacebookLead) => {
    setOrderLead(lead);
    setOrderForm({
      recipientAddress: '',
      recipientCity: '',
      recipientName: lead.fullName || '',
      recipientPhone: lead.phone || '',
      paymentMethod: 'cod',
      numberOfPieces: 1,
    });
  };

  const setOrderField = <K extends keyof CreateOrderPayload>(
    key: K,
    value: CreateOrderPayload[K],
  ) => setOrderForm((f) => ({ ...f, [key]: value }));

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !orderLead) return;
    if (!orderForm.recipientAddress.trim() || !orderForm.recipientCity.trim()) {
      alert.error('Delivery address and city are required.');
      return;
    }
    setOrderSubmitting(true);
    try {
      const res = await facebookLeadsService.createOrder(businessId, orderLead.id, orderForm);
      const updated = res.data.lead;
      alert.success(
        updated.trackingNumber
          ? `Order created   tracking ${updated.trackingNumber}`
          : 'Order created and courier shipment generated.',
      );
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
      if (selected?.id === updated.id) setSelected((s) => (s ? { ...s, ...updated } : s));
      setOrderLead(null);
      fetchStats();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name || '';

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Facebook className="text-[#1877F2]" /> Leads
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatCard label="Total Leads" value={stats.total} />
          <StatCard label="Orders Created" value={stats.ordersCreated ?? 0} accent="text-green-700" />
          <StatCard
            label="Success Rate"
            value={`${stats.successRate ?? 0}%`}
            accent="text-emerald-600"
          />
          <StatCard label="Converted" value={stats.converted} accent="text-blue-600" />
          <StatCard label="Rejected / Lost" value={stats.rejected ?? 0} accent="text-red-600" />
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
          {LEAD_STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {statusLabel(s)}
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
                      {lead.source && lead.source !== 'FACEBOOK' && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {lead.source.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div>{lead.phone || ' '}</div>
                      <div className="text-xs text-muted-foreground">{lead.email || ''}</div>
                    </td>
                    <td className="p-3">{lead.formName || ' '}</td>
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
                        {LEAD_STATUSES.map((s) => (
                          <NativeSelectOption key={s} value={s}>
                            {statusLabel(s)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {lead.courierShipmentId ? (
                          <Badge className="bg-green-700 gap-1">
                            <Truck className="size-3" />
                            {lead.trackingNumber || 'Ordered'}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openOrder(lead)}
                            disabled={!lead.phone}
                            title={lead.phone ? 'Create order + shipment' : 'Lead has no phone'}
                          >
                            <Package className="size-4 mr-1" /> Order
                          </Button>
                        )}
                        {!lead.customerId && !lead.courierShipmentId && (
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
            <Badge className={statusColor[selected.status]}>{statusLabel(selected.status)}</Badge>
            {selected.source && (
              <Badge variant="outline" className="ml-2">
                {selected.source.replace(/_/g, ' ')}
              </Badge>
            )}
            {selected.courierShipmentId && (
              <Badge className="ml-2 bg-green-700 gap-1">
                <Truck className="size-3" />
                {selected.trackingNumber || 'Ordered'}
              </Badge>
            )}
            <div className="text-sm space-y-1">
              <div>
                <strong>Phone:</strong> {selected.phone || ' '}
              </div>
              <div>
                <strong>Email:</strong> {selected.email || ' '}
              </div>
              <div>
                <strong>Form:</strong> {selected.formName || ' '}
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

            <LeadInteractionPanel leadId={selected.id} phone={selected.phone} />

            {selected.courierShipmentId && (
              <div className="text-sm rounded-md border bg-muted/30 p-2 space-y-1">
                <div className="font-medium flex items-center gap-1">
                  <Truck className="size-4" /> Order / Shipment
                </div>
                <div>
                  <strong>Tracking:</strong> {selected.trackingNumber || ' '}
                </div>
                {selected.orderAmount != null && (
                  <div>
                    <strong>Amount:</strong> {selected.orderAmount}
                  </div>
                )}
                {selected.orderCreatedAt && (
                  <div>
                    <strong>Created:</strong> {new Date(selected.orderCreatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
              {!selected.courierShipmentId && (
                <Button onClick={() => openOrder(selected)} disabled={!selected.phone}>
                  <Package className="size-4 mr-1" /> Create order
                </Button>
              )}
              {!selected.customerId && !selected.courierShipmentId && (
                <Button variant="outline" onClick={() => handleConvert(selected)} disabled={!selected.phone}>
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
      {/* Create Order modal */}
      {orderLead && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !orderSubmitting && setOrderLead(null)}
        >
          <form
            className="bg-background w-full max-w-lg rounded-lg shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateOrder}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="size-5" /> Create Order
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOrderLead(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                For <strong>{orderLead.fullName || orderLead.phone}</strong>. A courier shipment is
                created automatically and the lead is marked <em>Order Created</em>.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Recipient name">
                  <Input
                    value={orderForm.recipientName || ''}
                    onChange={(e) => setOrderField('recipientName', e.target.value)}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={orderForm.recipientPhone || ''}
                    onChange={(e) => setOrderField('recipientPhone', e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Delivery address *">
                <Input
                  value={orderForm.recipientAddress}
                  onChange={(e) => setOrderField('recipientAddress', e.target.value)}
                  placeholder="No, street, area"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="City *">
                  <Input
                    value={orderForm.recipientCity}
                    onChange={(e) => setOrderField('recipientCity', e.target.value)}
                  />
                </Field>
                <Field label="District">
                  <Input
                    value={orderForm.recipientDistrict || ''}
                    onChange={(e) => setOrderField('recipientDistrict', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Order amount">
                  <Input
                    type="number"
                    min="0"
                    value={orderForm.orderAmount ?? ''}
                    onChange={(e) =>
                      setOrderField(
                        'orderAmount',
                        e.target.value === '' ? undefined : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field label="Shipping">
                  <Input
                    type="number"
                    min="0"
                    value={orderForm.shippingCharge ?? ''}
                    onChange={(e) =>
                      setOrderField(
                        'shippingCharge',
                        e.target.value === '' ? undefined : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field label="Weight (kg)">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={orderForm.weight ?? ''}
                    onChange={(e) =>
                      setOrderField(
                        'weight',
                        e.target.value === '' ? undefined : Number(e.target.value),
                      )
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment method">
                  <NativeSelect
                    value={orderForm.paymentMethod || 'cod'}
                    onChange={(e) =>
                      setOrderField(
                        'paymentMethod',
                        e.target.value as CreateOrderPayload['paymentMethod'],
                      )
                    }
                  >
                    <NativeSelectOption value="cod">Cash on Delivery</NativeSelectOption>
                    <NativeSelectOption value="bank">Bank Transfer</NativeSelectOption>
                    <NativeSelectOption value="cash">Cash</NativeSelectOption>
                    <NativeSelectOption value="online">Online</NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field label="COD amount">
                  <Input
                    type="number"
                    min="0"
                    disabled={orderForm.paymentMethod !== 'cod'}
                    value={orderForm.codAmount ?? ''}
                    onChange={(e) =>
                      setOrderField(
                        'codAmount',
                        e.target.value === '' ? undefined : Number(e.target.value),
                      )
                    }
                    placeholder={orderForm.paymentMethod === 'cod' ? 'defaults to order amount' : ' '}
                  />
                </Field>
              </div>

              <Field label="Pieces">
                <Input
                  type="number"
                  min="1"
                  value={orderForm.numberOfPieces ?? 1}
                  onChange={(e) =>
                    setOrderField(
                      'numberOfPieces',
                      e.target.value === '' ? undefined : Number(e.target.value),
                    )
                  }
                />
              </Field>

              <Field label="Notes">
                <textarea
                  className="w-full min-h-16 rounded-md border bg-background p-2 text-sm"
                  value={orderForm.notes || ''}
                  onChange={(e) => setOrderField('notes', e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrderLead(null)}
                disabled={orderSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={orderSubmitting}>
                <Truck className="size-4 mr-1" />
                {orderSubmitting ? 'Creating…' : 'Create order + shipment'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {children}
  </label>
);

const StatCard: React.FC<{ label: string; value: number | string; accent?: string }> = ({
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
