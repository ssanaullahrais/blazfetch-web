import { useEffect } from "react";
import toast, { Toaster, useToasterStore } from "@/lib/toast";
import { useIsMobile } from "@/hooks/use-mobile";

const TOAST_LIMIT = 2;

/** The application's single toast host, kept above routing so every page shows feedback from the same store. */
export function AppToaster() {
  const { toasts } = useToasterStore();
  // A toast on a small screen is more likely to cover something the user needs, so it clears sooner there.
  const isMobile = useIsMobile(1024);

  useEffect(() => {
    toasts
      .filter((item) => item.visible)
      .slice(TOAST_LIMIT)
      .forEach((item) => toast.dismiss(item.id));
  }, [toasts]);

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: isMobile ? 2500 : 4000,
        style: {
          fontSize: 13,
          padding: "8px 12px",
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.25)",
          borderRadius: "var(--radius-lg, 12px)",
          maxWidth: 360,
        },
        success: {
          iconTheme: { primary: "var(--toast-success)", secondary: "var(--popover)" },
        },
        error: {
          iconTheme: { primary: "var(--destructive)", secondary: "var(--popover)" },
        },
      }}
    />
  );
}
