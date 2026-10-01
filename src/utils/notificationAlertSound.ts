let audioCtx: AudioContext | null = null;
let unlocked = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Call once after a user gesture so browsers allow alert sounds. */
export function unlockNotificationAlertSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => {
      unlocked = true;
    });
  } else {
    unlocked = true;
  }
}

function playTone(frequency: number, duration: number, volume = 0.15): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

/** Short chime for in-app / header alerts (cash drawer, sales, etc.). */
export function playNotificationAlertSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const run = () => {
    playTone(880, 0.09, 0.14);
    window.setTimeout(() => playTone(1175, 0.14, 0.12), 100);
    window.setTimeout(() => playTone(988, 0.16, 0.08), 220);
  };

  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => {
      unlocked = true;
      run();
    });
    return;
  }

  unlocked = true;
  run();
}

export function isNotificationSoundUnlocked(): boolean {
  return unlocked;
}
