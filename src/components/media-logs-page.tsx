import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMediaLogs, type MediaLogAttempt } from "@/lib/api";
import { ApiError, friendlyErrorFor } from "@/lib/errors";

const LEVEL_CLASS: Record<string, string> = {
  error: "text-red-500",
  warn: "text-amber-500",
  info: "text-muted-foreground",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * GET /:platform/:id/logs — lets a visitor look back at their own recent download attempts for one piece of
 * media, so a stuck or failed download shows the real reason instead of just a generic toast. Only ever shows
 * attempts started by this same browser (the backend checks the guest/user cookie), and only for a short while
 * after they happened — see the backend's downloadLogs service.
 */
export function MediaLogsPage() {
  const { platform, id } = useParams<{ platform: string; id: string }>();
  const [attempts, setAttempts] = useState<MediaLogAttempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!platform || !id) return;
    let cancelled = false;
    getMediaLogs(platform, id)
      .then((data) => {
        if (!cancelled) setAttempts(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError && err.code === "MEDIA_NOT_FOUND" ? "No recent download attempt from this browser was found for this media." : friendlyErrorFor(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [platform, id]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <Link to={platform && id ? `/${platform}/${id}` : "/"} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="text-lg font-semibold">Download logs</h1>
      <p className="text-sm text-muted-foreground">
        Your own recent download attempts for this media, if any are still on record. Nobody else can see this.
      </p>

      {loading && (
        <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && error && (
        <Card className="p-4 text-sm text-muted-foreground">{error}</Card>
      )}

      {!loading &&
        attempts?.map((attempt) => (
          <Card key={attempt.requestId} className="overflow-hidden p-0">
            <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              Started {new Date(attempt.startedAt).toLocaleString()}
            </div>
            <div className="flex flex-col gap-1 p-4 font-mono text-xs">
              {attempt.lines.length === 0 ? (
                <span className="text-muted-foreground">Still running — no events yet.</span>
              ) : (
                attempt.lines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0 text-muted-foreground">{formatTime(line.ts)}</span>
                    <span className={LEVEL_CLASS[line.level] ?? ""}>{line.message}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        ))}

      {!loading && !error && attempts && (
        <Button asChild variant="outline" className="self-start">
          <Link to={platform && id ? `/${platform}/${id}` : "/"}>Back to media</Link>
        </Button>
      )}
    </div>
  );
}
