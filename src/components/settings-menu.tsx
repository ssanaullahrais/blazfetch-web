import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { ENABLED_DOWNLOAD_METHODS, usePreferences, type Preferences } from "@/lib/preferences";
import type { DownloadMethod } from "@/lib/preferences";

const METHODS: { value: DownloadMethod; title: string; description: string }[] = [
  {
    value: "auto",
    title: "Automatic",
    description: "Starts instantly; prepares on the server if streaming isn't possible.",
  },
  {
    value: "stream",
    title: "Fastest",
    description: "Quickest route to a file that plays anywhere: streams when it can, otherwise a quick server merge.",
  },
  {
    value: "prepare",
    title: "Compatible",
    description: "H.264/AAC MP4 that plays anywhere. Slower to start.",
  },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
    >
      <span>{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`inline-block size-4 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/** One download-method option. Hover tooltips are for the desktop popover only: touch has no hover. */
function MethodOption({
  method,
  selected,
  onSelect,
  tooltip,
}: {
  method: (typeof METHODS)[number];
  selected: boolean;
  onSelect: () => void;
  tooltip: boolean;
}) {
  const button = (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
    >
      <span
        className={`size-3.5 shrink-0 rounded-full border ${
          selected ? "border-4 border-primary" : "border-muted-foreground/40"
        }`}
      />
      {method.title}
    </button>
  );
  if (!tooltip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-56">
        {method.description}
      </TooltipContent>
    </Tooltip>
  );
}

/** The preferences themselves; shown in a popover on desktop and a bottom drawer on small screens. */
function SettingsPanel({ tooltips }: { tooltips: boolean }) {
  const { prefs, update } = usePreferences();
  const set = <K extends keyof Preferences>(key: K) => (value: Preferences[K]) => update(key, value);
  // Only the methods switched on in VITE_DOWNLOAD_METHODS are offered; with a single one there is nothing to choose.
  const methods = METHODS.filter((m) => (ENABLED_DOWNLOAD_METHODS as DownloadMethod[]).includes(m.value));
  const chooseMethod = methods.length > 1;

  return (
    <>
      {chooseMethod && (
        <>
          <div role="radiogroup" aria-label="Download method" className="flex flex-col">
            {methods.map((method) => (
              <MethodOption
                key={method.value}
                method={method}
                selected={prefs.deliveryMode === method.value}
                onSelect={() => set("deliveryMode")(method.value)}
                tooltip={tooltips}
              />
            ))}
          </div>
          <p className="px-2 pb-1 pt-1.5 text-xs leading-snug text-muted-foreground">
            {METHODS.find((m) => m.value === prefs.deliveryMode)?.description}
          </p>
          <div className="my-1.5 h-px bg-border" />
        </>
      )}
      <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
        <span>Default Tab</span>
        <div className="flex gap-1">
          {(["video", "audio"] as const).map((mode) => (
            <Button
              key={mode}
              size="xs"
              variant={prefs.defaultMode === mode ? "default" : "outline"}
              onClick={() => set("defaultMode")(mode)}
            >
              {mode === "video" ? "Video" : "Audio"}
            </Button>
          ))}
        </div>
      </div>
      <Toggle label="Fetch on paste" checked={prefs.fetchOnPaste} onChange={set("fetchOnPaste")} />
      <Toggle label="Sounds" checked={prefs.soundEnabled} onChange={set("soundEnabled")} />
      <Toggle
        label="Audio: MP3 first"
        checked={prefs.sortAudioByCompatibility}
        onChange={set("sortAudioByCompatibility")}
      />
      <Toggle
        label="Video: by size"
        checked={prefs.sortVideoBySmallestSize}
        onChange={set("sortVideoBySmallestSize")}
      />
    </>
  );
}

/** Header settings: how downloads are delivered, which tab opens first, and a few conveniences. */
export function SettingsMenu() {
  const isMobile = useIsMobile();
  const trigger = (
    <Button variant="outline" size="icon" aria-label="Settings">
      <Settings2 className="size-4" />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="px-2 pb-1 text-left">
            <DrawerTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Preferences
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col overflow-y-auto pb-4">
            <SettingsPanel tooltips={false} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      {/* Not focusing the first option on open keeps its tooltip from popping up by itself. */}
      <PopoverContent align="end" className="w-64 gap-0 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Preferences</p>
        <SettingsPanel tooltips />
      </PopoverContent>
    </Popover>
  );
}
