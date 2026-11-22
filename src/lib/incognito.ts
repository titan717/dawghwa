import { useSyncExternalStore } from "react";

/**
 * Incognito: while on, Dawghwa stops saving reading history, read marks, reader
 * positions, recent searches and recommendation signals for the active profile.
 * Reading still works; positions are kept in memory for this session only.
 *
 * Session-only by design: the switch lives in sessionStorage, so it survives a
 * reload of this tab but turns off when the tab or app is closed. It applies to
 * whichever profile is active in this tab.
 */
const KEY = "dawghwa.incognito";
const listeners = new Set<() => void>();
let on = read();

function read(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function isIncognito(): boolean {
  return on;
}

export function setIncognito(next: boolean) {
  on = next;
  try {
    if (next) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked: stays on in memory for this page */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export function useIncognito(): boolean {
  return useSyncExternalStore(subscribe, isIncognito, isIncognito);
}

/** The honest one-paragraph description shown wherever the switch appears. */
export const INCOGNITO_COPY =
  "Incognito is local to this device. While it's on, Dawghwa stops saving your reading history, read marks, recent searches and recommendation signals for this profile. It turns off when you close this tab or app. It is not encryption and does not hide activity from anyone who owns or manages this device, your browser or your network.";

/** Shown when a read-mark change is refused because Incognito is on. */
export const INCOGNITO_MARKS = "Incognito is on, so read marks aren't changed.";
