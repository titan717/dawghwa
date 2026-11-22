import { isIncognito } from "@/lib/incognito";

/**
 * Synchronous reader position mirror. It covers reloads that land before the
 * IndexedDB progress write commits. Keys are scoped per profile:
 * `dawghwa.pos.<profileId>.<chapterId>`, at most MAX_PER_PROFILE per profile.
 *
 * Legacy keys (`dawghwa.pos.<chapterId>`, shared by every profile) are never
 * read and are removed on the next write; IndexedDB progress, which was always
 * per profile, still restores those positions.
 *
 * While Incognito is on nothing is written to storage: positions live in memory
 * for the session only.
 */
export interface Pos {
  page: number;
  offset?: number;
  t: number;
}

const PREFIX = "dawghwa.pos.";
export const MAX_PER_PROFILE = 20;
const session = new Map<string, Pos>();
/** Profile ids are crypto.randomUUID(); a scoped key starts with one followed by a dot. */
const SCOPED = /^dawghwa\.pos\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\./i;

const keyFor = (profileId: string, chapterId: string) => `${PREFIX}${profileId}.${chapterId}`;

function parse(raw: string | null): Pos | undefined {
  try {
    const v = JSON.parse(raw ?? "null") as Pos | null;
    return v && typeof v.page === "number" && typeof v.t === "number" ? v : undefined;
  } catch {
    return undefined;
  }
}

export function readPos(profileId: string | undefined, chapterId: string): Pos | undefined {
  if (!profileId) return undefined;
  const k = keyFor(profileId, chapterId);
  const mem = session.get(k);
  let stored: Pos | undefined;
  try {
    stored = parse(localStorage.getItem(k));
  } catch {
    stored = undefined;
  }
  if (mem && (!stored || mem.t >= stored.t)) return mem;
  return stored;
}

export function writePos(profileId: string | undefined, chapterId: string, page: number, offset?: number) {
  if (!profileId) return;
  const k = keyFor(profileId, chapterId);
  const v: Pos = { page, offset, t: Date.now() };
  if (isIncognito()) {
    session.set(k, v);
    return;
  }
  try {
    localStorage.setItem(k, JSON.stringify(v));
    const all = Object.keys(localStorage).filter((x) => x.startsWith(PREFIX));
    // legacy unscoped keys: drop them
    all.filter((x) => !SCOPED.test(x)).forEach((x) => localStorage.removeItem(x));
    // keep this profile's mirror small: the most recent MAX_PER_PROFILE chapters
    const mine = all.filter((x) => x.startsWith(`${PREFIX}${profileId}.`));
    if (mine.length > MAX_PER_PROFILE)
      mine
        .map((x) => [x, parse(localStorage.getItem(x))?.t ?? 0] as const)
        .sort((a, b) => a[1] - b[1])
        .slice(0, mine.length - MAX_PER_PROFILE)
        .forEach(([x]) => localStorage.removeItem(x));
  } catch {
    /* storage full or blocked: IndexedDB progress still applies */
  }
}

/** Tests only. */
export function resetPositionsForTests() {
  session.clear();
}
