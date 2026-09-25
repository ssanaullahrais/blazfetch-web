import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { watchForUpdates } from "@/lib/pwa";

/**
 * Registers the service worker and, when a new version has been deployed, offers a reload. The update never applies
 * on its own, so a download in progress is not cut off; "Later" keeps the current version until the next visit.
 */
export function PwaUpdatePrompt() {
  const stopWatching = useRef<(() => void) | null>(null);
  const [reloading, setReloading] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      stopWatching.current?.();
      stopWatching.current = watchForUpdates(registration);
    },
  });

  useEffect(() => () => stopWatching.current?.(), []);

  if (!needRefresh) return null;

  const reload = () => {
    setReloading(true);
    // Activates the waiting worker; the page reloads once it takes control.
    void updateServiceWorker(true);
  };

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
      <Button size="icon-sm" variant="ghost" aria-label="Later" onClick={() => setNeedRefresh(false)}>
        <X />
      </Button>
    </div>
  );
}
