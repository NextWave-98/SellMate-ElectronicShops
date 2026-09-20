/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Unplug,
  Bot,
  Inbox,
} from 'lucide-react';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import useWhatsAppSettings from '../../hooks/useWhatsAppSettings';
import type { WhatsAppMode, WhatsAppReplyTemplate } from '../../hooks/useWhatsAppSettings';
import EmbeddedSignupButton from '../../components/WhatsApp/EmbeddedSignupButton';
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
import alert from '../../utils/alert';

const WhatsAppSettingsPage: React.FC = () => {
  const { user } = useAuthRedux();
  const businessId = user?.businessId ?? undefined;
  const {
    settings,
    loading,
    saving,
    disconnecting,
    fetchSettings,
    saveSettings,
    disconnect,
    testConnection,
    refreshToken,
    testing,
    refreshing,
  } = useWhatsAppSettings(businessId ?? undefined);

  const [manualOpen, setManualOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenDirty, setTokenDirty] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [mode, setMode] = useState<WhatsAppMode>('MANUAL');
  const [replyTemplates, setReplyTemplates] = useState<WhatsAppReplyTemplate[]>([]);
  const [defaultReply, setDefaultReply] = useState('');

  const isConnected = Boolean(settings?.isConnected);

  useEffect(() => {
    if (businessId) fetchSettings();
  }, []);

  useEffect(() => {
    if (!settings) return;
    setPhoneNumberId(settings.metaPhoneNumberId ?? '');
    setVerifyToken(settings.metaVerifyToken ?? '');
    setBusinessAccountId(settings.metaBusinessAccountId ?? '');
    setMode(settings.mode);
    setReplyTemplates(settings.replyTemplates ?? []);
    setDefaultReply(settings.defaultReply ?? '');
    setAccessToken('');
    setTokenDirty(false);
    setShowToken(false);
  }, []);

  const generateVerifyToken = () => setVerifyToken(crypto.randomUUID());

  const copyWebhookUrl = async () => {
    if (!settings?.webhookUrl) return;
    await navigator.clipboard.writeText(settings.webhookUrl);
    alert.success('Webhook URL copied to clipboard');
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      metaPhoneNumberId: phoneNumberId || undefined,
      metaVerifyToken: verifyToken || undefined,
      metaBusinessAccountId: businessAccountId || undefined,
      mode,
      replyTemplates,
      defaultReply: defaultReply || undefined,
    };
    if (tokenDirty && accessToken.trim()) {
      payload.metaAccessToken = accessToken.trim();
      payload.isActive = true;
    }
    await saveSettings(payload);
    if (tokenDirty) {
      setTokenDirty(false);
      setAccessToken('');
      setShowToken(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect WhatsApp Business? You will stop sending and receiving messages.')) {
      return;
    }
    const ok = await disconnect();
    if (ok) setManualOpen(false);
  };

  const addTemplate = () => setReplyTemplates((prev) => [...prev, { keyword: '', reply: '' }]);

  const updateTemplate = (index: number, field: keyof WhatsAppReplyTemplate, value: string) => {
    setReplyTemplates((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
  };

  const removeTemplate = (index: number) => {
    setReplyTemplates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTestConnection = async () => {
    const result = await testConnection();
    if (result.success) {
      const refreshed = result.tokenRefreshed ? ' Token was auto-refreshed.' : '';
      alert.success(`Connected to Meta.${refreshed}`);
    } else {
      alert.error(result.error || 'Connection test failed');
    }
  };

  const handleRefreshToken = async () => {
    const result = await refreshToken();
    if (!result.success) {
      alert.error(result.error || 'Could not refresh token. Reconnect WhatsApp.');
    }
  };

  const maskedTokenDisplay = settings?.metaAccessToken ?? '••••••••';

  if (!businessId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No organization context found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-green-600" />
            WhatsApp Business
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your WhatsApp Business number to send and receive customer messages.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            isConnected
              ? 'border-green-500 text-green-700 bg-green-50'
              : 'border-gray-300 text-gray-600'
          }
        >
          {isConnected ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Connected
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Not Connected
            </>
          )}
        </Badge>
      </div>

      {!isConnected ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Connect WhatsApp Business</CardTitle>
            <CardDescription>
              Use Meta Embedded Signup to connect in one click   no manual token copy-paste.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EmbeddedSignupButton
              organizationId={businessId}
              onSuccess={fetchSettings}
              disabled={loading}
            />
            <p className="text-center text-sm text-muted-foreground">
              Connect WhatsApp Business
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or connect manually</span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setManualOpen((v) => !v)}
            >
              Manual setup
              {manualOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>

            {manualOpen && (
              <ManualCredentialsForm
                phoneNumberId={phoneNumberId}
                setPhoneNumberId={setPhoneNumberId}
                accessToken={accessToken}
                setAccessToken={setAccessToken}
                tokenDirty={tokenDirty}
                setTokenDirty={setTokenDirty}
                showToken={showToken}
                setShowToken={setShowToken}
                maskedTokenDisplay={maskedTokenDisplay}
                verifyToken={verifyToken}
                setVerifyToken={setVerifyToken}
                businessAccountId={businessAccountId}
                setBusinessAccountId={setBusinessAccountId}
                generateVerifyToken={generateVerifyToken}
                onSave={handleSave}
                saving={saving}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-green-200 bg-green-50/40">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-green-900">
                    {settings?.displayPhoneNumber || settings?.metaPhoneNumberId}
                  </p>
                  <p className="text-green-800">{settings?.verifiedName || 'WhatsApp Business'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testing || refreshing}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {testing ? 'Testing…' : 'Test Connection'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefreshToken}
                    disabled={testing || refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing…' : 'Refresh Token'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    <Unplug className="h-4 w-4 mr-1" />
                    {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Webhook URL</CardTitle>
              <CardDescription>Configured automatically during embedded signup</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input readOnly value={settings?.webhookUrl ?? ''} className="font-mono text-sm" />
                <Button type="button" variant="outline" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <ReplyModeCard
            mode={mode}
            setMode={setMode}
            replyTemplates={replyTemplates}
            defaultReply={defaultReply}
            setDefaultReply={setDefaultReply}
            addTemplate={addTemplate}
            updateTemplate={updateTemplate}
            removeTemplate={removeTemplate}
          />

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={handleSave} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/superadmin/communication/whatsapp/inbox">
                <Inbox className="h-4 w-4 mr-1" />
                Open Inbox
              </Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/superadmin/communication/whatsapp/ai">
                <Bot className="h-4 w-4 mr-1" />
                AI Reply Settings
              </Link>
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setManualOpen((v) => !v)}
          >
            Advanced / manual credentials
            {manualOpen ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
          </Button>

          {manualOpen && (
            <Card>
              <CardContent className="pt-6">
                <ManualCredentialsForm
                  phoneNumberId={phoneNumberId}
                  setPhoneNumberId={setPhoneNumberId}
                  accessToken={accessToken}
                  setAccessToken={setAccessToken}
                  tokenDirty={tokenDirty}
                  setTokenDirty={setTokenDirty}
                  showToken={showToken}
                  setShowToken={setShowToken}
                  maskedTokenDisplay={maskedTokenDisplay}
                  verifyToken={verifyToken}
                  setVerifyToken={setVerifyToken}
                  businessAccountId={businessAccountId}
                  setBusinessAccountId={setBusinessAccountId}
                  generateVerifyToken={generateVerifyToken}
                  onSave={handleSave}
                  saving={saving}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

interface ManualFormProps {
  phoneNumberId: string;
  setPhoneNumberId: (v: string) => void;
  accessToken: string;
  setAccessToken: (v: string) => void;
  tokenDirty: boolean;
  setTokenDirty: (v: boolean) => void;
  showToken: boolean;
  setShowToken: (v: boolean) => void;
  maskedTokenDisplay: string;
  verifyToken: string;
  setVerifyToken: (v: string) => void;
  businessAccountId: string;
  setBusinessAccountId: (v: string) => void;
  generateVerifyToken: () => void;
  onSave: () => void;
  saving: boolean;
}

const ManualCredentialsForm: React.FC<ManualFormProps> = ({
  phoneNumberId,
  setPhoneNumberId,
  accessToken,
  setAccessToken,
  tokenDirty,
  setTokenDirty,
  showToken,
  setShowToken,
  maskedTokenDisplay,
  verifyToken,
  setVerifyToken,
  businessAccountId,
  setBusinessAccountId,
  generateVerifyToken,
  onSave,
  saving,
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Phone Number ID</Label>
      <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} />
    </div>
    <div className="space-y-2">
      <Label>Access Token</Label>
      <div className="flex gap-2">
        <Input
          type={showToken && tokenDirty ? 'text' : 'password'}
          value={tokenDirty ? accessToken : maskedTokenDisplay}
          onChange={(e) => {
            setAccessToken(e.target.value);
            setTokenDirty(true);
          }}
          placeholder="Paste Meta access token"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowToken((v) => !v)}
          disabled={!tokenDirty}
        >
          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
    <div className="space-y-2">
      <Label>Verify Token</Label>
      <div className="flex gap-2">
        <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} />
        <Button type="button" variant="outline" onClick={generateVerifyToken}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="space-y-2">
      <Label>Business Account ID (WABA)</Label>
      <Input value={businessAccountId} onChange={(e) => setBusinessAccountId(e.target.value)} />
    </div>
    <Button type="button" onClick={onSave} disabled={saving}>
      <Save className="h-4 w-4 mr-1" />
      Save manual credentials
    </Button>
  </div>
);

interface ReplyModeCardProps {
  mode: WhatsAppMode;
  setMode: (m: WhatsAppMode) => void;
  replyTemplates: WhatsAppReplyTemplate[];
  defaultReply: string;
  setDefaultReply: (v: string) => void;
  addTemplate: () => void;
  updateTemplate: (i: number, f: keyof WhatsAppReplyTemplate, v: string) => void;
  removeTemplate: (i: number) => void;
}

const ReplyModeCard: React.FC<ReplyModeCardProps> = ({
  mode,
  setMode,
  replyTemplates,
  defaultReply,
  setDefaultReply,
  addTemplate,
  updateTemplate,
  removeTemplate,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Reply Mode</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={mode === 'MANUAL'} onChange={() => setMode('MANUAL')} />
          Manual
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={mode === 'AUTO'} onChange={() => setMode('AUTO')} />
          Auto
        </label>
      </div>

      {mode === 'MANUAL' && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Incoming messages are queued for manual handling.{' '}
          <Link
            to="/superadmin/notifications/dashboard"
            className="text-primary inline-flex items-center gap-1 hover:underline"
          >
            Open notification inbox <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        For AI-powered smart replies (Claude, GPT, Gemini, Grok),{' '}
        <Link
          to="/superadmin/communication/whatsapp/ai"
          className="text-primary inline-flex items-center gap-1 hover:underline"
        >
          configure AI Reply Settings <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {mode === 'AUTO' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reply Templates</Label>
            {replyTemplates.map((template, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  placeholder="Keyword"
                  value={template.keyword}
                  onChange={(e) => updateTemplate(index, 'keyword', e.target.value)}
                  className="w-1/3"
                />
                <Input
                  placeholder="Reply"
                  value={template.reply}
                  onChange={(e) => updateTemplate(index, 'reply', e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeTemplate(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTemplate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Template
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Default Reply</Label>
            <Input
              value={defaultReply}
              onChange={(e) => setDefaultReply(e.target.value)}
              placeholder="Thanks for your message. We'll get back to you soon."
            />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

export default WhatsAppSettingsPage;
