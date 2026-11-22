import { useSyncExternalStore } from "react";

/**
 * Incognito: a session-only switch that stops this profile from keeping a
 * record of what is read while it is on.
 *
 * The flag lives in memory only. It is never written to localStorage or
 * IndexedDB, so closing or reloading the app always ends it.
 *
 * While it is on, the store layer skips every write that records activity:
 *  - progress / history / Continue reading (store/user.ts saveProgress, markChaptersRead)
 *  - the event log, which is what rewards (XP, quests, achievements) and the
 *    recommender learn from (store/user.ts signal)
 *  - the learned model (intel/runtime.ts retrain) and reward moments (rewards/runtime.ts)
 *  - chapter comments (lib/comments.ts)
 *  - localStorage keys that record reading activity, listed in LOCAL_DENY_PREFIXES
 *    (reader positions and search history). Everything else, such as settings and
 *    deliberate edits like bookmarks, still saves, the same as library edits.
 *
 * Reading, browsing and explicit library edits keep working. This is not a
 * privacy or anonymity feature beyond that: network requests still happen and
 * nothing is encrypted.
 */

let on = false;
const subs = new Set<() => void>();

export function isIncognito(): boolean {
  return on;
}

export function setIncognito(next: boolean): void {
  if (next === on) return;
  on = next;
  if (on) guardLocalStorage();
  else unguardLocalStorage();
  subs.forEach((s) => s());
}

export function subscribeIncognito(fn: () => void): () => void {
  subs.add(fn);
  return () => void subs.delete(fn);
}

export function useIncognito(): boolean {
  return useSyncExternalStore(subscribeIncognito, isIncognito, isIncognito);
}

/**
 * localStorage keys that record reading activity and so are skipped while
 * Incognito is on. An explicit denylist: unknown keys (preferences, deliberate
 * edits such as bookmarks, device caches) keep saving, so nothing a reader
 * chose to save silently disappears on reload. Add new activity keys here.
 */
export const LOCAL_DENY_PREFIXES: readonly string[] = ["dawghwa.pos.", "dawghwa:recent-searches:", "dawghwa:recent-search:"];

/** True when a localStorage write for `key` should go through right now. */
export function canWriteLocal(key: string): boolean {
  return !on || !LOCAL_DENY_PREFIXES.some((p) => key.startsWith(p));
}

// ------------------------------------------------------------ localStorage

/*
 * One central guard instead of a check at each call site: while Incognito is
 * on, Storage.prototype.setItem drops writes to localStorage (sessionStorage is
 * untouched; it is already session-scoped). Callers already treat a missing
 * write like blocked storage and keep their value in memory.
 */
let original: Storage["setItem"] | null = null;
let guard: Storage["setItem"] | null = null;

function localStore(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function guardLocalStorage() {
  if (original || typeof Storage === "undefined") return;
  const orig = Storage.prototype.setItem;
  original = orig;
  guard = function (this: Storage, key: string, value: string) {
    if (this === localStore() && !canWriteLocal(String(key))) return;
    return orig.call(this, key, value);
  };
  Storage.prototype.setItem = guard;
}

function unguardLocalStorage() {
  if (!original) return;
  // Only undo our own patch; if something wrapped setItem after us, leave its wrapper in place.
  if (Storage.prototype.setItem === guard) Storage.prototype.setItem = original;
  original = null;
  guard = null;
}
