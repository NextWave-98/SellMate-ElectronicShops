/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Copy,
  Download,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useShopAPI } from '../../hooks/useShopAPI';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import { useLeadFormsNav } from '../../hooks/useLeadFormsNav';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';
import facebookLeadsService from '../../services/facebookLeadsService';
import type { StaffOption } from '../../services/facebookLeadsService';
import leadFormsService, { publicSubmitUrl } from '../../services/leadFormsService';
import type { LeadForm, LeadFormField } from '../../services/leadFormsService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import alert from '../../utils/alert';
import { confirmDialog } from '@/lib/confirm';

const DEFAULT_FIELDS: LeadFormField[] = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'phone', required: true },
  { name: 'email', label: 'Email', type: 'email', required: false },
  { name: 'address', label: 'Address', type: 'textarea', required: false },
  { name: 'message', label: 'Message', type: 'textarea', required: false },
];

const WebLeadFormsPage: React.FC = () => {
  const { getAllBranches } = useShopAPI();
  const { user } = useAuthRedux();
  const businessId = user?.businessId ?? undefined;
  const nav = useLeadFormsNav();
  const lockedBranchId = nav.lockedBranchId ?? undefined;
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.LEAD_FORMS_MANAGE);

  const [forms, setForms] = useState<LeadForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [editingForm, setEditingForm] = useState<LeadForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [csvForm, setCsvForm] = useState<LeadForm | null>(null);
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvSampleBusy, setCsvSampleBusy] = useState(false);
  const [csvDragActive, setCsvDragActive] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState(lockedBranchId || '');
  const [sourcePage, setSourcePage] = useState('');
  const [autoAssignStaffId, setAutoAssignStaffId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (lockedBranchId) setBranchId(lockedBranchId);
  }, [lockedBranchId]);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const res = await leadFormsService.listForms(lockedBranchId);
      setForms(res.data ?? []);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to load lead forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
    (async () => {
      try {
        const res = await getAllBranches(1, 200, true);
        setBranches((res?.branches ?? []).map((b) => ({ id: b.id, name: b.name })));
      } catch {
        /* ignore */
      }
      try {
        setStaff(await facebookLeadsService.getStaff(businessId));
      } catch {
        /* ignore */
      }
    })();
  }, [businessId, lockedBranchId]);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || id;

  const resetFormFields = () => {
    setName('');
    setBranchId(lockedBranchId || '');
    setSourcePage('');
    setAutoAssignStaffId('');
    setIsActive(true);
    setEditingForm(null);
  };

  const closeFormModal = () => {
    setShowCreate(false);
    resetFormFields();
  };

  const openEdit = (form: LeadForm) => {
    setEditingForm(form);
    setName(form.name);
    setBranchId(form.branchId);
    setSourcePage(form.sourcePage || '');
    setAutoAssignStaffId(form.autoAssignStaffId || '');
    setIsActive(form.isActive);
    setShowCreate(false);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert.success('Copied to clipboard');
    } catch {
      alert.error('Could not copy');
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !branchId) {
      alert.error('Name and branch are required');
      return;
    }
    const payload = {
      name: name.trim(),
      branchId,
      sourcePage: sourcePage.trim() || null,
      autoAssignStaffId: autoAssignStaffId || null,
      isActive,
    };
    setSaving(true);
    try {
      if (editingForm) {
        await leadFormsService.updateForm(editingForm.id, payload);
        alert.success('Lead form updated');
      } else {
        await leadFormsService.createForm({ ...payload, fieldConfig: DEFAULT_FIELDS });
        alert.success('Lead form created');
      }
      closeFormModal();
      fetchForms();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async (id: string) => {
    if (
      !(await confirmDialog(
        'Rotate the public token? The old submit URL will stop working immediately.',
      ))
    )
      return;
    try {
      await leadFormsService.rotateToken(id);
      alert.success('Token rotated');
      fetchForms();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to rotate token');
    }
  };

  const handleToggleActive = async (form: LeadForm) => {
    try {
      await leadFormsService.updateForm(form.id, { isActive: !form.isActive });
      fetchForms();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to update form');
    }
  };

  const handleDelete = async (form: LeadForm) => {
    if (
      !(await confirmDialog(
        `Delete "${form.name}"? Leads already received from this form are kept.`,
      ))
    )
      return;
    try {
      await leadFormsService.deleteForm(form.id);
      alert.success('Form deleted');
      fetchForms();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to delete form');
    }
  };

  const openCsvImport = (form: LeadForm) => {
    setCsvForm(form);
    setCsvText('');
    setCsvFileName('');
    setCsvDragActive(false);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const closeCsvImport = () => {
    setCsvForm(null);
    setCsvText('');
    setCsvFileName('');
    setCsvDragActive(false);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const loadCsvFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      alert.error('Please choose a .csv file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert.error('CSV file must be under 2 MB');
      return;
    }
    const text = await file.text();
    setCsvText(text);
    setCsvFileName(file.name);
  };

  const handleDownloadSample = async () => {
    if (!csvForm) return;
    setCsvSampleBusy(true);
    try {
      const blob = await leadFormsService.downloadSampleCsv(csvForm.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${csvForm.name.replace(/[^\w-]+/g, '_') || 'lead-form'}-sample.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      alert.success('Sample CSV downloaded');
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to download sample CSV');
    } finally {
      setCsvSampleBusy(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvForm) return;
    if (!csvText.trim()) {
      alert.error('Paste CSV content or choose a file');
      return;
    }
    setCsvBusy(true);
    try {
      const res = await leadFormsService.importCsv(csvForm.id, csvText);
      alert.success(`Imported ${res.data.created} · skipped ${res.data.skipped}`);
      closeCsvImport();
      fetchForms();
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'CSV import failed');
    } finally {
      setCsvBusy(false);
    }
  };

  const formModalOpen = showCreate || !!editingForm;
  const colCount = canManage ? 7 : 6;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="size-6" /> Web Lead Forms
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Public submit URLs that create leads in the leads inbox. Send a JSON POST with
            fullName, phone, email, address and message.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={nav.inbox}>
            <Button variant="outline" size="sm">
              Open leads inbox
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchForms}>
            <RefreshCw className="size-4 mr-1" /> Refresh
          </Button>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                resetFormFields();
                setShowCreate(true);
              }}
            >
              <Plus className="size-4 mr-1" /> New form
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3">Name</th>
                <th className="p-3">Branch</th>
                <th className="p-3">Source page</th>
                <th className="p-3">Submissions</th>
                <th className="p-3">Status</th>
                <th className="p-3">Public URL</th>
                {canManage && <th className="p-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={colCount} className="p-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && forms.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="p-6 text-center text-muted-foreground">
                    No web lead forms yet. Create one to get a public submit URL.
                  </td>
                </tr>
              )}
              {forms.map((form) => {
                const url = publicSubmitUrl(form.publicToken);
                return (
                  <tr key={form.id} className="border-b hover:bg-muted/40">
                    <td className="p-3 font-medium">{form.name}</td>
                    <td className="p-3">
                      {form.branch?.name || form.Location?.name || branchName(form.branchId)}
                    </td>
                    <td className="p-3">{form.sourcePage || '—'}</td>
                    <td className="p-3">{form.submissionCount}</td>
                    <td className="p-3">
                      <Badge className={form.isActive ? 'bg-green-600' : 'bg-gray-500'}>
                        {form.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="flex items-center gap-1">
                        <code className="text-xs truncate block max-w-[180px]" title={url}>
                          {url}
                        </code>
                        <Button variant="ghost" size="sm" onClick={() => copyText(url)}>
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                    {canManage && (
                      <td className="p-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => openEdit(form)}>
                            <Pencil className="size-3.5 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openCsvImport(form)}>
                            <Upload className="size-3.5 mr-1" /> CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(form)}
                          >
                            {form.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRotate(form.id)}>
                            <Link2 className="size-3.5 mr-1" /> Rotate
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(form)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {formModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={closeFormModal}
        >
          <div
            className="bg-background rounded-lg w-full max-w-lg p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              {editingForm ? 'Edit web lead form' : 'Create web lead form'}
            </h2>
            <Input
              placeholder="Form name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <NativeSelect
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={!!lockedBranchId}
            >
              <NativeSelectOption value="">Select branch</NativeSelectOption>
              {branches.map((b) => (
                <NativeSelectOption key={b.id} value={b.id}>
                  {b.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              placeholder="Source page tag (optional)"
              value={sourcePage}
              onChange={(e) => setSourcePage(e.target.value)}
            />
            <NativeSelect
              value={autoAssignStaffId}
              onChange={(e) => setAutoAssignStaffId(e.target.value)}
            >
              <NativeSelectOption value="">No auto-assign</NativeSelectOption>
              {staff.map((s) => (
                <NativeSelectOption key={s.id} value={s.id}>
                  {s.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
            {!editingForm && (
              <p className="text-xs text-muted-foreground">
                Default fields: full name, phone, email, address and message.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeFormModal}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingForm ? 'Save changes' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {csvForm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={closeCsvImport}
        >
          <div
            className="bg-background rounded-lg w-full max-w-lg p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Import CSV · {csvForm.name}</h2>
            <p className="text-xs text-muted-foreground">
              Rows are linked to this form. Headers like full_name, phone_number, street_address,
              city, Variables are detected automatically.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={csvSampleBusy}
              onClick={handleDownloadSample}
            >
              <Download className="size-4 mr-1" />
              {csvSampleBusy ? 'Downloading…' : 'Download sample CSV'}
            </Button>
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadCsvFile(file);
              }}
            />
            <div
              className={`rounded-md border border-dashed p-4 text-center text-sm cursor-pointer ${
                csvDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
              }`}
              onClick={() => csvFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setCsvDragActive(true);
              }}
              onDragLeave={() => setCsvDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCsvDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void loadCsvFile(file);
              }}
            >
              <Upload className="size-5 mx-auto mb-1 text-muted-foreground" />
              {csvFileName ? (
                <span className="font-medium">{csvFileName}</span>
              ) : (
                <span className="text-muted-foreground">Drop a CSV here or click to browse</span>
              )}
            </div>
            <textarea
              className="w-full min-h-32 rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder="Or paste CSV text…"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeCsvImport}>
                Cancel
              </Button>
              <Button onClick={handleCsvImport} disabled={csvBusy || !csvText.trim()}>
                {csvBusy ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebLeadFormsPage;
