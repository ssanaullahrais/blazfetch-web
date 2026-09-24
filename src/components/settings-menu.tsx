import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePreferences, type Preferences } from "@/lib/preferences";
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
    description: "Streams straight through. A few sites can't be streamed.",
  },
  {
    value: "prepare",
    title: "Compatible MP4",
    description: "H.264/AAC MP4 that plays anywhere. Slower to start.",
  },
  {
    value: "progress",
    title: "With progress bar",
    description: "Shows real progress while the server prepares the file.",
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

/** Header settings: how downloads are delivered, which tab opens first, and a few conveniences. */
export function SettingsMenu() {
  const { prefs, update } = usePreferences();
  const set = <K extends keyof Preferences>(key: K) => (value: Preferences[K]) => update(key, value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Settings">
          <Settings2 className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-0 p-2">
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Download method</p>
        <div role="radiogroup" aria-label="Download method" className="flex flex-col">
          {METHODS.map((method) => {
            const selected = prefs.deliveryMode === method.value;
            return (
              <button
                key={method.value}
                type="button"
                role="radio"
                aria-checked={selected}
                title={method.description}
                onClick={() => set("deliveryMode")(method.value)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span
                  className={`size-3.5 shrink-0 rounded-full border ${
                    selected ? "border-4 border-primary" : "border-muted-foreground/40"
                  }`}
                />
                {method.title}
              </button>
            );
          })}
        </div>
        <p className="px-2 pb-1 pt-1.5 text-xs leading-snug text-muted-foreground">
          {METHODS.find((m) => m.value === prefs.deliveryMode)?.description}
        </p>

        <div className="my-1.5 h-px bg-border" />
        <div className="flex items-center justify-between gap-2 px-2 py-1 text-sm">
          <span>Open on</span>
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
      </PopoverContent>
    </Popover>
  );
}
