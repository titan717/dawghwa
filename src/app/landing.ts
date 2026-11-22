import { isNative } from "@/lib/platform";
import { localStore } from "@/lib/privacy/incognito";
import type { ProfileRecord } from "@/lib/store/db";
import { isStandalone } from "./install";

/**
 * The landing page greets first-time web visitors at `/`. Everyone else goes straight
 * to the app: readers who pressed "Use in browser" before, readers with an onboarded
 * profile (they used Dawghwa before this page existed), the installed app (its
 * start_url is /?source=pwa) and the native shell. `/start` always shows it.
 */
export const ENTERED_KEY = "dawghwa:entered";

export function hasEntered(): boolean {
  try {
    return localStorage.getItem(ENTERED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markEntered() {
  // private mode or Incognito: the landing shows again next visit, which is harmless
  localStore.set(ENTERED_KEY, "1");
}

export function shouldShowLanding(profile: ProfileRecord | null, search = typeof location !== "undefined" ? location.search : ""): boolean {
  if (isNative() || isStandalone()) return false;
  if (new URLSearchParams(search).get("source") === "pwa") return false;
  if (profile?.onboarded) return false;
  return !hasEntered();
}
