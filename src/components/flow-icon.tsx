import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ClipboardPaste, Download, Link2 } from "lucide-react";

// The whole product in three steps: copy a link, paste it, download.
const STEPS = [
  { Icon: Link2, label: "Copy link", radius: 12 },
  { Icon: ClipboardPaste, label: "Paste", radius: 20 },
  { Icon: Download, label: "Download", radius: 8 },
] as const;

const STEP_MS = 1500;

/** Animated mark beside the heading: cycles copy link, paste and download, in the same ink as the wordmark. */
export function FlowIcon({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const { Icon, label, radius } = STEPS[step];
  return (
    // The box and its icon pop in together on every step, and the box changes its corner radius as it goes.
    <motion.span
      key={step}
      initial={reduceMotion ? false : { scale: 0.65, rotate: -12, opacity: 0.3 }}
      animate={{ scale: 1, rotate: 0, opacity: 1, borderRadius: radius }}
      transition={{ type: "spring", stiffness: 380, damping: 20 }}
      className={`relative inline-flex items-center justify-center border border-border bg-foreground/[0.04] text-foreground ${className ?? ""}`}
      role="img"
      aria-label={label}
    >
      <Icon className="size-[62%]" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </motion.span>
  );
}
