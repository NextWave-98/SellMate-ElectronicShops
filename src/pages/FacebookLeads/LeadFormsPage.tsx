/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Plus, RefreshCw, RotateCcw, Trash2, Link2 } from 'lucide-react';
import { useShopAPI } from '../../hooks/useShopAPI';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';
import leadFormsService, { publicSubmitUrl } from '../../services/leadFormsService';
import type { LeadForm, LeadFormField } from '../../services/leadFormsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import alert from '../../utils/alert';

const DEFAULT_FIELDS: LeadFormField[] = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'phone', required: true },
  { name: 'email', label: 'Email', type: 'email', required: false },
  { name: 'message', label: 'Message', type: 'textarea', required: false },
];

const LeadFormsPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.LEAD_FORMS_MANAGE);
  const { getAllBranches } = useShopAPI();

  const [forms, setForms] = useState<LeadForm[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [sourcePage, setSourcePage] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [formsRes, branchRes] = await Promise.all([
        leadFormsService.listForms(),
        getAllBranches(1, 200, true),
      ]);
      setForms(formsRes.data || []);
      setBranches(
        (branchRes?.branches ?? []).map((b) => ({
          id: b.id,
          name: b.name,
        })),
      );
    } catch (err: any) {
      alert.error(err?.message || 'Failed to load lead forms');
    } finally {
      setLoading(false);
    }
  }, [getAllBranches]);

  useEffect(() => {
    load();
  }, []);

  const branchName = useMemo(() => {
    const map = new Map(branches.map((b) => [b.id, b.name]));
    return (id: string, form?: LeadForm) =>
      form?.branch?.name || form?.Location?.name || map.get(id) || ' ';
  }, [branches]);

  const handleCreate = async () => {
    if (!canManage) return;
    if (!name.trim() || !branchId) {
      alert.error('Name and branch are required');
      return;
    }
    try {
      setSaving(true);
      await leadFormsService.createForm({
        name: name.trim(),
        branchId,
        sourcePage: sourcePage.trim() || null,
        fieldConfig: DEFAULT_FIELDS,
        isActive: true,
      });
      alert.success('Lead form created');
      setShowCreate(false);
      setName('');
      setBranchId('');
      setSourcePage('');
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Failed to create form');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async (token: string) => {
    const url = publicSubmitUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      alert.success('Public submit URL copied');
    } catch {
      alert.info(url);
    }
  };

  const toggleActive = async (form: LeadForm) => {
    if (!canManage) return;
    try {
      await leadFormsService.updateForm(form.id, { isActive: !form.isActive });
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Failed to update form');
    }
  };

  const rotate = async (form: LeadForm) => {
    if (!canManage) return;
    if (!window.confirm('Rotate public token? Old embed links will stop working.')) return;
    try {
      await leadFormsService.rotateToken(form.id);
      alert.success('Token rotated');
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Failed to rotate token');
    }
  };

  const remove = async (form: LeadForm) => {
    if (!canManage) return;
    if (!window.confirm(`Delete form “${form.name}”?`)) return;
    try {
      await leadFormsService.deleteForm(form.id);
      alert.success('Form deleted');
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Failed to delete form');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lead Forms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Page-wise web forms that route and tag leads to a branch. Embed the public URL on your
            website.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" />
              New form
            </Button>
          )}
        </div>
      </div>

      {showCreate && canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create web lead form</CardTitle>
            <CardDescription>
              Default fields: name, phone, email, message. Submissions appear in the Leads inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Form name</Label>
              <Input
                className="mt-1.5"
                placeholder="Colombo Branch   Website"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Branch</Label>
              <NativeSelect
                className="mt-1.5 w-full"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <NativeSelectOption value="">Select branch</NativeSelectOption>
                {branches.map((b) => (
                  <NativeSelectOption key={b.id} value={b.id}>
                    {b.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label>Source page (optional)</Label>
              <Input
                className="mt-1.5"
                placeholder="colombo-landing"
                value={sourcePage}
                onChange={(e) => setSourcePage(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating…' : 'Create form'}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Submissions</th>
                <th className="px-3 py-2 font-medium">Public URL</th>
                <th className="px-3 py-2 font-medium w-[140px]" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : forms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No web lead forms yet. Create one to start capturing website leads.
                  </td>
                </tr>
              ) : (
                forms.map((form) => (
                  <tr key={form.id} className="border-t align-middle">
                    <td className="px-3 py-3">
                      <div className="font-medium">{form.name}</div>
                      {form.sourcePage && (
                        <div className="text-xs text-muted-foreground">{form.sourcePage}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">{branchName(form.branchId, form)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={form.isActive ? 'default' : 'secondary'}>
                          {form.isActive ? 'Active' : 'Off'}
                        </Badge>
                        {canManage && (
                          <Switch
                            checked={form.isActive}
                            onCheckedChange={() => toggleActive(form)}
                            size="sm"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">{form.submissionCount ?? 0}</td>
                    <td className="px-3 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => copyUrl(form.publicToken)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy URL
                      </Button>
                    </td>
                    <td className="px-3 py-3">
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Rotate token"
                            onClick={() => rotate(form)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => remove(form)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            How to embed
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            POST JSON to the copied URL with fields like{' '}
            <code className="text-xs bg-muted px-1 rounded">fullName</code>,{' '}
            <code className="text-xs bg-muted px-1 rounded">phone</code>,{' '}
            <code className="text-xs bg-muted px-1 rounded">email</code>,{' '}
            <code className="text-xs bg-muted px-1 rounded">message</code>.
          </p>
          <p>
            Leads land in <strong>Facebook Leads</strong> inbox with source{' '}
            <code className="text-xs bg-muted px-1 rounded">WEB_FORM</code>, routed to the form’s
            branch.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadFormsPage;
