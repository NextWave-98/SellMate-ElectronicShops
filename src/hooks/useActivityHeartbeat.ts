import { useEffect, useRef } from 'react';
import activityMonitoringService from '../services/activityMonitoringService';
import { getAccessToken } from '../utils/tokenStorage';

type MinuteBucket = { ts: string; active: boolean; events: number };

function truncateMinute(d: Date): string {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return x.toISOString();
}

/**
 * Lightweight web idle tracker for Phase 2 / Req 4.
 * Batches per-minute active flags and flushes every ~5 minutes (and on page hide).
 * No-ops if the user is logged out or monitoring is disabled server-side.
 */
export function useActivityHeartbeat(enabled = true) {
  const bucketsRef = useRef<Map<string, MinuteBucket>>(new Map());
  const lastFlushRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;
    if (!getAccessToken()) return;

    const markActive = () => {
      const key = truncateMinute(new Date());
      const existing = bucketsRef.current.get(key);
      if (existing) {
        existing.active = true;
        existing.events += 1;
      } else {
        bucketsRef.current.set(key, { ts: key, active: true, events: 1 });
      }
    };

    const ensureCurrentMinute = () => {
      const key = truncateMinute(new Date());
      if (!bucketsRef.current.has(key)) {
        bucketsRef.current.set(key, { ts: key, active: false, events: 0 });
      }
    };

    const flush = async () => {
      ensureCurrentMinute();
      const minutes = Array.from(bucketsRef.current.values()).slice(-60);
      if (!minutes.length) return;
      bucketsRef.current.clear();
      lastFlushRef.current = Date.now();
      try {
        await activityMonitoringService.heartbeat({ minutes, source: 'WEB' });
      } catch {
        // silently ignore   monitoring may be off / no permission
      }
    };

    const onActivity = () => markActive();
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const tick = window.setInterval(() => {
      ensureCurrentMinute();
      if (Date.now() - lastFlushRef.current >= 5 * 60 * 1000) {
        void flush();
      }
    }, 60_000);

    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', () => void flush());

    markActive();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onHide);
      void flush();
    };
  }, [enabled]);
}

export default useActivityHeartbeat;
