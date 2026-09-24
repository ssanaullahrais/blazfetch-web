import { useEffect } from "react";
import toast, { Toaster, useToasterStore } from "@/lib/toast";
import { useIsMobile } from "@/hooks/use-mobile";

const TOAST_LIMIT = 2;

/** The application's single toast host. Keeping it above routing makes the
 * homepage, user dashboard, and admin dashboard render feedback from the
 * same shared toast store instead of silently dropping dashboard events. */
export function AppToaster() {
  const { toasts } = useToasterStore();
  // A toast sitting on a small screen is more likely to be blocking
  // something the user needs (the floating Usage button, form fields
  // below it) — it clears a bit sooner there than on desktop.
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
      closeButton
      toastOptions={{
        duration: isMobile ? 2500 : 4000,
        style: { fontSize: 13, padding: "8px 12px" },
        classNames: {
          toast:
            "border-border bg-popover text-popover-foreground shadow-lg dark:bg-popover dark:text-popover-foreground",
          success:
            "border-border bg-popover text-popover-foreground [&_[data-icon]]:text-primary [&_[data-title]]:text-primary",
          error:
            "border-border bg-popover text-popover-foreground [&_[data-icon]]:text-destructive [&_[data-title]]:text-destructive",
          warning:
            "border-border bg-popover text-popover-foreground [&_[data-icon]]:text-primary [&_[data-title]]:text-primary",
          info:
            "border-border bg-popover text-popover-foreground [&_[data-icon]]:text-primary [&_[data-title]]:text-primary",
          loading:
            "border-border bg-popover text-popover-foreground [&_[data-icon]]:text-primary [&_[data-title]]:text-primary",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
