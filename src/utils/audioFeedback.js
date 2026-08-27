const SOUND_KEYS = { announcement: 'offline-hr-announcement-sound', alarm: 'offline-hr-alarm-sound' };

export function playDefaultSound(kind, environment = globalThis) {
  const AudioContext = environment.AudioContext || environment.webkitAudioContext;
  if (!AudioContext) return false;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const notes = kind === 'alarm' ? [330, 262, 330] : [523, 659, 784];
  const now = context.currentTime;
  oscillator.type = 'sine';
  notes.forEach((frequency, index) => oscillator.frequency.setValueAtTime(frequency, now + index * 0.9));
  gain.gain.setValueAtTime(0.0001, now);
  notes.forEach((_, index) => { const start = now + index * 0.9; gain.gain.linearRampToValueAtTime(0.12, start + 0.08); gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.78); });
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now); oscillator.stop(now + 2.7);
  oscillator.addEventListener('ended', () => context.close());
  return true;
}

export function loadCustomSound(kind, storage = globalThis.localStorage) { try { return storage?.getItem(SOUND_KEYS[kind]) || ''; } catch { return ''; } }
export function saveCustomSound(kind, dataUrl, storage = globalThis.localStorage) { try { storage?.setItem(SOUND_KEYS[kind], dataUrl); return true; } catch { return false; } }
export function playSound(kind, environment = globalThis) {
  const custom = loadCustomSound(kind, environment.localStorage);
  if (custom && environment.Audio) { const audio = new environment.Audio(custom); audio.volume = 0.35; audio.play().catch(() => {}); return true; }
  return playDefaultSound(kind, environment);
}
export function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
