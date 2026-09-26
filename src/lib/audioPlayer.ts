import { useSyncExternalStore } from "react";

let audio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;

// The key of whichever row currently "owns" the shared audio element —
// stays set while paused too, so that row's player controls remain visible.
let ownerKey: string | null = null;

const listeners = new Set<() => void>();
const progressListeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}
function notifyProgress() {
  progressListeners.forEach((l) => l());
}

function ensureAudio() {
  if (!audio) {
    audio = new Audio();
    audio.addEventListener("ended", notify);
    audio.addEventListener("play", notify);
    audio.addEventListener("pause", notify);
    audio.addEventListener("timeupdate", notifyProgress);
    audio.addEventListener("loadedmetadata", notifyProgress);
    audio.addEventListener("durationchange", notifyProgress);
  }
  return audio;
}

function ensureAnalyser() {
  const el = ensureAudio();
  if (!audioCtx) {
    const Ctx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
    sourceNode = audioCtx.createMediaElementSource(el);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
  return analyser!;
}

export function useOwnerKey() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ownerKey
  );
}

/** True only for the row that owns the element AND is actively playing. */
export function useIsPlaying(key: string) {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ownerKey === key && !!audio && !audio.paused
  );
}

function subscribeProgress(l: () => void) {
  progressListeners.add(l);
  return () => progressListeners.delete(l);
}

function useCurrentTime(key: string) {
  return useSyncExternalStore(subscribeProgress, () =>
    ownerKey === key && audio ? audio.currentTime : 0
  );
}

function useDuration(key: string) {
  return useSyncExternalStore(subscribeProgress, () =>
    ownerKey === key && audio ? audio.duration || 0 : 0
  );
}

/** Each value is its own useSyncExternalStore (primitives compare cleanly);
 * combining them into an object here is fine since only the individual
 * snapshots — not this returned object — are identity-checked by React. */
export function useAudioProgress(key: string) {
  const currentTime = useCurrentTime(key);
  const duration = useDuration(key);
  return { currentTime, duration };
}

/** Loads (if needed) and plays a row's audio; pauses if it's already playing. */
export function togglePlay(key: string, src: string) {
  const el = ensureAudio();

  if (ownerKey === key) {
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
    return;
  }

  el.src = src;
  ownerKey = key;
  try {
    ensureAnalyser();
    if (audioCtx?.state === "suspended") audioCtx.resume();
  } catch {
    // visualizer unavailable; playback still works
  }
  el.play().catch(() => {});
  notify();
}

/** Pauses whatever is playing, keeping its position and the owner row's controls visible (e.g. leaving the
 * Audio tab shouldn't keep a preview playing silently in the background). No-op if nothing is playing. */
export function pausePlayback() {
  audio?.pause();
}

/** Stops playback and lets go of the loaded file, so the memory behind a previewed track can be freed. */
export function stopPlayback() {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  ownerKey = null;
  notify();
  notifyProgress();
}

export function seekTo(key: string, fraction: number) {
  if (ownerKey !== key || !audio || !audio.duration) return;
  audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
  notifyProgress();
}

export function getAnalyser() {
  return analyser;
}
