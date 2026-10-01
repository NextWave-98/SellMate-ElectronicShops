/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  ClipboardList,
  Package,
  Eye,
  CheckSquare,
  ListChecks,
} from 'lucide-react';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import { useShopAPI } from '../../hooks/useShopAPI';
import { useLeadFormsNav } from '../../hooks/useLeadFormsNav';
import useCourier, { type CourierShipment } from '../../hooks/useCourier';
import { usePermissions } from '../../hooks/usePermissions';
import { CourierShipmentModal } from '../../components/courier/modals';
import LeadInteractionPanel from '../../components/FacebookLeads/LeadInteractionPanel';
import { useCrm } from '../../hooks/useCrm';
import facebookLeadsService, { LEAD_STATUSES } from '../../services/facebookLeadsService';
import type {
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
import { confirmDialog } from '@/lib/confirm';

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

type LeadField = { name: string; values: string[] };

function normalizeKey(name: string) {
  return name.toLowerCase().replace(/[\s_\-]+/g, '');
}

function fieldValue(fields: LeadField[] | undefined, aliases: string[]): string | null {
  if (!fields?.length) return null;
  const wanted = aliases.map(normalizeKey);
  for (const f of fields) {
    const key = normalizeKey(f.name || '');
    if (!key) continue;
    if (wanted.some((w) => key === w || key.includes(w) || w.includes(key))) {
      const v = f.values?.[0];
      if (v != null && String(v).trim()) return String(v).trim();
    }
  }
  return null;
}

function leadDisplayName(lead: FacebookLead): string {
  if (lead.fullName?.trim()) return lead.fullName.trim();
  const fromFields =
    fieldValue(lead.fieldData, ['full_name', 'fullname', 'full name', 'your_name', 'customer_name']) ||
    [fieldValue(lead.fieldData, ['first_name', 'firstname']), fieldValue(lead.fieldData, ['last_name', 'lastname'])]
      .filter(Boolean)
      .join(' ')
      .trim();
  return fromFields || lead.phone || lead.email || '(no name)';
}

function leadShipmentPrefill(lead: FacebookLead): Partial<CourierShipment> {
  const name = leadDisplayName(lead);
  const phone =
    lead.phone ||
    fieldValue(lead.fieldData, ['phone_number', 'phone', 'mobile', 'whatsapp', 'contact_number']) ||
    '';
  const email = lead.email || fieldValue(lead.fieldData, ['email', 'email_address']) || undefined;
  const address =
    fieldValue(lead.fieldData, [
      'street_address',
      'address',
      'delivery_address',
      'shipping_address',
      'home_address',
      'full_address',
    ]) || '';
  const city =
    fieldValue(lead.fieldData, ['city', 'town', 'delivery_city']) || '';
  const district =
    fieldValue(lead.fieldData, ['district', 'state', 'province', 'region']) || undefined;
  const postal =
    fieldValue(lead.fieldData, ['postal_code', 'zip', 'zip_code', 'postcode']) || undefined;

  return {
    recipientName: name === '(no name)' ? 'Facebook Lead' : name,
    recipientPhone: phone,
    recipientEmail: email,
    recipientAddress: address,
    recipientCity: city,
    recipientDistrict: district,
    recipientPostalCode: postal,
    numberOfPieces: 1,
    description: `Lead order   ${name}`,
    notes: [
      `Facebook lead ${lead.id}`,
      lead.formName ? `Form: ${lead.formName}` : null,
      lead.notes ? `Lead notes: ${lead.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

const FacebookLeadsPage: React.FC = () => {
  const { user } = useAuthRedux();
  const businessId = user?.businessId ?? undefined;
  const { getAllBranches } = useShopAPI();
  const nav = useLeadFormsNav();
  const { hasCourierAccess } = usePermissions();
  const canUseCourier = hasCourierAccess();
  const { courierServices, fetchCourierServices, createCourierShipment } = useCourier();

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

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<FacebookLeadStatus | ''>('');
  const [bulkBusy, setBulkBusy] = useState(false);

  /** Queue of leads waiting for the shared courier modal (single + bulk). */
  const [orderQueue, setOrderQueue] = useState<FacebookLead[]>([]);
  const orderLead = orderQueue[0] ?? null;
  /** After a successful save, Done/onClose should open the next queued lead. */
  const advanceOnCloseRef = useRef(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (nav.lockedBranchId) setBranchFilter(nav.lockedBranchId);
  }, [nav.lockedBranchId]);

  useEffect(() => {
    if (canUseCourier) fetchCourierServices();
  }, [canUseCourier]);

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
      setCheckedIds(new Set());
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

  const pageSelectable = leads;
  const allPageChecked =
    pageSelectable.length > 0 && pageSelectable.every((l) => checkedIds.has(l.id));
  const checkedLeads = useMemo(
    () => leads.filter((l) => checkedIds.has(l.id)),
    [leads, checkedIds],
  );
  const checkedOrderable = useMemo(
    () => checkedLeads.filter((l) => !l.courierShipmentId && !!l.phone),
    [checkedLeads],
  );

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCheckAll = () => {
    if (allPageChecked) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        pageSelectable.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        pageSelectable.forEach((l) => next.add(l.id));
        return next;
      });
    }
  };

  const applyLeadUpdate = (updated: FacebookLead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setSelected((s) => (s?.id === updated.id ? { ...s, ...updated } : s));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(updated.id);
      return next;
    });
  };

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

  const handleBulkStatus = async () => {
    if (!businessId || !bulkStatus || checkedLeads.length === 0) return;
    if (
      !(await confirmDialog(
        `Change status of ${checkedLeads.length} lead(s) to "${statusLabel(bulkStatus)}"?`,
      ))
    )
      return;
    setBulkBusy(true);
    try {
      const res = await facebookLeadsService.bulkUpdateStatus(
        businessId,
        checkedLeads.map((l) => l.id),
        bulkStatus,
      );
      alert.success(`Updated ${res.data.updated} lead(s).`);
      setCheckedIds(new Set());
      setBulkStatus('');
      fetchLeads();
      fetchStats();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Bulk status update failed');
    } finally {
      setBulkBusy(false);
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
    if (!(await confirmDialog(`Convert "${leadDisplayName(lead)}" to a customer?`))) return;
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
    if (
      !(await confirmDialog(
        `Delete lead "${leadDisplayName(lead)}"? This cannot be undone.`,
      ))
    )
      return;
    try {
      await facebookLeadsService.deleteLead(businessId, lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      if (selected?.id === lead.id) setSelected(null);
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
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

  const { createFromLead: createTaskFromLead } = useCrm();
  const [raisingTask, setRaisingTask] = useState(false);

  /**
   * Put this lead into the CRM task inbox.
   *
   * The two lists were separate: a lead sat in the leads screen and the
   * follow-up somebody owed it lived only in their head. This raises the task
   * and points it back at the lead, so the task list can say where it came
   * from. Asking twice returns the task that already exists.
   */
  const raiseFollowUpTask = async (lead: FacebookLead) => {
    setRaisingTask(true);
    try {
      const due = new Date();
      due.setDate(due.getDate() + 1);
      const res: any = await createTaskFromLead({
        relatedType: 'FACEBOOK_LEAD',
        relatedId: lead.id,
        title: `Follow up lead   ${leadDisplayName(lead)}`,
        description: lead.phone ? `Phone: ${lead.phone}` : null,
        dueDate: due.toISOString(),
        priority: 'HIGH',
      });
      const created = res?.data?.created;
      if (created === false) alert.warn('A follow-up task already exists for this lead.');
      else if (res?.success || res?.status) alert.success('Follow-up task created.');
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Could not create the follow-up task');
    } finally {
      setRaisingTask(false);
    }
  };

  const openOrder = (lead: FacebookLead) => {
    if (!lead.phone && !fieldValue(lead.fieldData, ['phone_number', 'phone', 'mobile'])) {
      alert.error('This lead has no phone number   add contact details before creating an order.');
      return;
    }
    if (lead.courierShipmentId) {
      alert.warn('An order is already linked to this lead.');
      return;
    }
    advanceOnCloseRef.current = false;
    setOrderQueue([lead]);
  };

  const openBulkOrder = async () => {
    if (checkedOrderable.length === 0) {
      alert.warn('Select leads with a phone number that do not already have an order.');
      return;
    }
    if (
      !(await confirmDialog(
        `Create courier orders for ${checkedOrderable.length} lead(s)? You will fill each shipment one by one (same Quick Courier modal).`,
      ))
    )
      return;
    advanceOnCloseRef.current = false;
    setOrderQueue([...checkedOrderable]);
  };

  /** Done after success → next lead; Cancel / overlay → abort remaining queue. */
  const closeOrderModal = () => {
    if (advanceOnCloseRef.current) {
      advanceOnCloseRef.current = false;
      setOrderQueue((q) => q.slice(1));
      return;
    }
    setOrderQueue([]);
  };

  const handleShipmentSave = async (data: Partial<CourierShipment>) => {
    if (!businessId || !orderLead) return { success: false, message: 'No lead selected' };

    const response = await createCourierShipment(data);
    if (!response?.success) {
      alert.error(response?.message || 'Failed to create shipment');
      return response;
    }

    const shipment = (response.data ?? {}) as Record<string, unknown>;
    const shipmentId = String(shipment.id ?? '');
    const trackingNumber =
      (shipment.tracking_number as string | undefined) ||
      (shipment.trackingNumber as string | undefined) ||
      (shipment.shipment_number as string | undefined) ||
      (shipment.shipmentNumber as string | undefined) ||
      null;
    const orderAmount =
      typeof data.declaredValue === 'number'
        ? data.declaredValue
        : typeof data.codAmount === 'number'
          ? data.codAmount
          : null;

    if (!shipmentId) {
      alert.error('Shipment created but missing id   could not link to lead.');
      return response;
    }

    try {
      const linked = await facebookLeadsService.linkShipment(businessId, orderLead.id, {
        courierShipmentId: shipmentId,
        trackingNumber,
        orderAmount,
      });
      applyLeadUpdate(linked.data);
      alert.success(
        trackingNumber
          ? `Order linked   tracking ${trackingNumber}`
          : 'Order created and linked to lead.',
      );
      fetchStats();
      advanceOnCloseRef.current = true;
    } catch (err) {
      alert.error(
        err instanceof Error
          ? err.message
          : 'Shipment created but linking to lead failed   link it manually from courier.',
      );
    }

    return response;
  };

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name || '';
  const orderPrefill = orderLead ? leadShipmentPrefill(orderLead) : null;
  const queueRemaining = orderQueue.length;

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
          <Link to={nav.forms}>
            <Button variant="outline" size="sm">
              <ClipboardList className="size-4 mr-1" /> Lead Forms
            </Button>
          </Link>
          <Link to={nav.settings}>
            <Button variant="outline" size="sm">
              <SettingsIcon className="size-4 mr-1" /> Connect
            </Button>
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Converted" value={stats.converted} accent="text-green-600" />
          {(['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST', 'ORDER_CREATED'] as FacebookLeadStatus[]).map(
            (s) => (
              <StatCard key={s} label={statusLabel(s)} value={stats.byStatus[s] ?? 0} />
            ),
          )}
        </div>
      )}

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
        {!nav.isBranch && (
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
        )}
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

      {checkedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg border bg-muted/40 px-3 py-2">
          <CheckSquare className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{checkedIds.size} selected</span>
          <NativeSelect
            size="sm"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as FacebookLeadStatus | '')}
          >
            <NativeSelectOption value="">Bulk status…</NativeSelectOption>
            {LEAD_STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {statusLabel(s)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            size="sm"
            variant="outline"
            disabled={!bulkStatus || bulkBusy}
            onClick={handleBulkStatus}
          >
            Apply status
          </Button>
          {canUseCourier && (
          <Button
            size="sm"
            variant="outline"
            disabled={checkedOrderable.length === 0 || bulkBusy}
            onClick={openBulkOrder}
          >
            <Package className="size-4 mr-1" />
            Bulk order ({checkedOrderable.length})
          </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setCheckedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allPageChecked}
                    onChange={toggleCheckAll}
                    disabled={pageSelectable.length === 0}
                  />
                </th>
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
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const name = leadDisplayName(lead);
                  const ordered = !!lead.courierShipmentId;
                  return (
                    <tr
                      key={lead.id}
                      className={`border-t hover:bg-muted/30 ${checkedIds.has(lead.id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${name}`}
                          checked={checkedIds.has(lead.id)}
                          onChange={() => toggleCheck(lead.id)}
                        />
                      </td>
                      <td className="p-3">
                        <button
                          className="font-medium text-blue-600 hover:underline text-left"
                          onClick={() => openDetail(lead)}
                        >
                          {name}
                        </button>
                        {lead.customerId && (
                          <Badge variant="secondary" className="ml-2">
                            Customer
                          </Badge>
                        )}
                        {lead.trackingNumber && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Track: {lead.trackingNumber}
                          </div>
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
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="View full details"
                            onClick={() => openDetail(lead)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {!ordered && canUseCourier && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openOrder(lead)}
                              disabled={!lead.phone}
                              title="Create courier order"
                            >
                              <Package className="size-4 mr-1" /> Order
                            </Button>
                          )}
                          {!lead.customerId && !ordered && (
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
                  );
                })
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
              <h2 className="text-lg font-semibold">{leadDisplayName(selected)}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <Badge className={statusColor[selected.status] ?? 'bg-gray-500'}>
              {statusLabel(selected.status)}
            </Badge>
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
              {selected.trackingNumber && (
                <div>
                  <strong>Tracking:</strong> {selected.trackingNumber}
                </div>
              )}
              {selected.orderAmount != null && (
                <div>
                  <strong>Order amount:</strong> {selected.orderAmount}
                </div>
              )}
              {selected.courierShipmentId && (
                <div className="text-xs text-muted-foreground break-all">
                  Shipment ID: {selected.courierShipmentId}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-sm mb-1">Submitted fields</h3>
              <div className="space-y-1">
                {(selected.fieldData?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No field data stored for this lead.</p>
                ) : (
                  selected.fieldData.map((f, i) => (
                    <div key={i} className="text-sm border-b py-1">
                      <span className="text-muted-foreground">{f.name}: </span>
                      {f.values?.join(', ')}
                    </div>
                  ))
                )}
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

            <div className="pt-2 border-t">
              <Button size="sm" variant="outline" disabled={raisingTask} onClick={() => raiseFollowUpTask(selected)}>
                <ListChecks className="size-4 mr-1" />
                {raisingTask ? 'Adding…' : 'Add follow-up task'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Puts this lead in the CRM task inbox, due tomorrow.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
              {!selected.courierShipmentId && canUseCourier && (
                <Button
                  onClick={() => {
                    openOrder(selected);
                  }}
                  disabled={!selected.phone}
                >
                  <Package className="size-4 mr-1" /> Create order
                </Button>
              )}
              {!selected.customerId && !selected.courierShipmentId && (
                <Button
                  variant="outline"
                  onClick={() => handleConvert(selected)}
                  disabled={!selected.phone}
                >
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

      {canUseCourier && orderLead && orderPrefill && (
        <CourierShipmentModal
          key={orderLead.id}
          variant="blue"
          courierServices={courierServices}
          initialPaymentMethod="cod"
          initialSaveAsCustomer
          initialData={orderPrefill}
          onClose={closeOrderModal}
          onSave={handleShipmentSave}
        />
      )}

      {queueRemaining > 1 && orderLead && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-60 rounded-full bg-slate-900 text-white text-sm px-4 py-2 shadow-lg">
          Ordering {leadDisplayName(orderLead)}   {queueRemaining} remaining (click Done to continue)
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
