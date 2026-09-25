import { useSyncExternalStore } from "react";
import { PWA_ENABLED_ON_DEVICE } from "@/lib/pwa";

/** Chrome's install prompt event; not in the DOM typings because it is not a standard yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * What the app can offer for installing itself:
 * - `available`: the browser handed over its install prompt (Chrome, Edge desktop).
 * - `none`: already installed or opened as an app, the PWA is switched off, running on a phone/tablet (the app is
 *   desktop-only), or the browser cannot install (Firefox desktop).
 */
export type InstallState = "available" | "none";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Listens from the moment the app loads: the browser fires `beforeinstallprompt` only once, early. */
export function startInstallListener(): void {
  if (typeof window === "undefined" || !PWA_ENABLED_ON_DEVICE) return;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // keep the event so our own button can show the prompt
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

function getState(): InstallState {
  if (!PWA_ENABLED_ON_DEVICE || installed || isStandalone()) return "none";
  return deferredPrompt ? "available" : "none";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getState, () => "none");
}

/** Shows the browser's own install dialog. Resolves true when the visitor accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferredPrompt = null; // a prompt event can only be used once
  if (outcome === "accepted") installed = true;
  notify();
  return outcome === "accepted";
}
