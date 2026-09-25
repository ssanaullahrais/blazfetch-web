/** A backend error envelope: { success: false, error: { code, message, details? } }. */
export class ApiError extends Error {
  code: string;
  status: number;
  /** Extra data from the backend. Only MEDIA_UNAVAILABLE carries any (a tombstone). */
  details?: unknown;
  constructor(code: string, message: string, status = 0, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** What the backend remembers about media it has seen before but that is now gone. */
export type Tombstone = {
  platform?: string;
  path?: string | null;
  title?: string | null;
  thumbnail?: string | null;
  /** The error code the source gave: MEDIA_NOT_FOUND (deleted) or PRIVATE_MEDIA. */
  reason?: string | null;
  unavailableSince?: string | null;
  lastSeenAvailable?: string | null;
  sourceUrl?: string | null;
};

/** The tombstone of a MEDIA_UNAVAILABLE error, or null for any other error. */
export function getTombstone(err: unknown): Tombstone | null {
  if (!(err instanceof ApiError) || err.code !== "MEDIA_UNAVAILABLE") return null;
  const details = err.details as { tombstone?: Tombstone } | undefined;
  return details?.tombstone ?? {};
}

/** Builds an ApiError from a parsed backend error body (or a generic one when the body isn't ours). */
export function apiErrorFromBody(body: unknown, status: number): ApiError {
  const error = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
  return new ApiError(error?.code ?? "UNKNOWN", error?.message ?? "Request failed.", status, error?.details);
}

/**
 * Finds a backend error envelope inside text that a browser rendered from a JSON response (used when a
 * download started by navigation fails and the JSON lands in a hidden frame). Tolerates the pretty
 * printing some browsers apply, and returns null for anything that isn't a failure envelope.
 */
export function parseErrorFromText(text: string): { code: string; message: string } | null {
  if (!/"success"\s*:\s*false/.test(text)) return null;
  const code = text.match(/"code"\s*:\s*"([A-Z_]+)"/)?.[1];
  if (!code) return null;
  const rawMessage = text.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "";
  let message = rawMessage;
  try {
    message = JSON.parse(`"${rawMessage}"`) as string;
  } catch {
    // keep the raw text
  }
  return { code, message };
}

/** Friendly wording for every backend error code, so screens never show raw extractor output. */
const MESSAGES: Record<string, string> = {
  UNSUPPORTED_PLATFORM: "This link isn't from a supported site.",
  INVALID_URL: "That doesn't look like a valid link.",
  MEDIA_NOT_FOUND: "That video couldn't be found. It may have been removed, or the link is wrong.",
  MEDIA_UNAVAILABLE: "This video is no longer available.",
  TURNSTILE_REQUIRED: "Please wait a moment while we check that you are human, then try again.",
  TURNSTILE_FAILED: "The security check failed. Reload the page and try again.",
  PRIVATE_MEDIA: "This video is private, so it can't be downloaded.",
  LOGIN_REQUIRED: "This video needs a login, so it can't be downloaded.",
  AGE_RESTRICTED: "This video is age-restricted, so it can't be downloaded.",
  GEO_RESTRICTED: "This video isn't available in this region.",
  EXTRACTOR_FAILED: "We couldn't read this link right now. Please try again in a moment.",
  PLATFORM_RATE_LIMITED: "The site is limiting requests right now. Please try again in a few minutes.",
  DOWNLOAD_FAILED: "The download failed. Please try again, or pick another quality.",
  FORMAT_UNAVAILABLE: "This quality can't be downloaded (it may be copy-protected). Try another one.",
  PROCESS_TIMEOUT: "That took too long. Please try again, or pick a lower quality.",
  FILE_TOO_LARGE: "This file is too large to download here.",
  SERVER_BUSY: "The server is busy or you already have a download running. Try again in a moment.",
  VALIDATION_ERROR: "That request wasn't valid. Please check the link and try again.",
  JOB_NOT_FOUND: "That download is no longer available. Please start it again.",
  NETWORK_ERROR: "The download service could not be reached. Check your connection and try again.",
};

/** Keeps only the first sentence of a message (up to the first ". "), dropping trailing links/instructions. */
export function firstSentence(message: string): string {
  const cleaned = message.trim();
  if (!cleaned) return "";
  const match = cleaned.match(/^[^.!?]*[.!?]/);
  const sentence = (match ? match[0] : cleaned).trim();
  const maxLen = 160;
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen - 1).trimEnd()}…` : sentence;
}

/** Strips yt-dlp's "ERROR: [extractor] id: " prefix so the real reason shows through. */
function cleanRawError(rawMessage: string): string {
  const cleaned = rawMessage
    .replace(/^ERROR:\s*/i, "")
    .replace(/^\[[^\]]+\]\s*[\w-]+:\s*/, "")
    .trim();
  return firstSentence(cleaned);
}

/** Message-based wording, for errors that carry no backend code (network failures, thrown strings). */
export function friendlyError(rawMessage: string): string {
  const msg = rawMessage.toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network error") || msg.includes("load failed")) {
    return MESSAGES.NETWORK_ERROR;
  }
  if (msg.includes("private")) return MESSAGES.PRIVATE_MEDIA;
  if (msg.includes("login required")) return MESSAGES.LOGIN_REQUIRED;
  if (msg.includes("unsupported url") || msg.includes("no extractor")) return MESSAGES.UNSUPPORTED_PLATFORM;
  if (msg.includes("404") || msg.includes("not found")) return MESSAGES.MEDIA_NOT_FOUND;
  if (msg.includes("timed out") || msg.includes("timeout")) return MESSAGES.PROCESS_TIMEOUT;
  if (msg.includes("not available in your country") || /\bgeo/.test(msg)) return MESSAGES.GEO_RESTRICTED;
  return cleanRawError(rawMessage) || "Something went wrong. Please try again.";
}

/**
 * The backend's own request limits answer with PLATFORM_RATE_LIMITED / SERVER_BUSY and "Too many ... requests", which
 * would otherwise read as if YouTube or TikTok were limiting us.
 */
function isOwnRateLimit(err: ApiError): boolean {
  return (err.code === "PLATFORM_RATE_LIMITED" || err.code === "SERVER_BUSY") && /^too many \w+ requests/i.test(err.message);
}

const OWN_RATE_LIMIT = "You're sending requests too quickly. Please wait a minute and try again.";
const SHORT_LINK_FAILED = "This short link couldn't be opened. Paste the full link to the post instead.";
const OFFLINE = "You're offline. Reconnect to the internet and try again.";

/** True only when the browser knows it has no connection (the installed app still opens then). */
function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** The message to show a person for any error: by backend code when there is one, otherwise by wording. */
export function friendlyErrorFor(err: unknown): string {
  const message = messageFor(err);
  return message === MESSAGES.NETWORK_ERROR && isOffline() ? OFFLINE : message;
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError && isOwnRateLimit(err)) return OWN_RATE_LIMIT;
  if (err instanceof ApiError && err.code === "INVALID_URL" && /short link/i.test(err.message)) return SHORT_LINK_FAILED;
  if (err instanceof ApiError && MESSAGES[err.code]) return MESSAGES[err.code];
  if (err instanceof Error) return friendlyError(err.message);
  return "Something went wrong. Please try again.";
}

/** The short toast title for a failed fetch. */
export function errorTitleFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (isOwnRateLimit(err)) return "Slow down";
    if (err.code === "UNSUPPORTED_PLATFORM") return "Not supported";
    if (err.code === "MEDIA_NOT_FOUND" || err.code === "MEDIA_UNAVAILABLE") return "Video not found";
    if (err.code === "PRIVATE_MEDIA" || err.code === "LOGIN_REQUIRED" || err.code === "AGE_RESTRICTED") return "Can't download this";
  }
  if (isOffline()) return "No connection";
  return "Try again later";
}
