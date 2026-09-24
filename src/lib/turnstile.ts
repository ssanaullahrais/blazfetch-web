// Cloudflare Turnstile (optional bot check). The backend decides whether it is on and tells us the public site key
// (GET /api/v1/config), so turning it on or off only needs the backend's .env. See docs/INTEGRATION.md.
import { useSyncExternalStore } from "react";
import { ApiError } from "@/lib/errors";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const WAIT_LIMIT_MS = 60_000;

export type TurnstileStatus =
  | "unknown" // config not loaded yet
  | "off" // the backend does not use Turnstile
  | "needed" // waiting for the widget to produce a token
  | "verifying" // token sent to the backend
  | "passed"
  | "error";

type State = { status: TurnstileStatus; siteKey: string; sessionSeconds: number };

let state: State = { status: "unknown", siteKey: "", sessionSeconds: 1800 };
let apiBase = "";
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
  if (state.status !== "unknown") return;
  try {
    const res = await fetch(`${base}/config`, { credentials: "include" });
    const data = await res.json();
    if (data?.turnstile?.enabled && data.turnstile.siteKey) {
      set({ status: "needed", siteKey: data.turnstile.siteKey, sessionSeconds: data.turnstile.sessionSeconds ?? 1800 });
    } else {
      set({ status: "off" });
    }
  } catch {
    set({ status: "off" }); // an old backend without /config: behave as if there is no check
  }
}

/** Sends a solved widget token to the backend, which answers with the pass cookie. */
export async function submitToken(token: string): Promise<void> {
  set({ status: "verifying" });
  try {
    const res = await fetch(`${apiBase}/turnstile/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.success === false) throw new Error(data?.error?.message ?? "verification failed");
    set({ status: "passed" });
    // Ask again a little before the pass expires, so it never lapses in the middle of a session.
    clearTimeout(renewTimer);
    renewTimer = setTimeout(() => markPassLost(), Math.max(60, state.sessionSeconds - 60) * 1000);
  } catch {
    set({ status: "error" });
  }
}

/** The pass is gone (expired or refused): the widget runs again. */
export function markPassLost(): void {
  if (state.status === "off" || state.status === "unknown") return;
  clearTimeout(renewTimer);
  set({ status: "needed" });
}

/** Resolves once the visitor holds a valid pass. Immediately when Turnstile is off. */
export async function waitForPass(): Promise<void> {
  if (state.status === "unknown") await initTurnstile(apiBase);
  if (state.status === "off" || state.status === "passed") return;
  await new Promise<void>((resolve, reject) => {
    const check = () => {
      if (state.status === "passed" || state.status === "off") {
        clearTimeout(timer);
        listeners.delete(check);
        resolve();
      }
    };
    const timer = setTimeout(() => {
      listeners.delete(check);
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
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile could not be loaded"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
