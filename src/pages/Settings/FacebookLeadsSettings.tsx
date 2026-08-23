/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook,
  CheckCircle,
  XCircle,
  Unplug,
  ExternalLink,
  Inbox,
  RefreshCw,
  Archive,
  ArchiveRestore,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import { useShopAPI } from '../../hooks/useShopAPI';
import FacebookConnectButton from '../../components/FacebookLeads/FacebookConnectButton';
import facebookLeadsService from '../../services/facebookLeadsService';
import type {
  FacebookPage,
  FacebookLeadForm,
  FacebookLeadFormQuestion,
  FacebookLeadSettings as Settings,
} from '../../services/facebookLeadsService';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import alert from '../../utils/alert';

const STANDARD_QUESTIONS: { type: string; label: string }[] = [
  { type: 'FULL_NAME', label: 'Full name' },
  { type: 'EMAIL', label: 'Email' },
  { type: 'PHONE', label: 'Phone number' },
  { type: 'CITY', label: 'City' },
  { type: 'COMPANY_NAME', label: 'Company name' },
  { type: 'JOB_TITLE', label: 'Job title' },
];

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api';
const webhookUrl = `${baseUrl.replace(/\/api$/, '')}/api/webhook/facebook-leads`;

const FacebookLeadsSettingsPage: React.FC = () => {
  const { user } = useAuthRedux();
  const businessId = user?.businessId ?? undefined;
  const { getAllBranches } = useShopAPI();

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [forms, setForms] = useState<FacebookLeadForm[]>([]);
  const [selectedForms, setSelectedForms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [changingPage, setChangingPage] = useState(false);

  // Create-form modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState<{
    name: string;
    privacyUrl: string;
    followUpUrl: string;
    questions: Record<string, string>;
    customLabel: string;
  }>({
    name: '',
    privacyUrl: '',
    followUpUrl: '',
    questions: { FULL_NAME: 'Full name', EMAIL: 'Email', PHONE: 'Phone number' },
    customLabel: '',
  });

  // Load branches once
  useEffect(() => {
    (async () => {
      try {
        const res = await getAllBranches(1, 200, true);
        const list = (res?.branches ?? []).map((b) => ({ id: b.id, name: b.name }));
        setBranches(list);
        if (list.length && !branchId) setBranchId(list[0].id);
      } catch {
        alert.error('Failed to load branches');
      }
    })();
  }, []);

  const loadForms = async (bId?: string) => {
    const id = bId ?? branchId;
    if (!businessId || !id) return;
    try {
      const res = await facebookLeadsService.getForms(businessId, id);
      setForms(res.data.forms ?? []);
    } catch {
      // non-fatal — user can click Reload
    }
  };

  const loadSettings = async (bId: string) => {
    if (!businessId || !bId) return;
    setLoading(true);
    setPages([]);
    setForms([]);
    setChangingPage(false);
    try {
      const res = await facebookLeadsService.getSettings(businessId, bId);
      setSettings(res.data);
      const preselected: Record<string, string> = {};
      (res.data?.connectedForms ?? []).forEach((f) => (preselected[f.formId] = f.formName));
      setSelectedForms(preselected);
      // Auto-load forms if already connected
      if (res.data?.connected) {
        await loadForms(bId);
      }
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) loadSettings(branchId);
  }, [branchId, businessId]);

  // After OAuth — store page list and show selector
  const handleConnected = (pgs: FacebookPage[]) => {
    setPages(pgs);
    setChangingPage(false);
    if (!pgs.length) alert.warn('No Facebook pages found on this account.');
  };

  // User picked a page (first time or change)
  const handleSelectPage = async (pageId: string) => {
    if (!businessId || !pageId) return;
    setBusy(true);
    try {
      const res = await facebookLeadsService.selectPage(businessId, branchId, pageId);
      setForms(res.data.forms ?? []);
      setSelectedForms({});
      setPages([]);
      setChangingPage(false);
      await loadSettings(branchId);
      alert.success('Page connected. Select the lead forms you want to track.');
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to select page');
    } finally {
      setBusy(false);
    }
  };

  // Reload forms from Facebook
  const handleReloadForms = async () => {
    setBusy(true);
    try {
      await loadForms();
      // Re-apply pre-selected state from settings
      const preselected: Record<string, string> = {};
      (settings?.connectedForms ?? []).forEach((f) => (preselected[f.formId] = f.formName));
      setSelectedForms(preselected);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setBusy(false);
    }
  };

  const toggleForm = (form: FacebookLeadForm) => {
    setSelectedForms((prev) => {
      const next = { ...prev };
      if (next[form.id]) delete next[form.id];
      else next[form.id] = form.name;
      return next;
    });
  };

  const handleSaveForms = async () => {
    if (!businessId) return;
    const formsPayload = Object.entries(selectedForms).map(([formId, formName]) => ({
      formId,
      formName,
    }));
    if (!formsPayload.length) {
      alert.warn('Select at least one lead form to track.');
      return;
    }
    setBusy(true);
    try {
      await facebookLeadsService.connectForms(businessId, branchId, formsPayload);
      await loadSettings(branchId);
      alert.success(`Tracking ${formsPayload.length} form(s). New leads will arrive automatically.`);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to save forms');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!businessId) return;
    if (!confirm('Disconnect Facebook Leads for this branch? Stored leads are kept.')) return;
    setBusy(true);
    try {
      await facebookLeadsService.disconnect(businessId, branchId);
      setPages([]);
      setForms([]);
      setSelectedForms({});
      setChangingPage(false);
      await loadSettings(branchId);
      alert.success('Disconnected.');
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async (formId?: string) => {
    if (!businessId) return;
    setSyncing(true);
    try {
      const res = await facebookLeadsService.syncLeads(businessId, branchId, formId);
      alert.success(`Synced ${res.data.synced} new lead(s) — ${res.data.skipped} already imported.`);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to sync leads');
    } finally {
      setSyncing(false);
    }
  };

  const handleSetStatus = async (formId: string, status: 'ACTIVE' | 'ARCHIVED') => {
    if (!businessId) return;
    if (
      status === 'ARCHIVED' &&
      !confirm('Archive this form on Facebook? It will stop collecting new leads.')
    )
      return;
    setBusy(true);
    try {
      await facebookLeadsService.setFormStatus(businessId, branchId, formId, status);
      alert.success(`Form ${status === 'ARCHIVED' ? 'archived' : 'activated'}.`);
      await loadForms();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to update form status');
    } finally {
      setBusy(false);
    }
  };

  const toggleNewQuestion = (type: string, label: string) => {
    setNewForm((prev) => {
      const questions = { ...prev.questions };
      if (questions[type]) delete questions[type];
      else questions[type] = label;
      return { ...prev, questions };
    });
  };

  const addCustomQuestion = () => {
    const label = newForm.customLabel.trim();
    if (!label) return alert.warn('Enter a label for the custom question.');
    setNewForm((prev) => ({
      ...prev,
      questions: { ...prev.questions, [`CUSTOM_${Date.now()}`]: label },
      customLabel: '',
    }));
  };

  const removeCustomQuestion = (key: string) => {
    setNewForm((prev) => {
      const questions = { ...prev.questions };
      delete questions[key];
      return { ...prev, questions };
    });
  };

  const handleCreateForm = async () => {
    if (!businessId) return;
    if (!newForm.name.trim()) return alert.warn('Enter a form name.');
    if (!newForm.privacyUrl.trim())
      return alert.warn('A privacy policy URL is required by Facebook.');
    const questions: FacebookLeadFormQuestion[] = Object.entries(newForm.questions).map(
      ([type, label]) =>
        type.startsWith('CUSTOM_')
          ? { type: 'CUSTOM', key: type, label }
          : { type, label },
    );
    if (!questions.length) return alert.warn('Select at least one question.');
    setBusy(true);
    try {
      await facebookLeadsService.createForm(businessId, {
        branchId,
        name: newForm.name.trim(),
        questions,
        privacyPolicy: { url: newForm.privacyUrl.trim() },
        followUpActionUrl: newForm.followUpUrl.trim() || undefined,
      });
      alert.success('Lead form created on Facebook and now tracked.');
      setShowCreate(false);
      setNewForm({
        name: '',
        privacyUrl: '',
        followUpUrl: '',
        questions: { FULL_NAME: 'Full name', EMAIL: 'Email', PHONE: 'Phone number' },
        customLabel: '',
      });
      await loadSettings(branchId);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to create form');
    } finally {
      setBusy(false);
    }
  };

  const connected = Boolean(settings?.connected);
  // Show page selector when: after OAuth or when user clicks "Change page"
  const showPageSelector = pages.length > 0 || changingPage;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Facebook className="text-[#1877F2]" /> Facebook Lead Ads
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect a Facebook page per branch and capture lead form submissions in real time.
          </p>
        </div>
        <Link to="/superadmin/facebook-leads">
          <Button variant="outline" size="sm">
            <Inbox className="size-4 mr-1" /> View Leads
          </Button>
        </Link>
      </div>

      {/* Branch selector */}
      <Card>
        <CardHeader>
          <CardTitle>Branch</CardTitle>
          <CardDescription>Each branch connects its own Facebook page independently.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Select branch</Label>
          <NativeSelect
            className="w-full mt-1"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <NativeSelectOption key={b.id} value={b.id}>
                {b.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </CardContent>
      </Card>

      {/* Connection card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              Connection
              {connected ? (
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="size-3 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="size-3 mr-1" /> Not connected
                </Badge>
              )}
            </CardTitle>
            {connected && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChangingPage((v) => !v)}
                  disabled={busy}
                >
                  <ChevronDown className="size-4 mr-1" />
                  {changingPage ? 'Cancel' : 'Change page'}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={busy}>
                  <Unplug className="size-4 mr-1" /> Disconnect
                </Button>
              </div>
            )}
          </div>
          {connected && settings?.pageName && (
            <CardDescription>
              Page: <strong>{settings.pageName}</strong> &nbsp;·&nbsp;
              {settings.connectedForms.length} form(s) tracked
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {/* Step 1 — Connect with Facebook (when not connected or changing page) */}
              {(!connected || changingPage) && branchId && (
                <div className="space-y-3">
                  {!connected && (
                    <p className="text-sm text-muted-foreground">
                      Click below to connect your Facebook account and select a page.
                    </p>
                  )}
                  {changingPage && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                      Re-connect to switch to a different Facebook page. This will replace the current page.
                    </p>
                  )}
                  <FacebookConnectButton
                    organizationId={businessId!}
                    branchId={branchId}
                    onConnected={handleConnected}
                  />
                </div>
              )}

              {/* Step 2 — Page selection (after OAuth or change-page) */}
              {showPageSelector && pages.length > 0 && (
                <div>
                  <Label>Select a Facebook page to connect</Label>
                  <NativeSelect
                    className="w-full mt-1"
                    defaultValue=""
                    onChange={(e) => e.target.value && handleSelectPage(e.target.value)}
                    disabled={busy}
                  >
                    <NativeSelectOption value="">— Choose a page —</NativeSelectOption>
                    {pages.map((p) => (
                      <NativeSelectOption key={p.id} value={p.id}>
                        {p.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}

              {/* Step 3 — Form management (when connected) */}
              {connected && !changingPage && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label>Lead forms</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReloadForms}
                        disabled={busy}
                      >
                        <RefreshCw className={`size-4 mr-1 ${busy ? 'animate-spin' : ''}`} />
                        Reload
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync()}
                        disabled={syncing}
                      >
                        <RefreshCw className={`size-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing…' : 'Sync all leads'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreate(true)}
                        disabled={busy}
                      >
                        <Plus className="size-4 mr-1" /> Create form
                      </Button>
                    </div>
                  </div>

                  {forms.length === 0 ? (
                    <p className="text-sm text-muted-foreground border rounded-md p-3">
                      No forms loaded. Click <strong>Reload</strong> to fetch forms from Facebook.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-1">
                        {forms.map((f) => {
                          const archived = f.status?.toUpperCase() === 'ARCHIVED';
                          return (
                            <div
                              key={f.id}
                              className="flex items-center justify-between gap-2 text-sm border rounded-md px-3 py-2"
                            >
                              <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedForms[f.id])}
                                  onChange={() => toggleForm(f)}
                                />
                                <span className="truncate font-medium">{f.name}</span>
                                <Badge
                                  variant={archived ? 'secondary' : 'default'}
                                  className="shrink-0 text-xs"
                                >
                                  {f.status ?? 'ACTIVE'}
                                </Badge>
                              </label>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Sync this form's historical leads"
                                  onClick={() => handleSync(f.id)}
                                  disabled={syncing}
                                >
                                  <RefreshCw className="size-4" />
                                </Button>
                                {archived ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Activate form"
                                    onClick={() => handleSetStatus(f.id, 'ACTIVE')}
                                    disabled={busy}
                                  >
                                    <ArchiveRestore className="size-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Archive form (stops collecting leads)"
                                    onClick={() => handleSetStatus(f.id, 'ARCHIVED')}
                                    disabled={busy}
                                  >
                                    <Archive className="size-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <Button onClick={handleSaveForms} disabled={busy} className="w-full">
                        {busy ? 'Saving…' : 'Save tracked forms'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Webhook info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta App — Webhook URL</CardTitle>
          <CardDescription>
            Configure this callback URL once in your Meta App dashboard (Webhooks → Page →{' '}
            <code>leadgen</code>), using the verify token from your server's{' '}
            <code>FB_LEADS_VERIFY_TOKEN</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <code className="block text-xs bg-muted p-2 rounded break-all">{webhookUrl}</code>
          <p className="text-xs text-muted-foreground">
            After saving the webhook in Meta dashboard, also subscribe to the{' '}
            <strong>leadgen</strong> field. The page-level subscription is handled automatically
            when you select a page above.
          </p>
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 inline-flex items-center gap-1"
          >
            Open Meta App dashboard <ExternalLink className="size-3" />
          </a>
        </CardContent>
      </Card>

      {/* Create-form modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => !busy && setShowCreate(false)}
        >
          <div
            className="bg-background w-full max-w-lg rounded-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create a Facebook lead form</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreate(false)}
                disabled={busy}
              >
                ✕
              </Button>
            </div>

            <div>
              <Label>Form name *</Label>
              <Input
                className="mt-1"
                value={newForm.name}
                onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Spring Promo Enquiry"
              />
            </div>

            <div>
              <Label>Standard questions</Label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {STANDARD_QUESTIONS.map((q) => (
                  <label key={q.type} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(newForm.questions[q.type])}
                      onChange={() => toggleNewQuestion(q.type, q.label)}
                    />
                    {q.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Custom questions */}
            <div>
              <Label>Custom questions</Label>
              <div className="space-y-1 mt-1">
                {Object.entries(newForm.questions)
                  .filter(([k]) => k.startsWith('CUSTOM_'))
                  .map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="flex-1 text-sm border rounded px-2 py-1 bg-muted">
                        {label}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 h-7 px-2"
                        onClick={() => removeCustomQuestion(key)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="e.g. What product are you interested in?"
                    value={newForm.customLabel}
                    onChange={(e) =>
                      setNewForm((p) => ({ ...p, customLabel: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && addCustomQuestion()}
                  />
                  <Button variant="outline" size="sm" onClick={addCustomQuestion} type="button">
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Privacy policy URL * (required by Facebook)</Label>
              <Input
                className="mt-1"
                value={newForm.privacyUrl}
                onChange={(e) => setNewForm((p) => ({ ...p, privacyUrl: e.target.value }))}
                placeholder="https://yourbusiness.com/privacy"
              />
            </div>

            <div>
              <Label>Follow-up / website URL (optional)</Label>
              <Input
                className="mt-1"
                value={newForm.followUpUrl}
                onChange={(e) => setNewForm((p) => ({ ...p, followUpUrl: e.target.value }))}
                placeholder="https://yourbusiness.com"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateForm} disabled={busy}>
                <Plus className="size-4 mr-1" />
                {busy ? 'Creating…' : 'Create form'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacebookLeadsSettingsPage;
