/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import useFetch from '../../../hooks/useFetch';

const PROVIDERS = [
  { id: 'KOKO', label: 'Koko', hint: 'Merchant ID, API Key, RSA public/private keys from Paykoko' },
  { id: 'MINTPAY', label: 'Mintpay', hint: 'Merchant credentials from mintpay.lk' },
  { id: 'PAYZY', label: 'Payzy', hint: 'Custom web API credentials from payzy.lk' },
] as const;

type GatewayRow = {
  id: string | null;
  provider: string;
  isEnabled: boolean;
  isSandbox: boolean;
  merchantId?: string | null;
  hasApiKey?: boolean;
  hasApiSecret?: boolean;
  hasPublicKey?: boolean;
  hasPrivateKey?: boolean;
  hasWebhookSecret?: boolean;
  apiKey?: string;
  apiSecret?: string;
  publicKey?: string;
  privateKey?: string;
  webhookSecret?: string;
};

function defaultRows(): GatewayRow[] {
  return PROVIDERS.map((p) => ({
    id: null,
    provider: p.id,
    isEnabled: false,
    isSandbox: true,
    merchantId: '',
  }));
}

/** Merge API payload onto local editable rows (always 3 providers). */
function mergeRows(apiRows: GatewayRow[]): GatewayRow[] {
  return PROVIDERS.map((p) => {
    const found = apiRows.find((r) => r.provider === p.id);
    return {
      id: found?.id ?? null,
      provider: p.id,
      isEnabled: !!found?.isEnabled,
      isSandbox: found?.isSandbox !== false,
      merchantId: found?.merchantId ?? '',
      hasApiKey: !!found?.hasApiKey,
      hasApiSecret: !!found?.hasApiSecret,
      hasPublicKey: !!found?.hasPublicKey,
      hasPrivateKey: !!found?.hasPrivateKey,
      hasWebhookSecret: !!found?.hasWebhookSecret,
      apiKey: '',
      apiSecret: '',
      publicKey: '',
      privateKey: '',
      webhookSecret: '',
    };
  });
}

/** Per-org website BNPL gateway credentials. Secrets only sent when filled. */
export default function CmsPaymentsPage() {
  const { fetchData } = useFetch();
  const [rows, setRows] = useState<GatewayRow[]>(defaultRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchData({ endpoint: '/cms/payment-gateways', method: 'GET', silent: true });
      if (!res) {
        setLoadError('Could not load payment gateways. Check backend / migration.');
        return;
      }
      setRows(mergeRows(((res.data as any) ?? []) as GatewayRow[]));
    } catch (e) {
      setLoadError((e as Error).message || 'Failed to load payment gateways');
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => { load(); }, [load]);

  const update = (provider: string, patch: Partial<GatewayRow>) => {
    setRows((prev) => prev.map((r) => (r.provider === provider ? { ...r, ...patch } : r)));
  };

  const save = async (row: GatewayRow) => {
    setSaving(row.provider);
    setLoadError(null);
    try {
      const payload: Record<string, unknown> = {
        provider: row.provider,
        isEnabled: !!row.isEnabled,
        isSandbox: !!row.isSandbox,
        merchantId: row.merchantId || null,
      };
      if (row.apiKey?.trim()) payload.apiKey = row.apiKey.trim();
      if (row.apiSecret?.trim()) payload.apiSecret = row.apiSecret.trim();
      if (row.publicKey?.trim()) payload.publicKey = row.publicKey.trim();
      if (row.privateKey?.trim()) payload.privateKey = row.privateKey.trim();
      if (row.webhookSecret?.trim()) payload.webhookSecret = row.webhookSecret.trim();

      const res = await fetchData({
        endpoint: '/cms/payment-gateways',
        method: 'PUT',
        data: payload,
        successMessage: `${row.provider} settings saved`,
      });
      if (!res) {
        setLoadError('Save failed — is the migration applied and backend restarted?');
        return;
      }
      await load();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enable gateways for the public shop checkout. Orders are created as <strong>DRAFT</strong> until payment
        succeeds (stock is not deducted on unpaid drafts). COD and Bank transfer are always available.
        Leave secret fields blank to keep existing values.
      </p>

      {loadError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {loadError}
        </p>
      )}
      {loading && <p className="text-sm text-muted-foreground">Loading gateways…</p>}

      {rows.map((row) => {
        const meta = PROVIDERS.find((p) => p.id === row.provider)!;
        return (
          <Card key={row.provider}>
            <CardContent className="p-4 grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm">{meta.label}</h3>
                  <p className="text-xs text-muted-foreground">{meta.hint}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!row.isEnabled}
                      onChange={(e) => update(row.provider, { isEnabled: e.target.checked })}
                    />
                    Enabled on website
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.isSandbox !== false}
                      onChange={(e) => update(row.provider, { isSandbox: e.target.checked })}
                    />
                    Sandbox / test mode
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Merchant ID</Label>
                  <Input
                    value={row.merchantId || ''}
                    onChange={(e) => update(row.provider, { merchantId: e.target.value })}
                    placeholder="From provider dashboard"
                  />
                </div>
                <div>
                  <Label>API Key {row.hasApiKey ? '(saved)' : ''}</Label>
                  <Input
                    type="password"
                    value={row.apiKey || ''}
                    onChange={(e) => update(row.provider, { apiKey: e.target.value })}
                    placeholder={row.hasApiKey ? '•••• leave blank to keep' : 'Paste API key'}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>API Secret {row.hasApiSecret ? '(saved)' : ''}</Label>
                  <Input
                    type="password"
                    value={row.apiSecret || ''}
                    onChange={(e) => update(row.provider, { apiSecret: e.target.value })}
                    placeholder={row.hasApiSecret ? '•••• leave blank to keep' : 'Optional'}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>Webhook secret {row.hasWebhookSecret ? '(saved)' : ''}</Label>
                  <Input
                    type="password"
                    value={row.webhookSecret || ''}
                    onChange={(e) => update(row.provider, { webhookSecret: e.target.value })}
                    placeholder={row.hasWebhookSecret ? '•••• leave blank to keep' : 'Optional'}
                    autoComplete="off"
                  />
                </div>
                {row.provider === 'KOKO' && (
                  <>
                    <div>
                      <Label>Public key {row.hasPublicKey ? '(saved)' : ''}</Label>
                      <textarea
                        className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                        value={row.publicKey || ''}
                        onChange={(e) => update(row.provider, { publicKey: e.target.value })}
                        placeholder="RSA public key (optional if already saved)"
                      />
                    </div>
                    <div>
                      <Label>Private key {row.hasPrivateKey ? '(saved)' : ''}</Label>
                      <textarea
                        className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                        value={row.privateKey || ''}
                        onChange={(e) => update(row.provider, { privateKey: e.target.value })}
                        placeholder="RSA private key (optional if already saved)"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <Button size="sm" onClick={() => save(row)} disabled={saving === row.provider}>
                  <Save className="w-4 h-4 mr-1" />
                  {saving === row.provider ? 'Saving…' : `Save ${meta.label}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
