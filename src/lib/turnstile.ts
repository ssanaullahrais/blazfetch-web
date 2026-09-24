// Cloudflare Turnstile (optional bot check). The backend decides whether it is on and tells us the public site key
// (GET /api/v1/config), so turning it on or off only needs the backend's .env. See docs/INTEGRATION.md.
import { useSyncExternalStore } from "react";
import { ApiError } from "@/lib/errors";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const WAIT_LIMIT_MS = 60_000;

export type TurnstileStatus =
  | "unknown" // config not loaded yet
  | "off" // the backend does not use Turnstile
  | "idle" // on, but nothing has asked for it yet: a normal visit shows and does nothing
  | "needed" // an action needs a pass: the widget runs and we wait for its token
  | "verifying" // token sent to the backend
  | "passed"
  | "error";

type State = { status: TurnstileStatus; siteKey: string; sessionSeconds: number; action: string };

let state: State = { status: "unknown", siteKey: "", sessionSeconds: 1800, action: "" };
let apiBase = `${import.meta.env.VITE_API_BASE || ""}/api/v1`;
let configPromise: Promise<void> | null = null;
let configLoaded = false;
const listeners = new Set<() => void>();
let renewTimer: ReturnType<typeof setTimeout> | undefined;

function set(next: Partial<State>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useTurnstile(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** Reads the backend's public settings once. Safe to call repeatedly. */
export async function initTurnstile(base: string): Promise<void> {
  apiBase = base;
  if (configLoaded) return;
  if (configPromise) return configPromise;
  configPromise = (async () => {
    try {
      const res = await fetch(`${base}/config`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data?.success !== true || typeof data?.turnstile?.enabled !== "boolean") throw new Error("Invalid configuration");
      if (data.turnstile.enabled) {
        if (!data.turnstile.siteKey) throw new Error("Missing site key");
        set({ status: "idle", siteKey: data.turnstile.siteKey, sessionSeconds: data.turnstile.sessionSeconds ?? 1800, action: data.turnstile.action ?? "" });
      } else {
        set({ status: "off" });
      }
      configLoaded = true;
    } catch {
      set({ status: "error" });
      throw new ApiError("NETWORK_ERROR", "The security settings could not be loaded. Please try again.");
    }
  })();
  try { await configPromise; } finally { configPromise = null; }
}

/** Sends a solved widget token to the backend, which answers with the pass cookie. */
export async function submitToken(token: string): Promise<void> {
  if (state.status === "verifying" || state.status === "passed") return;
  set({ status: "verifying" });
  try {
    const res = await fetch(`${apiBase}/turnstile/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.success !== true) throw new Error(data?.error?.message ?? "verification failed");
    if (data.enabled === false) { set({ status: "off" }); return; }
    set({ status: "passed" });
    // Ask again a little before the pass expires, so it never lapses in the middle of a session.
    clearTimeout(renewTimer);
    const seconds = Number.isFinite(data.expiresIn) && data.expiresIn > 0 ? data.expiresIn : state.sessionSeconds;
    renewTimer = setTimeout(() => markPassLost(), Math.max(1, seconds - Math.min(60, seconds / 2)) * 1000);
  } catch {
    set({ status: "error" });
  }
}

/** The widget itself failed (blocked, offline, wrong domain): let the visitor retry. */
export function markCheckFailed(): void {
  if (state.status === "off" || state.status === "unknown") return;
  set({ status: "error" });
}

/** The pass is gone (expired or refused). The check only runs again when the visitor next does something that needs it. */
export function markPassLost(): void {
  if (state.status === "off" || state.status === "unknown") return;
  clearTimeout(renewTimer);
  set({ status: "idle" });
}

export async function retryTurnstile(): Promise<void> {
  try {
    await initTurnstile(apiBase);
    if (state.status !== "off") set({ status: "needed" });
  } catch { /* initTurnstile already exposes a retryable error. */ }
}

/** Resolves once the visitor holds a valid pass. Immediately when Turnstile is off. */
export async function waitForPass(): Promise<void> {
  if (!configLoaded) await initTurnstile(apiBase);
  if (state.status === "off" || state.status === "passed") return;
  // Start the check now (this is the first action that needs it); a plain visit never gets here.
  if (state.status === "idle" || state.status === "error") set({ status: "needed" });
  await new Promise<void>((resolve, reject) => {
    const check = () => {
      if (state.status === "passed" || state.status === "off") {
        clearTimeout(timer);
        listeners.delete(check);
        resolve();
      } else if (state.status === "error") {
        clearTimeout(timer);
        listeners.delete(check);
        reject(new ApiError("TURNSTILE_FAILED", "The security check could not be completed. Please try again."));
      }
    };
    const timer = setTimeout(() => {
      listeners.delete(check);
      markCheckFailed();
      reject(new ApiError("TURNSTILE_REQUIRED", "The security check did not finish. Please try again."));
    }, WAIT_LIMIT_MS);
    listeners.add(check);
    check();
  });
}

// ---- The Cloudflare script -------------------------------------------------------------------

export type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once (explicit rendering, as its docs describe). */
export function loadTurnstileScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    const fail = () => {
      clearTimeout(timer);
      scriptPromise = null;
      script.remove();
      reject(new Error("Turnstile could not be loaded"));
    };
    const timer = setTimeout(fail, 15_000);
    script.onload = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return scriptPromise;
}
