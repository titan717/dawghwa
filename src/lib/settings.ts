import { useSyncExternalStore } from "react";
import { kvGet, kvSet } from "./store/db";

/**
 * Device settings (not private reading data). Theme is mirrored to
 * localStorage so the first paint uses the right theme without a flash.
 */

export type ThemePref = "system" | "dark" | "light";
export type ReaderMode = "auto" | "vertical" | "single" | "double";
export type Fit = "width" | "height" | "original";

export interface Settings {
  theme: ThemePref;
  reduceMotion: "system" | "on" | "off";
  readerMode: ReaderMode;
  direction: "rtl" | "ltr";
  fit: Fit;
  autoNext: boolean;
  dataSaver: boolean;
  pageGap: boolean;
  tapZones: boolean;
  /** Show optional milestone achievements on the profile (never shown while reading). */
  achievements: boolean;
  /** Blur covers of titles marked suggestive or adult until the reader opts in. */
  matureCovers: "blur" | "show";
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  reduceMotion: "system",
  readerMode: "auto",
  direction: "rtl",
  fit: "width",
  autoNext: true,
  dataSaver: false,
  pageGap: false,
  tapZones: true,
  achievements: true,
  matureCovers: "blur",
};

let settings: Settings = { ...DEFAULT_SETTINGS, ...readLocal() };
const subs = new Set<() => void>();

function readLocal(): Partial<Settings> {
  try {
    return JSON.parse(localStorage.getItem("dawghwa:settings") ?? "{}") as Partial<Settings>;
  } catch {
    return {};
  }
}

export async function loadSettings() {
  const stored = await kvGet<Partial<Settings>>("settings").catch(() => undefined);
  if (stored) settings = { ...DEFAULT_SETTINGS, ...stored };
  applyTheme();
  subs.forEach((s) => s());
}

export function getSettings() {
  return settings;
}

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem("dawghwa:settings", JSON.stringify(settings));
  } catch {
    /* storage may be unavailable */
  }
  void kvSet("settings", settings).catch(() => undefined);
  applyTheme();
  subs.forEach((s) => s());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => settings,
    () => settings,
  );
}

export function resolvedTheme(): "dark" | "light" {
  if (settings.theme !== "system") return settings.theme;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function reducedMotion(): boolean {
  if (settings.reduceMotion !== "system") return settings.reduceMotion === "on";
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

const BG = { dark: "#171717", light: "#FFFFFF" };

export function applyTheme() {
  if (typeof document === "undefined") return;
  const t = resolvedTheme();
  const root = document.documentElement;
  root.dataset.theme = t;
  root.toggleAttribute("data-reduce-motion", reducedMotion());
  void import("./platform").then((p) => p.setSystemBars(t, BG[t]));
}

if (typeof window !== "undefined") {
  window.matchMedia?.("(prefers-color-scheme: light)").addEventListener?.("change", () => settings.theme === "system" && applyTheme());
}
