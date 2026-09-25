import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { isDownloadsBusy } from "@/lib/busy";
import { watchForUpdates } from "@/lib/pwa";

/**
 * Registers the service worker and, once a new version has taken over, applies it by itself: as soon as the visitor
 * leaves the page (switches tab or app, locks the phone) and no download is running, it reloads quietly, so an open
 * or installed app is always current the next time it is looked at. While the page is in view it only offers a
 * reload, never forcing one, so a typed link or a download in progress is not cut off; "Later" keeps this page as it
 * is, and any reload shows the new version.
 */
export function PwaUpdatePrompt() {
  const stopWatching = useRef<(() => void) | null>(null);
  const [reloading, setReloading] = useState(false);
  const [updated, setUpdated] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Called instead of the plugin's own automatic reload when the new version activates.
    onNeedReload: () => setUpdated(true),
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      stopWatching.current?.();
      stopWatching.current = watchForUpdates(registration);
    },
  });

  useEffect(() => () => stopWatching.current?.(), []);

  const reload = () => {
    setReloading(true);
    if (updated) window.location.reload();
    else void updateServiceWorker(true); // a worker still waiting: activate it, then the page reloads
  };

  const updatePending = needRefresh || updated;
  useEffect(() => {
    if (!updatePending) return;
    const applyWhenAway = () => {
      if (document.visibilityState === "hidden" && !isDownloadsBusy()) reload();
    };
    document.addEventListener("visibilitychange", applyWhenAway);
    return () => document.removeEventListener("visibilitychange", applyWhenAway);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only reads current state and the service worker
  }, [updatePending]);

  if (!needRefresh && !updated) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg sm:right-auto sm:left-4 sm:mx-0"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <RefreshCw className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1">A new version is available.</span>
      <Button size="sm" onClick={reload} disabled={reloading}>
        {reloading ? "Reloading…" : "Reload"}
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Later"
        onClick={() => {
          setNeedRefresh(false);
          setUpdated(false);
        }}
      >
        <X />
      </Button>
    </div>
  );
}
