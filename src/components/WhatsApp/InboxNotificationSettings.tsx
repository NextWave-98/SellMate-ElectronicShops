import React, { useEffect, useState } from 'react';
import { Bell, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DEFAULT_WHATSAPP_INBOX_PREFS,
  loadWhatsAppInboxPrefs,
  saveWhatsAppInboxPrefs,
  type WhatsAppInboxPrefs,
  type WhatsAppNotificationTone,
} from '../../utils/whatsappInboxPrefs';
import {
  playWhatsAppNotificationTone,
  requestWhatsAppNotificationPermission,
} from '../../utils/whatsappNotificationSound';

interface Props {
  onPrefsChange?: (prefs: WhatsAppInboxPrefs) => void;
}

const InboxNotificationSettings: React.FC<Props> = ({ onPrefsChange }) => {
  const [prefs, setPrefs] = useState<WhatsAppInboxPrefs>(() => loadWhatsAppInboxPrefs());
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  useEffect(() => {
    onPrefsChange?.(prefs);
  }, [prefs, onPrefsChange]);

  const update = (patch: Partial<WhatsAppInboxPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveWhatsAppInboxPrefs(next);
      return next;
    });
  };

  const handleBrowserToggle = async (enabled: boolean) => {
    if (enabled) {
      const perm = await requestWhatsAppNotificationPermission();
      setNotifPermission(perm);
      update({ browserNotifications: perm === 'granted' });
      return;
    }
    update({ browserNotifications: false });
  };

  const testSound = () => {
    playWhatsAppNotificationTone(prefs.tone);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Alerts</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div>
          <p className="font-medium text-sm">Inbox alerts</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sound & notifications when customers message you
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="wa-sound" className="flex items-center gap-2 text-sm cursor-pointer">
            {prefs.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Message sound
          </Label>
          <Switch
            id="wa-sound"
            checked={prefs.soundEnabled}
            onCheckedChange={(v) => update({ soundEnabled: v })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Tone</Label>
          <Select
            value={prefs.tone}
            onValueChange={(v) => update({ tone: v as WhatsAppNotificationTone })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default ping</SelectItem>
              <SelectItem value="soft">Soft double</SelectItem>
              <SelectItem value="chime">Chime</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={testSound}>
            Test sound
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="wa-browser-notif" className="text-sm cursor-pointer">
            Browser notifications
          </Label>
          <Switch
            id="wa-browser-notif"
            checked={prefs.browserNotifications && notifPermission === 'granted'}
            onCheckedChange={handleBrowserToggle}
          />
        </div>

        {notifPermission === 'denied' && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-2">
            Browser blocked notifications. Allow them in your browser site settings.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            saveWhatsAppInboxPrefs(DEFAULT_WHATSAPP_INBOX_PREFS);
            setPrefs({ ...DEFAULT_WHATSAPP_INBOX_PREFS });
          }}
        >
          Reset to defaults
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default InboxNotificationSettings;
