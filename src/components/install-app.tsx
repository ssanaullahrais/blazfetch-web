import { useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
 * "Install app": the browser's own install dialog where there is one, the Add to Home Screen steps on iPhone/iPad,
 * and nothing at all when the app is already installed or the browser cannot install it.
 * `icon` is the header button; `row` is a row of the phone menu.
 */
export function InstallApp({ variant, onDone }: { variant: "icon" | "row"; onDone?: () => void }) {
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
      {variant === "icon" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Install app" onClick={install}>
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Install app</TooltipContent>
        </Tooltip>
      ) : (
        <button type="button" className={MENU_ROW_CLASS} onClick={install}>
          <span className="min-w-0">
            <p className="text-sm font-medium">Install app</p>
            <p className="truncate text-xs text-muted-foreground">Open it like a normal app.</p>
          </span>
          <span className={MENU_ROW_ICON_CLASS}>
            <Download className="size-4" />
          </span>
        </button>
      )}
      <IosSteps open={stepsOpen} onOpenChange={setStepsOpen} />
    </>
  );
}
