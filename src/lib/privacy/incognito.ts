import { useSyncExternalStore } from "react";

/**
 * Incognito: local-data privacy for one browser tab or app session.
 *
 * While it is on, Dawghwa keeps this session's activity in memory only. It writes
 * nothing to IndexedDB (history, progress, library, comments, recommender events and
 * model, title and query caches) and nothing to localStorage. Deleting data you
 * already have (removing a history entry, clearing history) still works, because
 * that only reduces what is stored.
 *
 * What it is NOT: it is not encryption, it does not hide anything from someone who
 * controls this device (the browser, OS or a debugger can still see the session),
 * and it is not network anonymity: providers and the Dawghwa API still see requests
 * from your IP address, as they do normally.
 *
 * The flag itself lives in sessionStorage (never localStorage), so a reload keeps
 * Incognito on and closing the tab or app ends it.
 */

const SESSION_KEY = "dawghwa:incognito";

function readFlag(): boolean {
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

let on = readFlag();
const subs = new Set<() => void>();
const exitHooks = new Set<() => void | Promise<void>>();

export function isIncognito(): boolean {
  return on;
}

export function subscribeIncognito(fn: () => void) {
  subs.add(fn);
  return () => void subs.delete(fn);
}

export function useIncognito(): boolean {
  return useSyncExternalStore(subscribeIncognito, isIncognito, isIncognito);
}

/**
 * Run `fn` when Incognito turns off, so in-memory session state is dropped and
 * stores reload what was really saved. Returns an unregister function.
 */
export function onIncognitoExit(fn: () => void | Promise<void>) {
  exitHooks.add(fn);
  return () => void exitHooks.delete(fn);
}

function reflect() {
  if (typeof document !== "undefined") document.documentElement.toggleAttribute("data-incognito", on);
}
reflect();

export async function setIncognito(next: boolean): Promise<void> {
  if (next === on) return;
  on = next;
  try {
    if (next) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* sessionStorage blocked: the flag lasts until reload */
  }
  reflect();
  subs.forEach((s) => s());
  if (!next) await Promise.all([...exitHooks].map((h) => Promise.resolve(h()).catch(() => undefined)));
}

export const toggleIncognito = () => setIncognito(!on);

/** Test helper. */
export function resetIncognitoForTests() {
  on = false;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  reflect();
}

/**
 * The only way app code should write localStorage. Writes are dropped while
 * Incognito is on; removals always go through (they only reduce stored data).
 */
export const localStore = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    if (on) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },
};
