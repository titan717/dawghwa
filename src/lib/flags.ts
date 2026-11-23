/**
 * App feature flags (MASTER_PROMPT section 3).
 *
 * On at build time with `VITE_FEATURE_<NAME>=1` (each variable is referenced literally
 * so Vite can inline it). Production builds ignore every runtime override.
 *
 * Non-production builds (dev, and preview builds made with VITE_ALLOW_FLAG_OVERRIDES=1
 * for e2e) accept `?ff=offline,comments` to turn flags on and `?ff=-offline` to turn
 * them off. The choice is kept for the tab in sessionStorage so it survives navigation.
 */

export type Flag = "FEATURE_ACCOUNTS" | "FEATURE_ANDROID_RELEASE" | "FEATURE_COMMENTS" | "FEATURE_OFFLINE" | "FEATURE_SHARE_CARDS";

const env = import.meta.env;

const BUILD: Record<Flag, boolean> = {
  FEATURE_ACCOUNTS: env.VITE_FEATURE_ACCOUNTS === "1",
  /** Landing shows "Get the Android app" only after an APK release is published. */
  FEATURE_ANDROID_RELEASE: env.VITE_FEATURE_ANDROID_RELEASE === "1",
  FEATURE_COMMENTS: env.VITE_FEATURE_COMMENTS === "1",
  FEATURE_OFFLINE: env.VITE_FEATURE_OFFLINE === "1",
  FEATURE_SHARE_CARDS: env.VITE_FEATURE_SHARE_CARDS === "1",
};

const FLAGS = Object.keys(BUILD) as Flag[];
const SESSION_KEY = "dawghwa:ff";

/** True only outside production, or in a preview build explicitly made for tests. */
export const overridesAllowed = (): boolean => !env.PROD || env.VITE_ALLOW_FLAG_OVERRIDES === "1";

/** Parse `offline,-comments` into overrides. Unknown names are ignored. Pure, for tests. */
export function parseOverrides(raw: string | null | undefined): Partial<Record<Flag, boolean>> {
  const out: Partial<Record<Flag, boolean>> = {};
  for (const part of (raw ?? "").split(",")) {
    const p = part.trim().toLowerCase();
    if (!p) continue;
    const off = p.startsWith("-");
    const name = `FEATURE_${(off ? p.slice(1) : p).replace(/^feature_/, "").toUpperCase()}` as Flag;
    if (FLAGS.includes(name)) out[name] = !off;
  }
  return out;
}

let cache: Partial<Record<Flag, boolean>> | null = null;

function overrides(): Partial<Record<Flag, boolean>> {
  if (cache) return cache;
  cache = {};
  if (!overridesAllowed() || typeof window === "undefined") return cache;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("ff");
    if (fromUrl !== null) sessionStorage.setItem(SESSION_KEY, fromUrl);
    cache = parseOverrides(fromUrl ?? sessionStorage.getItem(SESSION_KEY));
  } catch {
    // storage blocked: overrides are best effort
  }
  return cache;
}

/** Is this feature on? Stable for the page's lifetime. */
export function flag(name: Flag): boolean {
  return overrides()[name] ?? BUILD[name];
}

/** Test helper: re-read overrides on the next call. */
export function resetFlagsForTests() {
  cache = null;
}
