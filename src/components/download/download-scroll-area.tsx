import type { ComponentProps } from "react";
import { cn } from "cn";
import { ScrollArea } from "@/components/ui/scroll-area";

/** Content-sized download-list viewport with a shared maximum height. */
export function DownloadScrollArea({ children, className, ...props }: ComponentProps<typeof ScrollArea>) {
  return (
    <ScrollArea
      data-download-scroll-area=""
      className={cn("min-h-0 w-full", className)}
      viewportProps={{
        tabIndex: 0,
        role: "region",
        "aria-label": "Download options",
        className: "h-auto max-h-[min(30rem,55dvh)]",
      }}
      {...props}
    >
      <div className="pr-3 pb-1">{children}</div>
    </ScrollArea>
  );
}
