/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
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
import { Info, Loader2 } from 'lucide-react';
import alert from '../../../utils/alert';

interface Credential {
  id: string;
  provider: string;
  channel: string;
  strategy: string;
  monthlyQuota: number | null;
  costPerUnit: number | null;
}

interface EditCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  credential: Credential;
}

const EditCredentialModal: React.FC<EditCredentialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  credential,
}) => {
  const [formData, setFormData] = useState({
    strategy: credential.strategy,
    monthlyQuota: credential.monthlyQuota?.toString() || '',
    costPerUnit: credential.costPerUnit?.toString() || '',
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
    password: ''
  });

  const { fetchData: updateCredential, loading } = useFetch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Build credentials object if strategy is BUSINESS_MANAGED
    let credentials = null;
    if (formData.strategy === 'BUSINESS_MANAGED') {
      if (credential.channel === 'SMS') {
        if (credential.provider.includes('TWILIO')) {
          credentials = {
            accountSid: formData.accountSid || undefined,
            authToken: formData.authToken || undefined,
            fromNumber: formData.fromNumber || undefined,
          };
        } else if (credential.provider === 'SMS_SENDLK') {
          credentials = {
            apiToken: formData.apiToken || undefined,
            senderID: formData.senderID || undefined,
          };
        } else {
          credentials = {
            username: formData.username || undefined,
            apiKey: formData.apiKey || undefined,
            senderID: formData.senderID || undefined,
            apiUrl: formData.apiUrl || undefined,
          };
        }
      } else if (credential.channel === 'EMAIL') {
        if (credential.provider === 'EMAIL_SMTP') {
          credentials = {
            host: formData.host || undefined,
            port: formData.port ? parseInt(formData.port) : undefined,
            username: formData.username || undefined,
            password: formData.password || undefined,
            fromEmail: formData.fromEmail || undefined,
            fromName: formData.fromName || undefined,
          };
        } else {
          credentials = {
            apiKey: formData.apiKey || undefined,
            fromEmail: formData.fromEmail || undefined,
            fromName: formData.fromName || undefined,
          };
        }
      }
    }

    const payload: any = {
      strategy: formData.strategy,
      monthlyQuota: formData.monthlyQuota ? parseInt(formData.monthlyQuota) : null,
      costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : null,
    };

    // Only include credentials if they were provided
    if (credentials && Object.values(credentials).some(v => v !== undefined)) {
      payload.credentials = credentials;
    }

    const response = await updateCredential({
      endpoint: `/communication-credentials/${credential.id}`,
      method: 'PUT',
      data: payload,
    });

    if (response?.success) {
      alert.success('Credential updated successfully');
      onSuccess();
    }
  };

  const renderCredentialFields = () => {
    if (formData.strategy === 'PLATFORM_MANAGED') {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Platform-managed credentials use the system's default configuration.
            Credential fields are not editable in this mode.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Leave credential fields empty to keep existing values. Only fill fields you want to update.
        </AlertDescription>
      </Alert>
    );
  };

  const renderCredentialInputs = () => {
    if (formData.strategy === 'PLATFORM_MANAGED') {
      return null;
    }

    if (credential.channel === 'SMS') {
      if (credential.provider.includes('TWILIO')) {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="accountSid">Account SID (leave empty to keep current)</Label>
              <Input
                id="accountSid"
                value={formData.accountSid}
                onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
                placeholder="AC..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authToken">Auth Token (leave empty to keep current)</Label>
              <Input
                id="authToken"
                type="password"
                value={formData.authToken}
                onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromNumber">From Number (leave empty to keep current)</Label>
              <Input
                id="fromNumber"
                value={formData.fromNumber}
                onChange={(e) => setFormData({ ...formData, fromNumber: e.target.value })}
                placeholder="+94771234567"
              />
            </div>
          </>
        );
      } else if (credential.provider === 'SMS_SENDLK') {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token (leave empty to keep current)</Label>
              <Input
                id="apiToken"
                type="password"
                value={formData.apiToken}
                onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                placeholder="Send.lk bearer token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderID">Sender ID (leave empty to keep current)</Label>
              <Input
                id="senderID"
                value={formData.senderID}
                onChange={(e) => setFormData({ ...formData, senderID: e.target.value })}
                placeholder="YourBrand"
              />
            </div>
          </>
        );
      } else {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">Username/Email (leave empty to keep current)</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (leave empty to keep current)</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderID">Sender ID (leave empty to keep current)</Label>
              <Input
                id="senderID"
                value={formData.senderID}
                onChange={(e) => setFormData({ ...formData, senderID: e.target.value })}
                placeholder="YourBrand"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL (leave empty to keep current)</Label>
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
    } else if (credential.channel === 'EMAIL') {
      if (credential.provider === 'EMAIL_SMTP') {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host (leave empty to keep current)</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">SMTP Port (leave empty to keep current)</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username (leave empty to keep current)</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (leave empty to keep current)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email (leave empty to keep current)</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                placeholder="noreply@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name (leave empty to keep current)</Label>
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
              <Label htmlFor="apiKey">API Key (leave empty to keep current)</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email (leave empty to keep current)</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                placeholder="noreply@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name (leave empty to keep current)</Label>
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
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Edit Communication Credential</DialogTitle>
          <DialogDescription>
            Update settings for {credential.channel} ({credential.provider.replace(/_/g, ' ')})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="strategy">Strategy</Label>
            <Select
              value={formData.strategy}
              onValueChange={(value) => setFormData({ ...formData, strategy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLATFORM_MANAGED">Platform Managed</SelectItem>
                <SelectItem value="BUSINESS_MANAGED">Business Managed (BYOC)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderCredentialFields()}
          {renderCredentialInputs()}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyQuota">Monthly Quota</Label>
              <Input
                id="monthlyQuota"
                type="number"
                value={formData.monthlyQuota}
                onChange={(e) => setFormData({ ...formData, monthlyQuota: e.target.value })}
                placeholder="1000 (empty for unlimited)"
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
              Update Credential
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCredentialModal;
