import { isIncognito, localStore, onIncognitoExit } from "./privacy/incognito";

/**
 * A synchronous mirror of the reader's position, for reloads that land before the
 * IndexedDB progress write commits. Keyed by profile so one profile's resume
 * position never shows up for another:
 *
 *   dawghwa.pos.<profileId>.<chapterId> = { page, offset, t }
 *
 * Older builds wrote `dawghwa.pos.<chapterId>` with no owner. Those keys cannot be
 * attributed to a profile, so they are removed rather than guessed at (IndexedDB
 * progress, which is profile-keyed, still restores the position). Keys for profiles
 * that no longer exist are removed the same way.
 *
 * Incognito never writes here: positions live in memory for the session.
 */

export const POS_PREFIX = "dawghwa.pos.";
const MAX_PER_PROFILE = 20;

export interface MirrorPos {
  page: number;
  offset?: number;
  t: number;
}

const memory = new Map<string, MirrorPos>();
const keyOf = (profileId: string, chapterId: string) => `${POS_PREFIX}${profileId}.${chapterId}`;

function parse(raw: string | null): MirrorPos | undefined {
  try {
    const v = JSON.parse(raw ?? "null") as MirrorPos | null;
    return v && typeof v.page === "number" && v.page >= 0 && typeof v.t === "number" ? v : undefined;
  } catch {
    return undefined;
  }
}

export function readPos(profileId: string | undefined, chapterId: string): MirrorPos | undefined {
  if (!profileId) return undefined;
  const k = keyOf(profileId, chapterId);
  return memory.get(k) ?? parse(localStore.get(k));
}

export function writePos(profileId: string | undefined, chapterId: string, page: number, offset?: number) {
  if (!profileId) return;
  const k = keyOf(profileId, chapterId);
  const v: MirrorPos = { page, offset, t: Date.now() };
  if (isIncognito()) {
    memory.set(k, v);
    return;
  }
  // storage full or blocked: IndexedDB progress still applies
  if (!localStore.set(k, JSON.stringify(v))) return;
  // keep the mirror small: this profile's 20 most recent chapters
  const own = localStore.keys().filter((x) => x.startsWith(`${POS_PREFIX}${profileId}.`));
  if (own.length > MAX_PER_PROFILE)
    own
      .map((x) => [x, parse(localStore.get(x))?.t ?? 0] as const)
      .sort((a, b) => a[1] - b[1])
      .slice(0, own.length - MAX_PER_PROFILE)
      .forEach(([x]) => localStore.remove(x));
}

/**
 * Remove legacy unkeyed entries and entries of deleted profiles. Safe to call on
 * every start: it only ever deletes mirror keys.
 */
export function migratePositions(profileIds: string[]): number {
  const known = new Set(profileIds);
  let removed = 0;
  for (const k of localStore.keys()) {
    if (!k.startsWith(POS_PREFIX)) continue;
    const rest = k.slice(POS_PREFIX.length);
    const dot = rest.indexOf(".");
    const owner = dot > 0 ? rest.slice(0, dot) : "";
    if (!known.has(owner)) {
      localStore.remove(k);
      removed++;
    }
  }
  return removed;
}

/** Drop session-only positions (Incognito ended). */
export function clearSessionPositions() {
  memory.clear();
}
onIncognitoExit(clearSessionPositions);
