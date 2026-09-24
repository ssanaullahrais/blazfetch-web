// A tiny signal (no imports, so any module can use it) that says "a fetch or download just happened", so the footer
// counter can refresh right away instead of waiting for its next poll.
const EVENT = "site-stats:changed";

export function notifyStatsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onStatsChanged(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
