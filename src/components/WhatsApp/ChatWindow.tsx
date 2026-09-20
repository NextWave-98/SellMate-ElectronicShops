import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { Send, User, Bot, ChevronDown, ArrowLeft } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import type { WhatsAppInboxMessage, WhatsAppOrgMode, ReplyTemplate } from '../../types/whatsapp-inbox';

interface Props {
  phone: string;
  messages: WhatsAppInboxMessage[];
  orgMode: WhatsAppOrgMode;
  onSendReply: (message: string) => void;
  sending: boolean;
  replyTemplates?: ReplyTemplate[];
  loading?: boolean;
  onBack?: () => void;
}

const ChatWindow: React.FC<Props> = ({
  phone,
  messages,
  orgMode,
  onSendReply,
  sending,
  replyTemplates = [],
  loading = false,
  onBack,
}) => {
  const [draft, setDraft] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || sending) return;
    onSendReply(text);
    setDraft('');
  };

  const modeBadge =
    orgMode === 'AI' ? (
      <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5 flex items-center gap-1">
        <Bot className="h-3 w-3" /> AI Mode
      </span>
    ) : orgMode === 'AUTO' ? (
      <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">⚡ Auto Mode</span>
    ) : (
      <span className="text-xs bg-orange-100 text-orange-800 rounded-full px-2 py-0.5">👤 Manual</span>
    );

  let lastDate: Date | null = null;

  return (
    <div className="flex flex-col h-full min-w-0 bg-background">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b shrink-0 safe-top">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="sm:hidden shrink-0 h-9 w-9"
              onClick={onBack}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate text-sm sm:text-base">
              +{phone.replace(/^\+/, '')}
            </p>
            <div className="flex items-center gap-2">{modeBadge}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 bg-[#e5ddd5]/30 overscroll-contain">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No messages in this conversation</p>
        ) : (
          messages.map((msg) => {
            const msgDate = new Date(msg.createdAt);
            const showDateDivider = !lastDate || !isSameDay(lastDate, msgDate);
            if (showDateDivider) lastDate = msgDate;

            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 border-t border-gray-300" />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(msgDate, 'EEE, MMM d')}
                    </span>
                    <div className="flex-1 border-t border-gray-300" />
                  </div>
                )}
                <MessageBubble message={msg} />
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {orgMode === 'MANUAL' ? (
        <div className="border-t p-3 bg-background shrink-0 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {replyTemplates.length > 0 && (
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuickReplies((v) => !v)}
              >
                Quick Replies <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              {showQuickReplies && (
                <div className="absolute bottom-full left-0 mb-1 w-72 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md z-10">
                  {replyTemplates.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                      onClick={() => {
                        setDraft(t.reply);
                        setShowQuickReplies(false);
                      }}
                    >
                      <span className="font-medium">{t.keyword}</span>
                      <p className="text-xs text-muted-foreground truncate">{t.reply}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a reply..."
              className="resize-none min-h-[44px] text-base sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="shrink-0 h-11 w-11"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t p-4 bg-muted/30 shrink-0">
          <div className="rounded-lg border bg-background p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              {orgMode === 'AI' ? '🤖' : '⚡'}{' '}
              {orgMode === 'AI' ? 'AI Mode active' : 'Auto reply active'}   replies are automatic.
              Switch to Manual mode to reply yourself.
            </p>
            <Button variant="link" size="sm" className="shrink-0 p-0 h-auto" asChild>
              <Link to="/superadmin/communication/whatsapp">Go to Settings →</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
