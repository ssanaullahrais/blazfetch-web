import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePreferences, type Preferences } from "@/lib/preferences";

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

/** The preferences themselves; shown in a popover on desktop and a bottom drawer on small screens. */
function SettingsPanel() {
  const { prefs, update } = usePreferences();
  const set = <K extends keyof Preferences>(key: K) => (value: Preferences[K]) => update(key, value);

  return (
    <>
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
        label="Video: smallest first"
        checked={prefs.sortVideoBySmallestSize}
        onChange={set("sortVideoBySmallestSize")}
      />
    </>
  );
}

/** Header settings: which tab opens first, and a few conveniences. Delivery is always handled automatically
 * by the backend (stream when possible, prepare a compatible file otherwise) — there is nothing to pick. */
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
            <SettingsPanel />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-2">
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Preferences</p>
        <SettingsPanel />
      </PopoverContent>
    </Popover>
  );
}
