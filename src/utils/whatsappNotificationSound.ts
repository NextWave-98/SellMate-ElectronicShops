import type { WhatsAppNotificationTone } from './whatsappInboxPrefs';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(frequency: number, duration: number, volume = 0.15): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export function playWhatsAppNotificationTone(tone: WhatsAppNotificationTone): void {
  switch (tone) {
    case 'soft':
      playTone(520, 0.12, 0.1);
      setTimeout(() => playTone(660, 0.15, 0.08), 120);
      break;
    case 'chime':
      playTone(784, 0.1, 0.12);
      setTimeout(() => playTone(988, 0.12, 0.1), 90);
      setTimeout(() => playTone(1175, 0.18, 0.08), 180);
      break;
    default:
      playTone(880, 0.08, 0.14);
      setTimeout(() => playTone(1100, 0.12, 0.12), 100);
      break;
  }
}

export async function requestWhatsAppNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showWhatsAppBrowserNotification(phone: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  const displayPhone = phone.startsWith('+') ? phone : `+${phone.replace(/^\+/, '')}`;
  try {
    new Notification('New WhatsApp message', {
      body: `${displayPhone}: ${body.slice(0, 120)}`,
      icon: '/vite.svg',
      tag: `wa-${displayPhone}`,
    });
  } catch {
    // ignore   some browsers block without user gesture
  }
}
