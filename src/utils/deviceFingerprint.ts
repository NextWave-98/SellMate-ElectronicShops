export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fp', 2, 2);
  }
  const canvasData = canvas.toDataURL();

  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    new Date().getTimezoneOffset(),
    canvasData,
    navigator.hardwareConcurrency || '',
    navigator.platform || '',
  ];

  let hash = 0;
  const str = components.join('##');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const h1 = Math.abs(hash).toString(16).padStart(16, '0');
  const h2 = Math.abs(hash ^ 0xdeadbeef).toString(16).padStart(16, '0');
  return (h1 + h2).slice(0, 32);
}

export function getOrCreateDeviceId(): string {
  const key = 'gcm_device_id_v2';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateDeviceFingerprint();
    localStorage.setItem(key, id);
  }
  return id;
}

export const LIVENESS_PROMPT_LABELS: Record<string, string> = {
  turn_left: 'Slowly turn your head to the left, then back',
  turn_right: 'Slowly turn your head to the right, then back',
  smile: 'Smile briefly, then relax your face',
  blink: 'Blink naturally and hold still',
};
