import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { promptInstall, useInstallState } from "@/lib/pwa-install";
import { site } from "@/config/site";

const MENU_ROW_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-2xl border bg-card/60 p-3 text-left transition hover:bg-card/80";
const MENU_ROW_ICON_CLASS =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background";

/**
 * "Install app" row of the desktop menu: the browser's own install dialog, and nothing at all when the app is
 * already installed, the browser cannot install it, or the visitor is on a phone or tablet (the app is desktop-only).
 * (The floating card below is the main prompt; this row is the way back after it has hidden.)
 */
export function InstallApp({ onDone }: { onDone?: () => void }) {
  const state = useInstallState();
  if (state === "none") return null;

  const install = () => void promptInstall().then(() => onDone?.());

  return (
    <button type="button" className={MENU_ROW_CLASS} onClick={install}>
      <span className="min-w-0">
        <p className="text-sm font-medium">Install app</p>
        <p className="truncate text-xs text-muted-foreground">Open it like a normal app.</p>
      </span>
      <span className={MENU_ROW_ICON_CLASS}>
        <Download className="size-4" />
      </span>
    </button>
  );
}

/** How long after load the floating card first appears, and how long it stays (it waits while hovered or focused). */
const TOAST_DELAY_MS = 1500;
const TOAST_VISIBLE_MS = 8000;

/**
 * A floating "Install app" card that shows on every visit until the app is installed: it appears a moment after the page
 * loads, stays for a few seconds so the visitor notices it, then hides itself (the header button remains). Nothing is
 * remembered between visits, and it never shows once the app is installed, on a phone/tablet, or where the browser
 * cannot install.
 */
export function InstallToast() {
  const state = useInstallState();
  const [visible, setVisible] = useState(false);
  const [holding, setHolding] = useState(false);
  const offered = state !== "none";

  useEffect(() => {
    if (!offered) return;
    const timer = window.setTimeout(() => setVisible(true), TOAST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [offered]);

  useEffect(() => {
    if (!visible || holding) return;
    const timer = window.setTimeout(() => setVisible(false), TOAST_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [visible, holding]);

  const install = () => void promptInstall().then(() => setVisible(false));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!(visible && offered)}
      onMouseEnter={() => setHolding(true)}
      onMouseLeave={() => setHolding(false)}
      onFocus={() => setHolding(true)}
      onBlur={() => setHolding(false)}
      className={`fixed inset-x-3 z-40 mx-auto flex max-w-xs items-center gap-2 rounded-xl border bg-popover p-2 text-xs text-popover-foreground shadow-lg sm:inset-x-4 sm:max-w-sm sm:gap-3 sm:rounded-2xl sm:p-3 sm:text-sm transition-all duration-300 sm:right-4 sm:left-auto sm:mx-0 ${
        visible && offered ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border bg-background sm:size-9">
        <Download className="size-3.5 sm:size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate font-medium">{site.name} App</p>
        <p className="truncate text-[11px] text-muted-foreground sm:text-xs">One-tap install</p>
      </span>
      <Button size="xs" className="sm:h-8 sm:px-3 sm:text-sm" onClick={install} tabIndex={visible ? 0 : -1}>
        Install
      </Button>
      <Button size="icon-xs" className="sm:size-8" variant="ghost" aria-label="Dismiss" onClick={() => setVisible(false)} tabIndex={visible ? 0 : -1}>
        <X />
      </Button>
    </div>
  );
}
