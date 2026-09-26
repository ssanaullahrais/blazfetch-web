import { useSyncExternalStore } from "react";
import type { FilenameStyle } from "./api";

export type Preferences = {
  defaultMode: "video" | "audio";
  preferredQuality: "best" | "1080" | "720" | "480" | "360";
  fetchOnPaste: boolean;
  autoDownloadBest: boolean;
  soundEnabled: boolean;
  filenameStyle: FilenameStyle;
  disableMetadata: boolean;
  /** Off (default): the audio tab sorts by bitrate, highest first. On: MP3 first, then WEBM, then everything
   * else, each tier still by bitrate — the source's own quality mix doesn't always put the most broadly
   * playable format at the top. */
  sortAudioByCompatibility: boolean;
  /** Off (default): the video tab sorts by quality, highest resolution first (unaffected by this setting).
   * On: the same rows, smallest file size first — an unknown size (yt-dlp can't always report one up front) sorts last
   * either way. "Best quality" still always means the true highest-resolution pick, whichever is on top. */
  sortVideoBySmallestSize: boolean;
};

// Defaults for a fresh visitor; anything they change is stored as an override.
const HARDCODED_DEFAULTS: Preferences = {
  defaultMode: "video",
  preferredQuality: "best",
  fetchOnPaste: true,
  autoDownloadBest: false,
  soundEnabled: true,
  filenameStyle: "basic",
  disableMetadata: false,
  sortAudioByCompatibility: false,
  sortVideoBySmallestSize: false,
};

const STORAGE_KEY = "media-downloader:preferences";

/** Only the fields this visitor has explicitly changed — never the full
 * merged object. This is what actually makes "admin sets a default, but a
 * visitor's own change always wins" work: a brand-new visitor has no
 * overrides at all, so `effective` below is 100% the admin's current
 * default; anyone who's ever changed a field here (including everyone who
 * used this app before this override model existed — their old full saved
 * blob just becomes their overrides for every field, so nothing changes for
 * them) keeps exactly what they chose regardless of what the admin default
 * later becomes. */
function loadOverrides(): Partial<Preferences> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw);
    const legacyMode =
      saved.downloadFormat === "mp3" ? "audio" : saved.downloadFormat === "mp4" ? "video" : undefined;
    const { downloadFormat: _legacyDownloadFormat, ...rest } = saved;
    void _legacyDownloadFormat;
    return { ...rest, ...(legacyMode ? { defaultMode: legacyMode } : {}) };
  } catch {
    return {};
  }
}

const serverDefaults: Preferences = HARDCODED_DEFAULTS;
let overrides: Partial<Preferences> = loadOverrides();
let state: Preferences = { ...serverDefaults, ...overrides };
const listeners = new Set<() => void>();

function recompute() {
  state = { ...serverDefaults, ...overrides };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePreferences() {
  const prefs = useSyncExternalStore(subscribe, () => state);

  // Only ever writes the ONE changed key into `overrides` — never the full
  // merged state — so every other field stays free to follow the admin
  // default (present or future) until this visitor explicitly changes it too.
  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    overrides = { ...overrides, [key]: value };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    recompute();
  }

  return { prefs, update };
}
