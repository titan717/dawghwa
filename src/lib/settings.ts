import { useSyncExternalStore } from "react";
import { kvGet, kvSet } from "./store/db";

/**
 * Device settings (not private reading data). Theme is mirrored to
 * localStorage so the first paint uses the right theme without a flash.
 */

export type ThemePref = "system" | "dark" | "light";

export interface Settings {
  theme: ThemePref;
  reduceMotion: "system" | "on" | "off";
  /** The reader is scroll-only (D8): older layout, direction, fit, gap and tap-zone settings are dropped on load. */
  autoNext: boolean;
  dataSaver: boolean;
  /**
   * Profile > Rewards. Off hides every gamified surface: the Awards tab, XP, levels,
   * quests, badges, progress rings and reward beats. Nothing is deleted; it is all derived.
   */
  rewards: boolean;
  /** Blur covers of titles marked suggestive or adult until the reader opts in. */
  matureCovers: "blur" | "show";
  /** Discover grid density: cover-forward (big art) or compact (more per row). */
  gridDensity: "covers" | "compact";
  /** Reader strip width on tablets and desktop (D65). Phones always use the full width. */
  readerWidth: "fit" | "comfortable" | "narrow";
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  reduceMotion: "system",
  autoNext: true,
  dataSaver: false,
  rewards: true,
  matureCovers: "blur",
  gridDensity: "covers",
  readerWidth: "comfortable",
};

/** Older builds stored `achievements` (milestones on/off); it becomes `rewards`. */
const RETIRED = ["readerMode", "direction", "fit", "pageGap", "tapZones"] as const;
export function migrateSettings(raw: Partial<Settings> & { achievements?: boolean }): Partial<Settings> {
  const { achievements, ...rest } = raw as Partial<Settings> & { achievements?: boolean } & Record<string, unknown>;
  for (const k of RETIRED) delete (rest as Record<string, unknown>)[k];
  if (rest.rewards === undefined && typeof achievements === "boolean") rest.rewards = achievements;
  return rest;
}

let settings: Settings = { ...DEFAULT_SETTINGS, ...migrateSettings(readLocal()) };
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
  if (stored) settings = { ...DEFAULT_SETTINGS, ...migrateSettings(stored) };
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

const BG = { dark: "#151519", light: "#F5F0E7" };

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
