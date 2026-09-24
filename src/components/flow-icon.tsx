import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ClipboardPaste, Download, Link2 } from "lucide-react";

// The whole product in three steps: copy a link, paste it, download.
const STEPS = [
  { Icon: Link2, label: "Copy link", color: "text-violet-500" },
  { Icon: ClipboardPaste, label: "Paste", color: "text-fuchsia-500" },
  { Icon: Download, label: "Download", color: "text-pink-500" },
] as const;

const STEP_MS = 1500;

/** Animated mark beside the heading: cycles copy link, paste and download, so the icon explains what the app does. */
export function FlowIcon({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const { Icon, label, color } = STEPS[step];
  return (
    <span className={`relative inline-flex items-center justify-center ${className ?? ""}`} role="img" aria-label={label}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={step}
          initial={{ opacity: 0, y: 10, scale: 0.7, rotate: -12 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, y: -10, scale: 0.7, rotate: 12 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className={`absolute inset-0 flex items-center justify-center ${color}`}
        >
          <Icon className="size-full" strokeWidth={2.2} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
