import { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { API } from "@/lib/api";
import { initTurnstile, loadTurnstileScript, submitToken, useTurnstile } from "@/lib/turnstile";

/**
 * The Cloudflare Turnstile widget, placed below the platform carousel, where the result card appears. It stays out of
 * the way on a normal visit and starts only when the visitor fetches or downloads something. It then runs in the
 * background (interaction only mode): most visitors see nothing, and a small checkbox appears in this spot only when
 * Cloudflare needs one. It renders nothing when the backend has Turnstile turned off.
 */
export function TurnstileWidget() {
  const { status, siteKey } = useTurnstile();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    void initTurnstile(API);
  }, []);

  // Render the widget when a check is needed; reset it when the pass is lost again.
  useEffect(() => {
    if (status !== "needed" || !siteKey || !container.current) return;
    let cancelled = false;
    void loadTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        if (widgetId.current) {
          turnstile.reset(widgetId.current);
          return;
        }
        widgetId.current = turnstile.render(container.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          execution: "render",
          size: "flexible",
          theme: "light", // the light widget reads best on both themes
          callback: (token: string) => void submitToken(token),
          "expired-callback": () => widgetId.current && turnstile.reset(widgetId.current),
          "timeout-callback": () => widgetId.current && turnstile.reset(widgetId.current),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status, siteKey]);

  useEffect(
    () => () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    },
    [],
  );

  // Nothing is drawn on a normal visit: the check starts only when the visitor fetches or downloads something.
  if (status === "off" || status === "unknown" || status === "idle") return null;
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-1.5" aria-live="polite">
      <div ref={container} className="w-full empty:hidden" />
      {status === "error" && (
        <p className="text-xs text-destructive">The security check could not be completed. Reload the page and try again.</p>
      )}
      {(status === "needed" || status === "verifying") && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          {status === "verifying" ? "Verifying…" : "Checking that you are human…"}
        </p>
      )}
    </div>
  );
}
