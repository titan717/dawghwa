/**
 * Fast-path mirror of the reader position, per profile and per chapter, in localStorage.
 *
 * IndexedDB progress (src/lib/store/user.ts, keyed by profileId + titleKey) is the source of
 * truth for the title's current chapter. This mirror exists because a reload can land before
 * the IndexedDB write commits, and because IndexedDB keeps only the latest chapter per title.
 *
 * Keys are `dawghwa.pos.<profileId>.<hash>` where <hash> is an FNV-1a (base36) digest of the
 * chapter id, so keys never carry the ids they were derived from. Legacy unscoped keys
 * (`dawghwa.pos.<chapterId>`) are neither read (they can't be attributed to a profile) nor
 * pruned (older builds still read them).
 */

export interface StoredPos {
  page: number;
  offset?: number;
  t: number;
}

export const POS_PREFIX = "dawghwa.pos.";
/** How many chapters each profile keeps in the mirror. */
export const POS_LIMIT = 20;

/** 32-bit FNV-1a, rendered base36. Stable, short and not reversible to the input. */
export function hashChapterId(chapterId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < chapterId.length; i++) {
    h ^= chapterId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function profilePrefix(profileId: string): string {
  return `${POS_PREFIX}${profileId}.`;
}

export function posKey(profileId: string, chapterId: string): string {
  return profilePrefix(profileId) + hashChapterId(chapterId);
}

function parse(raw: string | null): StoredPos | undefined {
  try {
    const v = JSON.parse(raw ?? "null");
    return v && typeof v.page === "number" && typeof v.t === "number" ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Is this a new-format key belonging to the profile? (profile prefix + one base36 hash segment) */
function ownsKey(key: string, profileId: string): boolean {
  const pre = profilePrefix(profileId);
  return key.startsWith(pre) && /^[0-9a-z]{1,7}$/.test(key.slice(pre.length));
}

export function readPos(profileId: string | undefined, chapterId: string | undefined): StoredPos | undefined {
  if (!profileId || !chapterId) return undefined;
  try {
    return parse(localStorage.getItem(posKey(profileId, chapterId)));
  } catch {
    return undefined;
  }
}

/** Drop all but the `limit` most recent new-format entries of one profile. Legacy keys are left alone. */
export function prunePos(profileId: string, limit = POS_LIMIT): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && ownsKey(k, profileId)) keys.push(k);
    }
    if (keys.length <= limit) return;
    keys
      .map((k) => [k, parse(localStorage.getItem(k))?.t ?? 0] as const)
      .sort((a, b) => a[1] - b[1])
      .slice(0, keys.length - limit)
      .forEach(([k]) => localStorage.removeItem(k));
  } catch {
    /* storage blocked: nothing to prune */
  }
}

/**
 * Remember the position. `opts.skip` turns the write off (Incognito); the caller passes the
 * flag so this module stays free of settings/profile state.
 */
export function writePos(
  profileId: string | undefined,
  chapterId: string | undefined,
  value: { page: number; offset?: number },
  opts: { skip?: boolean; now?: number } = {},
): void {
  if (opts.skip || !profileId || !chapterId) return;
  try {
    const rec: StoredPos = { page: value.page, offset: value.offset, t: opts.now ?? Date.now() };
    localStorage.setItem(posKey(profileId, chapterId), JSON.stringify(rec));
    prunePos(profileId);
  } catch {
    /* storage full or blocked: IndexedDB progress still applies */
  }
}
