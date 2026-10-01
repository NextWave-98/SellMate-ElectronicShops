/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Wallet } from 'lucide-react';
import useNotification, { type Notification as NotificationItem } from '../../hooks/useNotification';
import {
  playNotificationAlertSound,
  unlockNotificationAlertSound,
} from '../../utils/notificationAlertSound';

/** Slower poll — avoids flooding terminal; still timely for drawer/sale alerts */
const POLL_MS = 45_000;
const SEEN_KEY = 'header_notif_seen_ids';

function loadSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr.slice(0, 200) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    /* ignore */
  }
}

function isUnread(n: NotificationItem) {
  // Prefer explicit read flag. Delivery channel status (SENT/DELIVERED/FAILED)
  // must not hide in-app alerts — markAsRead sets both read=true and DELIVERED.
  if (n.read === true) return false;
  return true;
}

function parseMeta(n: NotificationItem): Record<string, unknown> {
  if (!n.metadata) return {};
  if (typeof n.metadata === 'string') {
    try {
      return JSON.parse(n.metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return n.metadata as Record<string, unknown>;
}

/** Collapse SMS + WhatsApp copies of the same event into one header alert. */
function dedupeNotifications(list: NotificationItem[]): NotificationItem[] {
  const seen = new Set<string>();
  const out: NotificationItem[] = [];
  for (const n of list) {
    const meta = parseMeta(n);
    const key = meta.drawerId
      ? `${n.type}:${meta.drawerId}:${meta.event || ''}`
      : `${n.type}:${n.saleId || ''}:${n.jobSheetId || ''}:${n.message?.slice(0, 48)}:${String(n.createdAt || '').slice(0, 16)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

export function resolveNotificationRoute(
  n: NotificationItem,
  mode: 'admin' | 'branch',
  branchCode?: string
): string {
  const type = n.type || '';
  const meta = parseMeta(n);

  if (type.includes('CASH_DRAWER')) {
    if (mode === 'admin') {
      return meta.locationId
        ? `/superadmin/cash-drawer?locationId=${meta.locationId}`
        : '/superadmin/cash-drawer';
    }
    return branchCode ? `/${branchCode}/cash-drawer` : '/';
  }
  if (n.saleId) {
    return mode === 'admin' ? '/superadmin/sales' : branchCode ? `/${branchCode}/orders` : '/';
  }
  if (n.productReturnId) {
    return mode === 'admin' ? '/superadmin/returns' : branchCode ? `/${branchCode}/returns` : '/';
  }
  if (n.jobSheetId) {
    return mode === 'admin' ? '/superadmin/job-sheets/monitor' : branchCode ? `/${branchCode}/job-sheets` : '/';
  }
  if (type.includes('LOW_STOCK') || type.includes('STOCK')) {
    return mode === 'admin'
      ? '/superadmin/inventory/monitor?status=low_stock'
      : branchCode
        ? `/${branchCode}/inventory`
        : '/';
  }
  return mode === 'admin'
    ? '/superadmin/notifications/dashboard'
    : branchCode
      ? `/${branchCode}/notifications`
      : '/';
}

function getNotifColor(type: string) {
  if (type.includes('CASH_DRAWER')) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', Icon: Wallet };
  }
  if (type.includes('SALE')) return { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500', Icon: Bell };
  if (type.includes('RETURN')) return { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', Icon: Bell };
  return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', Icon: Bell };
}

function formatTimeAgo(date: string) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface HeaderNotificationsProps {
  mode: 'admin' | 'branch';
  branchCode?: string;
  viewAllPath: string;
}

export default function HeaderNotifications({ mode, branchCode, viewAllPath }: HeaderNotificationsProps) {
  const { getMyNotifications, markAsRead } = useNotification();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const seenRef = useRef<Set<string>>(loadSeenIds());
  const primedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Stable refs so route changes / fetchData identity churn cannot restart the poller
  const getMyRef = useRef(getMyNotifications);
  getMyRef.current = getMyNotifications;

  const fetchNotifications = useCallback(async (opts?: { playSound?: boolean }) => {
    try {
      const response = await getMyRef.current({ limit: 15 });
      const data = (response as any)?.data ?? (Array.isArray(response) ? response : []);
      const list: NotificationItem[] = dedupeNotifications(
        (Array.isArray(data) ? data : []).filter(isUnread)
      );

      if (opts?.playSound && primedRef.current) {
        const fresh = list.filter((n) => !seenRef.current.has(n.id));
        if (fresh.length > 0) {
          playNotificationAlertSound();
        }
      }

      list.forEach((n) => seenRef.current.add(n.id));
      saveSeenIds(seenRef.current);
      primedRef.current = true;
      setNotifications(list);
    } catch {
      /* keep previous list */
    }
  }, []);

  // Mount poller once — do not depend on fetchData/pathname or it looks like a terminal "loop"
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      setLoading(true);
      await fetchNotifications({ playSound: false });
      if (!cancelled) setLoading(false);
    };
    void run();
    const id = window.setInterval(() => {
      void fetchNotifications({ playSound: true });
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [fetchNotifications]);

  // Unlock Web Audio after first user gesture (browser autoplay policy)
  useEffect(() => {
    const unlock = () => unlockNotificationAlertSound();
    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetchNotifications({ playSound: false });
  }, [open, fetchNotifications]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unreadCount = notifications.length;

  const handleClickItem = async (n: NotificationItem) => {
    setOpen(false);
    try {
      await markAsRead(n.id);
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    } catch {
      /* navigation still happens via Link */
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          unlockNotificationAlertSound();
          setOpen((v) => !v);
        }}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white/60 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 w-[min(360px,calc(100vw-2rem))] bg-white/90 backdrop-blur-xl backdrop-saturate-150 rounded-2xl border border-white/40 z-50 overflow-hidden"
          style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.14)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/40">
            <h3 className="text-sm font-semibold text-gray-900">Alerts</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[11px] font-semibold rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-white/30">
            {loading && notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">All caught up</p>
              </div>
            ) : (
              notifications.map((n) => {
                const color = getNotifColor(n.type || '');
                const Icon = color.Icon;
                const to = resolveNotificationRoute(n, mode, branchCode);
                return (
                  <Link
                    key={n.id}
                    to={to}
                    onClick={() => void handleClickItem(n)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/50 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <Icon className={`w-4 h-4 ${color.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {n.title || (n.type || '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${color.dot} flex-shrink-0 mt-2`} />
                  </Link>
                );
              })
            )}
          </div>

          <div className="border-t border-white/40 px-4 py-2.5">
            <Link
              to={viewAllPath}
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
