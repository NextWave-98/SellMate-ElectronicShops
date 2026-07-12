import React, { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, User } from 'lucide-react';
import { Input } from '../ui/input';
import type { Conversation, WhatsAppOrgMode } from '../../types/whatsapp-inbox';

interface Props {
  conversations: Conversation[];
  selectedPhone: string | null;
  onSelect: (phone: string) => void;
  orgMode: WhatsAppOrgMode;
  loading?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

function truncate(text: string, max = 40): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

const ContactList: React.FC<Props> = ({
  conversations,
  selectedPhone,
  onSelect,
  orgMode: _orgMode,
  loading = false,
}) => {
  void _orgMode;
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...conversations].sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
    );
    if (!q) return sorted;
    return sorted.filter((c) => c.phone.toLowerCase().includes(q));
  }, [conversations, search]);

  return (
    <div className="flex flex-col h-full border-r bg-background">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No conversations yet</p>
        ) : (
          filtered.map((conv) => {
            const selected = conv.phone === selectedPhone;
            return (
              <button
                key={conv.phone}
                type="button"
                onClick={() => onSelect(conv.phone)}
                className={`w-full text-left px-3 py-3 border-b transition-colors hover:bg-muted/50 ${
                  selected ? 'border-l-4 border-l-blue-500 bg-blue-50' : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">+{conv.phone.replace(/^\+/, '')}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.direction === 'outgoing' ? 'You: ' : ''}
                        {truncate(conv.lastMessage)}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContactList;
