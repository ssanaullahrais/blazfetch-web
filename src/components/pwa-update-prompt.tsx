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
      className="fixed inset-x-3 z-50 mx-auto flex max-w-xs items-center gap-2 rounded-xl border bg-popover p-2 text-xs text-popover-foreground shadow-lg sm:inset-x-4 sm:right-4 sm:left-auto sm:mx-0 sm:max-w-sm sm:gap-3 sm:rounded-2xl sm:p-3 sm:text-sm"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border bg-background sm:size-9">
        <RefreshCw className="size-3.5 sm:size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate font-medium">Update available</p>
        <p className="truncate text-[11px] text-muted-foreground sm:text-xs">A new version is available.</p>
      </span>
      <Button size="xs" className="sm:h-8 sm:px-3 sm:text-sm" onClick={reload} disabled={reloading}>
        {reloading ? "Reloading…" : "Reload"}
      </Button>
      <Button
        size="icon-xs"
        className="sm:size-8"
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
