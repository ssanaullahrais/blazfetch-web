import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePreferences, type Preferences } from "@/lib/preferences";
import type { DownloadMethod } from "@/lib/preferences";

const METHODS: { value: DownloadMethod; title: string; description: string }[] = [
  {
    value: "auto",
    title: "Automatic",
    description: "Starts instantly. If a video can't be streamed, it is prepared on the server for you.",
  },
  {
    value: "stream",
    title: "Fastest",
    description: "Streams straight through. A few sites can't be streamed and will fail.",
  },
  {
    value: "prepare",
    title: "Compatible MP4",
    description: "Prepared on the server as H.264/AAC so it plays on any device. Takes longer to start.",
  },
  {
    value: "progress",
    title: "With progress bar",
    description: "The server prepares the file first and shows real progress, then it downloads. Slower to start.",
  },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted"
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
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="px-2.5 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Download method</p>
            <div role="radiogroup" aria-label="Download method" className="flex flex-col gap-1">
              {METHODS.map((method) => {
                const selected = prefs.deliveryMode === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set("deliveryMode")(method.value)}
                    className={`rounded-xl border px-2.5 py-2 text-left transition ${
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <p className="text-sm font-medium">{method.title}</p>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-2.5 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Open on</p>
            <div className="grid grid-cols-2 gap-1 px-1">
              {(["video", "audio"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={prefs.defaultMode === mode ? "default" : "outline"}
                  onClick={() => set("defaultMode")(mode)}
                >
                  {mode === "video" ? "Video (MP4)" : "Audio (MP3)"}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <Toggle label="Fetch when I paste a link" checked={prefs.fetchOnPaste} onChange={set("fetchOnPaste")} />
            <Toggle label="Play sounds" checked={prefs.soundEnabled} onChange={set("soundEnabled")} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
