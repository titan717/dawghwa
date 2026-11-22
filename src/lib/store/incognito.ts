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
 *  - localStorage, except the few device preferences in LOCAL_ALLOW
 *    (search history, reader positions, bookmarks and similar are skipped)
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
 * Device preferences that are not reading activity, so they may still be saved
 * while Incognito is on (changing the theme should stick).
 */
export const LOCAL_ALLOW: ReadonlySet<string> = new Set(["dawghwa:settings", "dawghwa:library-view", "dawghwa:entered"]);

/** True when a localStorage write for `key` should go through right now. */
export function canWriteLocal(key: string): boolean {
  return !on || LOCAL_ALLOW.has(key);
}

// ------------------------------------------------------------ localStorage

/*
 * One central guard instead of a check at each call site: while Incognito is
 * on, Storage.prototype.setItem drops writes to localStorage (sessionStorage is
 * untouched; it is already session-scoped). Callers already treat a missing
 * write like blocked storage and keep their value in memory.
 */
let original: Storage["setItem"] | null = null;

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
  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    if (this === localStore() && !canWriteLocal(String(key))) return;
    return orig.call(this, key, value);
  };
}

function unguardLocalStorage() {
  if (!original) return;
  Storage.prototype.setItem = original;
  original = null;
}
