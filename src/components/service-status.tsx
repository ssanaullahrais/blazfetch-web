import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getBackendHealth, type BackendHealth } from "@/lib/api";

const REFRESH_MS = 60_000;

/** Header status button fed by GET /health/ready: green when the API, database,
 * yt-dlp and ffmpeg are all up. */
export function ServiceStatus() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      void getBackendHealth().then((h) => {
        if (!cancelled) setHealth(h);
      });
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!health) return null;
  const detail = health.ready ? "Healthy" : "Service unavailable";

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={detail}
          className="relative"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Activity className="size-4" />
          <span
            className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-background ${
              health.ready ? "bg-emerald-500" : "bg-destructive"
            }`}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  );
}
