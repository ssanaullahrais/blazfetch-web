import { ClipboardPaste, Download, Link2 } from "lucide-react";

// The whole product in three steps: copy a link, paste it, download.
export const FLOW_STEPS = [
  { Icon: Link2, label: "Copy link", radius: 12 },
  { Icon: ClipboardPaste, label: "Paste", radius: 20 },
  { Icon: Download, label: "Download", radius: 8 },
] as const;

export const FLOW_STEP_MS = 1500;
