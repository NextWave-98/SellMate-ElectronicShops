import React, { useState } from 'react';
import useFetch from '../../../hooks/useFetch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Alert, AlertDescription } from '../../ui/alert';
import { Info, Loader2, CheckCircle, XCircle, Wifi } from 'lucide-react';
import alert from '../../../utils/alert';

interface CreateCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId: string;
}

const CreateCredentialModal: React.FC<CreateCredentialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessId,
}) => {
  const [formData, setFormData] = useState({
    provider: '',
    channel: '',
    strategy: 'PLATFORM_MANAGED',
    monthlyQuota: '',
    costPerUnit: '',
    // Credentials fields
    username: '',
    apiKey: '',
    apiToken: '',
    senderID: '',
    apiUrl: '',
    accountSid: '',
    authToken: '',
    fromNumber: '',
    fromEmail: '',
    fromName: '',
    host: '',
    port: '',
    password: '',
    // Meta WhatsApp
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    // 360Dialog WhatsApp
    dialog360ApiKey: '',
    dialog360ClientId: '',
  });

  const [testResult, setTestResult] = useState<{ isValid: boolean; message: string } | null>(null);

  const { fetchData: createCredential, loading } = useFetch();
  const { fetchData: testConnection, loading: testing } = useFetch();

  const providers = {
    SMS: ['SMS_QUICKSEND', 'SMS_SENDLK', 'SMS_TWILIO', 'SMS_NEXMO'],
    EMAIL: ['EMAIL_SENDGRID', 'EMAIL_MAILGUN', 'EMAIL_SMTP'],
    WHATSAPP: ['WHATSAPP_TWILIO', 'WHATSAPP_META', 'WHATSAPP_360DIALOG'],
    PUSH: [],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.provider || !formData.channel || !formData.strategy) {
      alert.error('Please fill in all required fields');
      return;
    }

    // Build credentials object based on strategy and provider
    let credentials = null;
    if (formData.strategy === 'BUSINESS_MANAGED') {
      if (formData.channel === 'SMS') {
        if (formData.provider === 'SMS_SENDLK') {
          credentials = {
            apiToken: formData.apiToken,
            senderID: formData.senderID,
          };
        } else if (formData.provider.includes('TWILIO')) {
          credentials = {
            accountSid: formData.accountSid,
            authToken: formData.authToken,
            fromNumber: formData.fromNumber,
          };
        } else {
          credentials = {
            username: formData.username,
            apiKey: formData.apiKey,
            senderID: formData.senderID,
            apiUrl: formData.apiUrl || undefined,
          };
        }
      } else if (formData.channel === 'EMAIL') {
        if (formData.provider === 'EMAIL_SMTP') {
          credentials = {
            host: formData.host,
            port: formData.port ? parseInt(formData.port) : undefined,
            username: formData.username,
            password: formData.password,
            fromEmail: formData.fromEmail,
            fromName: formData.fromName,
          };
        } else {
          credentials = {
            apiKey: formData.apiKey,
            fromEmail: formData.fromEmail,
            fromName: formData.fromName,
          };
        }
      } else if (formData.channel === 'WHATSAPP') {
        if (formData.provider === 'WHATSAPP_META') {
          credentials = {
            accessToken: formData.accessToken,
            phoneNumberId: formData.phoneNumberId,
            businessAccountId: formData.businessAccountId || undefined,
          };
        } else if (formData.provider === 'WHATSAPP_TWILIO') {
          credentials = {
            accountSid: formData.accountSid,
            authToken: formData.authToken,
            fromNumber: formData.fromNumber,
          };
        } else if (formData.provider === 'WHATSAPP_360DIALOG') {
          credentials = {
            apiKey: formData.dialog360ApiKey,
            clientId: formData.dialog360ClientId || undefined,
          };
        }
      }
    }

    const payload = {
      provider: formData.provider,
      channel: formData.channel,
      strategy: formData.strategy,
      monthlyQuota: formData.monthlyQuota ? parseInt(formData.monthlyQuota) : undefined,
      costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : undefined,
      credentials,
    };

    const response = await createCredential({
      endpoint: `/communication-credentials/businesses/${businessId}`,
      method: 'POST',
      data: payload,
    });

    if (response?.success) {
      alert.success('Credential created successfully');
      onSuccess();
    }
  };

  const handleTestConnection = async () => {
    if (!formData.provider) {
      alert.error('Please select a provider first');
      return;
    }

    let credentials: Record<string, string> = {};
    if (formData.provider === 'SMS_SENDLK') {
      if (!formData.apiToken) {
        alert.error('API Token is required to test the connection');
        return;
      }
      credentials = { apiToken: formData.apiToken, senderID: formData.senderID };
    } else if (formData.provider.includes('TWILIO')) {
      credentials = { accountSid: formData.accountSid, authToken: formData.authToken };
    } else if (formData.provider === 'WHATSAPP_META') {
      if (!formData.accessToken || !formData.phoneNumberId) {
        alert.error('Access Token and Phone Number ID are required to test the connection');
        return;
      }
      credentials = { accessToken: formData.accessToken, phoneNumberId: formData.phoneNumberId };
    } else if (formData.provider === 'WHATSAPP_360DIALOG') {
      credentials = { apiKey: formData.dialog360ApiKey, clientId: formData.dialog360ClientId };
    } else {
      credentials = { username: formData.username, apiKey: formData.apiKey };
    }

    setTestResult(null);
    const response = await testConnection({
      endpoint: `/communication-credentials/test`,
      method: 'POST',
      data: { provider: formData.provider, credentials },
    });

    if (response?.data) {
      setTestResult(response.data as { isValid: boolean; message: string });
    }
  };

  const renderCredentialFields = () => {
    if (formData.strategy === 'PLATFORM_MANAGED') {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Platform-managed credentials will use the system's default configuration.
            You only need to set quota and cost limits.
          </AlertDescription>
        </Alert>
      );
    }

    if (formData.channel === 'SMS') {
      if (formData.provider === 'SMS_SENDLK') {
        return (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Enter your <strong>Send.lk</strong> API token and Sender ID. You can find these in your{' '}
                <a href="https://sms.send.lk" target="_blank" rel="noopener noreferrer" className="underline">
                  Send.lk dashboard
                </a>.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token *</Label>
              <Input
                id="apiToken"
                type="password"
                value={formData.apiToken}
                onChange={(e) => {
                  setFormData({ ...formData, apiToken: e.target.value });
                  setTestResult(null);
                }}
                placeholder="Your Send.lk Bearer token"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderID">Sender ID *</Label>
              <Input
                id="senderID"
                value={formData.senderID}
                onChange={(e) => {
                  setFormData({ ...formData, senderID: e.target.value });
                  setTestResult(null);
                }}
                placeholder="YourBrand"
                required
              />
            </div>
            {/* Test connection */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !formData.apiToken}
                className="w-full"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4 mr-2" />
                )}
                Test Send.lk Connection
              </Button>
              {testResult && (
                <Alert variant={testResult.isValid ? 'default' : 'destructive'}>
                  {testResult.isValid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </>
        );
      } else if (formData.provider.includes('TWILIO')) {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="accountSid">Account SID *</Label>
              <Input
                id="accountSid"
                value={formData.accountSid}
                onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
                placeholder="AC..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authToken">Auth Token *</Label>
              <Input
                id="authToken"
                type="password"
                value={formData.authToken}
                onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromNumber">From Number *</Label>
              <Input
                id="fromNumber"
                value={formData.fromNumber}
                onChange={(e) => setFormData({ ...formData, fromNumber: e.target.value })}
                placeholder="+94771234567"
                required
              />
            </div>
          </>
        );
      } else {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">Username/Email *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderID">Sender ID *</Label>
              <Input
                id="senderID"
                value={formData.senderID}
                onChange={(e) => setFormData({ ...formData, senderID: e.target.value })}
                placeholder="YourBrand"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL (Optional)</Label>
              <Input
                id="apiUrl"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.provider.com"
              />
            </div>
          </>
        );
      }
    } else if (formData.channel === 'EMAIL') {
      if (formData.provider === 'EMAIL_SMTP') {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host *</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="smtp.gmail.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">SMTP Port *</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="587"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email *</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                placeholder="noreply@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                placeholder="Your Company"
              />
            </div>
          </>
        );
      } else {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email *</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                placeholder="noreply@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                placeholder="Your Company"
              />
            </div>
          </>
        );
      }
    } else if (formData.channel === 'WHATSAPP') {
      return renderWhatsAppCredentialFields();
    }

    return null;
  };

  const renderWhatsAppCredentialFields = () => {
    if (formData.provider === 'WHATSAPP_META') {
      return (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Enter your <strong>Meta (Facebook) WhatsApp Business API</strong> Permanent Access Token and Phone Number ID.
              Find these in your{' '}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline">
                Meta Developer Dashboard
              </a>{' '}
              under WhatsApp &rarr; API Setup.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="accessToken">Permanent Access Token *</Label>
            <Input
              id="accessToken"
              type="password"
              value={formData.accessToken}
              onChange={(e) => { setFormData({ ...formData, accessToken: e.target.value }); setTestResult(null); }}
              placeholder="EAAxxxxxxxxxxxxxxx..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
            <Input
              id="phoneNumberId"
              value={formData.phoneNumberId}
              onChange={(e) => { setFormData({ ...formData, phoneNumberId: e.target.value }); setTestResult(null); }}
              placeholder="1234567890123456"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessAccountId">WhatsApp Business Account ID (Optional)</Label>
            <Input
              id="businessAccountId"
              value={formData.businessAccountId}
              onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
              placeholder="9876543210987654"
            />
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !formData.accessToken || !formData.phoneNumberId}
              className="w-full"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 mr-2" />
              )}
              Test Meta WhatsApp Connection
            </Button>
            {testResult && (
              <Alert variant={testResult.isValid ? 'default' : 'destructive'}>
                {testResult.isValid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </>
      );
    }

    if (formData.provider === 'WHATSAPP_TWILIO') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="accountSid">Account SID *</Label>
            <Input
              id="accountSid"
              value={formData.accountSid}
              onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
              placeholder="AC..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token *</Label>
            <Input
              id="authToken"
              type="password"
              value={formData.authToken}
              onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromNumber">WhatsApp From Number *</Label>
            <Input
              id="fromNumber"
              value={formData.fromNumber}
              onChange={(e) => setFormData({ ...formData, fromNumber: e.target.value })}
              placeholder="whatsapp:+14155238886"
              required
            />
          </div>
        </>
      );
    }

    if (formData.provider === 'WHATSAPP_360DIALOG') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="dialog360ApiKey">360Dialog API Key *</Label>
            <Input
              id="dialog360ApiKey"
              type="password"
              value={formData.dialog360ApiKey}
              onChange={(e) => setFormData({ ...formData, dialog360ApiKey: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dialog360ClientId">Client ID (Optional)</Label>
            <Input
              id="dialog360ClientId"
              value={formData.dialog360ClientId}
              onChange={(e) => setFormData({ ...formData, dialog360ClientId: e.target.value })}
            />
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Add Communication Credential</DialogTitle>
          <DialogDescription>
            Configure a new communication channel for your organization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel">Channel *</Label>
            <Select
              value={formData.channel}
              onValueChange={(value) => {
                setFormData({ ...formData, channel: value, provider: '' });
                setTestResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="PUSH">Push Notifications</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.channel && (
            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => {
                  setFormData({ ...formData, provider: value });
                  setTestResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers[formData.channel as keyof typeof providers]?.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="strategy">Strategy *</Label>
            <Select
              value={formData.strategy}
              onValueChange={(value) => setFormData({ ...formData, strategy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLATFORM_MANAGED">Platform Managed (Simple)</SelectItem>
                <SelectItem value="BUSINESS_MANAGED">
                  Business Managed (BYOC - Bring Your Own Credentials)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderCredentialFields()}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyQuota">Monthly Quota</Label>
              <Input
                id="monthlyQuota"
                type="number"
                value={formData.monthlyQuota}
                onChange={(e) => setFormData({ ...formData, monthlyQuota: e.target.value })}
                placeholder="1000 (leave empty for unlimited)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPerUnit">Cost Per Unit ($)</Label>
              <Input
                id="costPerUnit"
                type="number"
                step="0.01"
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                placeholder="0.05"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Credential
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCredentialModal;
