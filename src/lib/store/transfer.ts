import { cacheTitles, db, writesPaused, getCachedTitles, type CommentRecord, type EventRecord, type Hidden, type LibraryRecord, type ProfileRecord, type ProgressRecord } from "./db";
import { getUser, IncognitoError, newProfile, switchProfile } from "./user";
import type { Title } from "../titles";
import { MAX_COMMENT } from "../comments";
import { questSeedOf } from "../rewards/quests";

/**
 * Profile export / import as a portable JSON document. This is also the
 * shape a future cloud sync would exchange; nothing leaves the device unless
 * the user saves the file themselves.
 */
export interface ProfileExport {
  format: "dawghwa-profile";
  /** 1: original. 2: adds `comments`. Both import. */
  version: 1 | 2;
  exportedAt: string;
  profile: Omit<ProfileRecord, "id">;
  library: Omit<LibraryRecord, "profileId">[];
  progress: Omit<ProgressRecord, "profileId">[];
  hidden: Omit<Hidden, "profileId">[];
  events: Omit<EventRecord, "profileId">[];
  comments?: Omit<CommentRecord, "profileId">[];
  titles: Title[];
}

const strip = <T extends { profileId: string }>(xs: T[]) => xs.map(({ profileId: _p, ...rest }) => rest);

export async function exportProfile(profileId = getUser().profile?.id): Promise<ProfileExport> {
  if (!profileId) throw new Error("No active profile");
  const d = await db();
  const profile = await d.get("profiles", profileId);
  if (!profile) throw new Error("Profile not found");
  const [library, progress, hidden, events, comments] = await Promise.all([
    d.getAllFromIndex("library", "byProfile", profileId),
    d.getAllFromIndex("progress", "byProfile", profileId),
    d.getAllFromIndex("hidden", "byProfile", profileId),
    d.getAllFromIndex("events", "byProfile", profileId),
    d.getAllFromIndex("comments", "byProfile", profileId),
  ]);
  // Event titles too, so derived rewards (genre stamps) survive a round trip.
  const keys = [...new Set([...library, ...progress, ...hidden, ...events.filter((e) => e.kind === "chapter_read" || e.kind === "title_finished")].map((r) => r.titleKey))];
  const titles = [...(await getCachedTitles(keys)).values()].map((t) => {
    const { cachedAt: _c, ...rest } = t as Title & { cachedAt?: number };
    return rest;
  });
  const { id: _id, ...rest } = profile;
  // carry the (derived, not the raw id) quest seed so the imported profile keeps the same weekly quests
  const p = { ...rest, questSeed: questSeedOf(profile) };
  return { format: "dawghwa-profile", version: 2, exportedAt: new Date().toISOString(), profile: p, library: strip(library), progress: strip(progress), hidden: strip(hidden), events: strip(events), comments: strip(comments), titles };
}

function isExport(x: unknown): x is ProfileExport {
  const o = x as ProfileExport;
  return Boolean(o && o.format === "dawghwa-profile" && (o.version === 1 || o.version === 2) && o.profile && Array.isArray(o.library) && Array.isArray(o.progress) && Array.isArray(o.events));
}

/** Import as a new profile (never merges into or overwrites an existing one). */
export async function importProfile(json: string): Promise<ProfileRecord> {
  if (writesPaused()) throw new IncognitoError("import a profile");
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isExport(data)) throw new Error("That file isn't a Dawghwa profile export.");
  const base = newProfile(data.profile.name || "Imported", getUser().profiles.length);
  const profile: ProfileRecord = { ...base, name: `${data.profile.name || "Imported"}`.slice(0, 40), color: data.profile.color || base.color, onboarded: true, prefs: { ...base.prefs, ...data.profile.prefs }, cosmetics: data.profile.cosmetics, rhythm: data.profile.rhythm, pin: validPin(data.profile.pin), questSeed: typeof data.profile.questSeed === "string" && data.profile.questSeed ? data.profile.questSeed.slice(0, 64) : base.questSeed };
  const pid = profile.id;
  const d = await db();
  const tx = d.transaction(["profiles", "library", "progress", "hidden", "events", "comments"], "readwrite");
  await tx.objectStore("profiles").put(profile);
  for (const r of data.library) await tx.objectStore("library").put({ ...r, collections: r.collections ?? [], profileId: pid });
  for (const r of data.progress) await tx.objectStore("progress").put({ ...r, read: r.read ?? {}, profileId: pid });
  for (const r of data.hidden ?? []) await tx.objectStore("hidden").put({ ...r, profileId: pid });
  for (const r of data.events) await tx.objectStore("events").put({ ...r, profileId: pid });
  for (const r of Array.isArray(data.comments) ? data.comments : [])
    if (r && typeof r.id === "string" && typeof r.chapterId === "string" && typeof r.body === "string") await tx.objectStore("comments").put({ ...r, body: r.body.slice(0, MAX_COMMENT), profileId: pid });
  await tx.done;
  await cacheTitles((data.titles ?? []).filter((t) => t && typeof t.key === "string" && typeof t.title === "string"));
  await switchProfile(pid);
  return profile;
}

function validPin(p: unknown): ProfileRecord["pin"] {
  const x = p as ProfileRecord["pin"];
  return x && typeof x.salt === "string" && /^[0-9a-f]{64}$/.test(x.hash ?? "") ? { salt: x.salt, hash: x.hash } : undefined;
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
