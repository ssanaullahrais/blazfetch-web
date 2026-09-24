import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

const TRIGGER_DISTANCE = 72; // px of pull needed to refresh
const MAX_PULL = 110;
const RESISTANCE = 0.5; // the indicator moves half as far as the finger, like native apps

/** True when the touch started inside something that is scrolled down, where a downward drag must scroll instead. */
function insideScrolledContainer(start: EventTarget | null): boolean {
  let node = start instanceof HTMLElement ? start : null;
  while (node && node !== document.body) {
    if (node.scrollTop > 0) return true;
    node = node.parentElement;
  }
  return window.scrollY > 0;
}

/**
 * Pull down from the top of the page (touch screens only) to refresh: a circular loader follows the finger,
 * and letting go past the threshold calls `onRefresh`.
 */
export function PullToRefresh({ onRefresh }: { onRefresh: () => void }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busy = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (busy.current || e.touches.length !== 1 || insideScrolledContainer(e.target)) return;
      startY.current = e.touches[0].clientY;
      setDragging(true);
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null || busy.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // Once the page has scrolled meanwhile, hand the gesture back to normal scrolling.
      if (insideScrolledContainer(e.target)) {
        startY.current = null;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      pullRef.current = Math.min(dy * RESISTANCE, MAX_PULL);
      setPull(pullRef.current);
    };
    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      setDragging(false);
      if (pullRef.current >= TRIGGER_DISTANCE * RESISTANCE + 16) {
        busy.current = true;
        setRefreshing(true);
        setPull(TRIGGER_DISTANCE * RESISTANCE + 16);
        window.setTimeout(onRefresh, 700);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh]);

  if (pull <= 0 && !refreshing) return null;
  const progress = Math.min(pull / (TRIGGER_DISTANCE * RESISTANCE + 16), 1);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ transform: `translateY(${pull - 8}px)`, transition: dragging ? "none" : "transform 200ms ease" }}
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-border bg-popover text-foreground shadow-lg">
        {refreshing ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <RefreshCw className="size-4" style={{ opacity: 0.4 + progress * 0.6, transform: `rotate(${progress * 270}deg)` }} />
        )}
      </div>
    </div>
  );
}
