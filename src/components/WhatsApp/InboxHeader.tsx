import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import InboxNotificationSettings from './InboxNotificationSettings';
import type { WhatsAppOrgMode } from '../../types/whatsapp-inbox';
import type { WhatsAppInboxPrefs } from '../../utils/whatsappInboxPrefs';

interface Props {
  orgMode: WhatsAppOrgMode;
  totalUnread: number;
  onPrefsChange?: (prefs: WhatsAppInboxPrefs) => void;
}

const MODE_CONFIG: Record<
  WhatsAppOrgMode,
  { label: string; emoji: string; className: string }
> = {
  AI: {
    label: 'AI Active',
    emoji: '🤖',
    className: 'border-green-500 bg-green-50 text-green-800',
  },
  AUTO: {
    label: 'Auto Reply',
    emoji: '⚡',
    className: 'border-blue-500 bg-blue-50 text-blue-800',
  },
  MANUAL: {
    label: 'Manual',
    emoji: '👤',
    className: 'border-orange-500 bg-orange-50 text-orange-800',
  },
};

const InboxHeader: React.FC<Props> = ({ orgMode, totalUnread, onPrefsChange }) => {
  const mode = MODE_CONFIG[orgMode];

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background shrink-0">
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp Inbox
        </h1>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-sm text-muted-foreground">Mode:</span>
          <Badge variant="outline" className={mode.className}>
            {mode.emoji} {mode.label} ●
          </Badge>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread} unread
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <InboxNotificationSettings onPrefsChange={onPrefsChange} />
        <Button variant="outline" size="sm" asChild>
          <Link to="/superadmin/communication/whatsapp">
            <Settings className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default InboxHeader;
