import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { promptInstall, useInstallState } from "@/lib/pwa-install";
import { site } from "@/config/site";

/** iPhone/iPad Safari cannot show an install prompt, so the steps are shown instead. */
function IosSteps({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Install {site.name}</DialogTitle>
          <DialogDescription>Add it to your Home Screen to open it like an app.</DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border">
              <Share className="size-4" />
            </span>
            <span>
              Tap <strong>Share</strong> in Safari&apos;s toolbar.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border">
              <SquarePlus className="size-4" />
            </span>
            <span>
              Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}

const MENU_ROW_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-2xl border bg-card/60 p-3 text-left transition hover:bg-card/80";
const MENU_ROW_ICON_CLASS =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background";

/**
 * "Install app" row of the phone menu: the browser's own install dialog where there is one, the Add to Home Screen
 * steps on iPhone/iPad, and nothing at all when the app is already installed or the browser cannot install it.
 * (The floating card below is the main prompt; this row is the way back after it has hidden.)
 */
export function InstallApp({ onDone }: { onDone?: () => void }) {
  const state = useInstallState();
  const [stepsOpen, setStepsOpen] = useState(false);
  if (state === "none") return null;

  const install = () => {
    if (state === "ios") {
      setStepsOpen(true);
      return;
    }
    void promptInstall().then(() => onDone?.());
  };

  return (
    <>
      <button type="button" className={MENU_ROW_CLASS} onClick={install}>
        <span className="min-w-0">
          <p className="text-sm font-medium">Install app</p>
          <p className="truncate text-xs text-muted-foreground">Open it like a normal app.</p>
        </span>
        <span className={MENU_ROW_ICON_CLASS}>
          <Download className="size-4" />
        </span>
      </button>
      <IosSteps open={stepsOpen} onOpenChange={setStepsOpen} />
    </>
  );
}

/** How long after load the floating card first appears, and how long it stays (it waits while hovered or focused). */
const TOAST_DELAY_MS = 1500;
const TOAST_VISIBLE_MS = 8000;

/**
 * A floating "Install app" card that shows on every visit until the app is installed: it appears a moment after the page
 * loads, stays for a few seconds so the visitor notices it, then hides itself (the header button remains). Nothing is
 * remembered between visits, and it never shows once the app is installed or where the browser cannot install.
 */
export function InstallToast() {
  const state = useInstallState();
  const [visible, setVisible] = useState(false);
  const [holding, setHolding] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
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

  const install = () => {
    if (state === "ios") {
      setStepsOpen(true);
      setVisible(false);
      return;
    }
    void promptInstall().then(() => setVisible(false));
  };

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-hidden={!(visible && offered)}
        onMouseEnter={() => setHolding(true)}
        onMouseLeave={() => setHolding(false)}
        onFocus={() => setHolding(true)}
        onBlur={() => setHolding(false)}
        className={`fixed inset-x-4 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg transition-all duration-300 sm:right-4 sm:left-auto sm:mx-0 ${
          visible && offered ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border bg-background">
          <Download className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <p className="truncate font-medium">Install app</p>
          <p className="truncate text-xs text-muted-foreground">One-tap access</p>
        </span>
        <Button size="sm" onClick={install} tabIndex={visible ? 0 : -1}>
          Install
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Dismiss" onClick={() => setVisible(false)} tabIndex={visible ? 0 : -1}>
          <X />
        </Button>
      </div>
      <IosSteps open={stepsOpen} onOpenChange={setStepsOpen} />
    </>
  );
}
