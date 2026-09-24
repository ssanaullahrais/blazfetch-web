import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { initTurnstile, loadTurnstileScript, markCheckFailed, markPassLost, submitToken, useTurnstile } from "@/lib/turnstile";

/** How long the background check may run before the widget is shown in full, so the visitor can click it. */
const SHOW_AFTER_MS = 6000;

/**
 * The Cloudflare Turnstile widget, placed below the platform carousel, where the result card appears. It stays out of
 * the way on a normal visit and starts only when the visitor fetches or downloads something. It first runs in the
 * background (interaction only mode): most visitors see nothing. If Cloudflare needs a click, or the check takes longer
 * than a few seconds, the widget is shown here so it can be completed. It renders nothing when the backend has
 * Turnstile turned off.
 */
export function TurnstileWidget() {
  const { status, siteKey } = useTurnstile();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void initTurnstile(API);
  }, []);

  // A check that is taking long is shown in full; a finished or idle one goes back to background mode.
  useEffect(() => {
    if (status !== "needed") {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [status]);

  // Draw the widget when a check is needed (again with the visible look once `visible` turns on).
  useEffect(() => {
    if (status !== "needed" || !siteKey || !container.current) return;
    let cancelled = false;
    void loadTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        if (widgetId.current) {
          turnstile.remove(widgetId.current);
          widgetId.current = null;
        }
        widgetId.current = turnstile.render(container.current, {
          sitekey: siteKey,
          appearance: visible ? "always" : "interaction-only",
          execution: "render",
          size: "flexible",
          theme: "light", // the light widget reads best on both themes
          callback: (token: string) => void submitToken(token),
          "error-callback": () => {
            markCheckFailed();
            return true;
          },
          "expired-callback": () => widgetId.current && turnstile.reset(widgetId.current),
          "timeout-callback": () => widgetId.current && turnstile.reset(widgetId.current),
        });
      })
      .catch(() => markCheckFailed());
    return () => {
      cancelled = true;
    };
  }, [status, siteKey, visible]);

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
    <div className="flex w-full max-w-xl flex-col items-center gap-2" aria-live="polite">
      <div ref={container} className="w-full empty:hidden" />
      {status === "error" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-destructive">The security check could not be completed.</p>
          <Button size="sm" variant="outline" onClick={() => markPassLost()}>
            Try again
          </Button>
        </div>
      )}
      {(status === "needed" || status === "verifying") && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          {status === "verifying" ? "Verifying…" : visible ? "Please complete the check above." : "Checking that you are human…"}
        </p>
      )}
    </div>
  );
}
