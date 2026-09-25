import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Renders a long list a page at a time: the first cards show immediately, and the next page is added by itself as the visitor
 * scrolls near the end (with a "Show more" button as a fallback), so a profile with a lot of media never makes the page wait
 * for every card. The list starts over from the first page whenever `items` is a different list.
 */
export function ProgressiveList<T>({
  items,
  pageSize = 12,
  children,
}: {
  items: T[];
  pageSize?: number;
  /** Receives the visible slice, always starting at the first item, so indexes match the full list. */
  children: (visible: T[]) => ReactNode;
}) {
  const [count, setCount] = useState(pageSize);
  const [list, setList] = useState(items);
  // A new list (another link was fetched): start again from the first page. Adjusted during render, as React recommends.
  if (list !== items) {
    setList(items);
    setCount(pageSize);
  }

  const sentinel = useRef<HTMLDivElement | null>(null);
  const remaining = items.length - count;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || remaining <= 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setCount((current) => Math.min(items.length, current + pageSize));
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [remaining, items.length, pageSize, count]);

  return (
    <>
      {children(items.slice(0, count))}
      {remaining > 0 && (
        <div ref={sentinel}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 w-full text-xs"
            onClick={() => setCount((current) => Math.min(items.length, current + pageSize))}
          >
            Show more ({remaining} left)
          </Button>
        </div>
      )}
    </>
  );
}
