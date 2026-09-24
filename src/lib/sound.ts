let ctx: AudioContext | null = null;

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return ctx;
}

function tone(freq: number, start: number, duration: number, gainValue = 0.15) {
  const audioCtx = getContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, audioCtx.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainValue, audioCtx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + duration + 0.05);
}

export function playDownloadCompleteSound() {
  try {
    tone(880, 0, 0.12);
    tone(1320, 0.1, 0.18);
  } catch {
    // audio not available; ignore
  }
}

export function playErrorSound() {
  try {
    tone(220, 0, 0.2, 0.12);
  } catch {
    // audio not available; ignore
  }
}
