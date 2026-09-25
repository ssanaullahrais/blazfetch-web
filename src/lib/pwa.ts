/**
 * Progressive web app switch. On by default; build with VITE_ENABLE_PWA=false to ship a plain website instead
 * (vite.config.ts reads the same variable and then publishes a self-destroying service worker and no manifest).
 */
export const PWA_ENABLED = import.meta.env.VITE_ENABLE_PWA !== "false";

/**
 * True on a phone or tablet (Android, iPhone/iPad, and other touch handhelds), false on desktop/laptop browsers.
 * The install prompt, floating "Install app" card and service worker are desktop-only regardless of VITE_ENABLE_PWA,
 * so a mobile visitor always gets the plain website even when the build ships the app for everyone else.
 */
function isMobileOrTabletDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile) return true;
  const ua = navigator.userAgent || "";
  if (/android|iphone|ipad|ipod|windows phone|blackberry|iemobile|opera mini|mobile|tablet|silk|kindle|playbook/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ identifies itself as a Mac but, unlike a real Mac, has multi-touch.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** PWA_ENABLED narrowed to desktop: the switch to check anywhere the app decides whether to act like an installable app. */
export const PWA_ENABLED_ON_DEVICE = PWA_ENABLED && !isMobileOrTabletDevice();

/** How often an open (or installed and resumed) app asks the server whether a new version was deployed. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Keeps an installed app current: checks for a new service worker every hour and whenever the app comes back to
 * the foreground (a phone app can stay open for days). Skipped while offline or while an update is installing.
 */
export function watchForUpdates(registration: ServiceWorkerRegistration): () => void {
  let lastCheck = Date.now();
  const check = () => {
    if (registration.installing || !navigator.onLine) return;
    lastCheck = Date.now();
    registration.update().catch(() => {
      // A failed check (server down, flaky network) just waits for the next one.
    });
  };
  const timer = window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible" && Date.now() - lastCheck > UPDATE_CHECK_INTERVAL_MS / 4) check();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/**
 * With the PWA switched off, removes any service worker and app-shell cache an earlier build left in this browser,
 * so the visitor gets the live site straight away instead of a cached copy.
 */
export async function removeServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("workbox-")).map((name) => caches.delete(name)));
    }
  } catch {
    // Storage blocked (private mode, browser settings): nothing was installed, so there is nothing to remove.
  }
}
