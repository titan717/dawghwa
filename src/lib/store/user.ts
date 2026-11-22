import { chapterAliases } from "@/lib/chapters";
import { useSyncExternalStore } from "react";
import type { Title } from "../titles";
import { isIncognito } from "./incognito";
import { cacheTitles, db, getCachedTitles, kvGet, kvSet, type EventRecord, type Hidden, type LibraryRecord, type LibraryStatus, type ProfileRecord, type ProgressRecord } from "./db";

/**
 * In-memory view of the active profile's private data, backed by IndexedDB.
 * Switching profile drops everything and reloads only that profile's records.
 * Components subscribe with useUser(selector).
 */

export type SignalKind =
  | "open"
  | "chapter_read"
  | "title_finished"
  | "library_add"
  | "favorite"
  | "like"
  | "dislike"
  | "more_like_this"
  | "return"
  | "not_interested"
  | "hide"
  | "dropped"
  | "unhide"
  | "surprise_pick"
  | "comment";

export interface UserState {
  ready: boolean;
  profile: ProfileRecord | null;
  profiles: ProfileRecord[];
  library: Map<string, LibraryRecord>;
  progress: Map<string, ProgressRecord>;
  hidden: Map<string, Hidden>;
  titles: Map<string, Title>;
  /** The profile's append-only event log, oldest first. Rewards are derived from it. */
  events: EventRecord[];
  /** Monotonic counter bumped on every signal (drives re-ranking). */
  signalVersion: number;
}

let state: UserState = {
  ready: false,
  profile: null,
  profiles: [],
  library: new Map(),
  progress: new Map(),
  hidden: new Map(),
  titles: new Map(),
  events: [],
  signalVersion: 0,
};
const subs = new Set<() => void>();
const signalListeners = new Set<(e: EventRecord, t?: Title) => void>();
let seq = 0;

function set(patch: Partial<UserState>) {
  state = { ...state, ...patch };
  subs.forEach((s) => s());
}

export function getUser(): UserState {
  return state;
}

export function subscribeUser(fn: () => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function useUser<T>(selector: (s: UserState) => T): T {
  return useSyncExternalStore(subscribeUser, () => selector(state), () => selector(state));
}

export function onSignal(fn: (e: EventRecord, t?: Title) => void) {
  signalListeners.add(fn);
  return () => signalListeners.delete(fn);
}

export const PROFILE_COLORS = ["#ff5a36", "#3fb8af", "#f2b134", "#8c7dff", "#ef6f9a", "#5aa9e6"];

export function newProfile(name: string, index = 0): ProfileRecord {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "Reader",
    color: PROFILE_COLORS[index % PROFILE_COLORS.length]!,
    createdAt: now,
    updatedAt: now,
    onboarded: false,
    prefs: { genres: [], kinds: [], avoid: [], personalize: true },
    questSeed: crypto.randomUUID(),
  };
}

/** Load profiles and activate the last used (creating a guest profile on first run). */
export async function initUser(): Promise<void> {
  const d = await db();
  let profiles = await d.getAll("profiles");
  if (!profiles.length) {
    const p = newProfile("Reader");
    await d.put("profiles", p);
    profiles = [p];
  }
  const lastId = await kvGet<string>("activeProfile");
  const active = profiles.find((p) => p.id === lastId) ?? profiles[0]!;
  await activate(active, profiles);
}

async function activate(profile: ProfileRecord, profiles?: ProfileRecord[]) {
  const d = await db();
  const [lib, prog, hid] = await Promise.all([
    d.getAllFromIndex("library", "byProfile", profile.id),
    d.getAllFromIndex("progress", "byProfile", profile.id),
    d.getAllFromIndex("hidden", "byProfile", profile.id),
  ]);
  const events = (await d.getAllFromIndex("events", "byProfile", profile.id)).sort((a, b) => a.seq - b.seq);
  seq = events.reduce((m, e) => Math.max(m, e.seq), 0);
  // titles the profile interacted with recently (explanations need their names),
  // plus every series with a finished chapter (rewards need their genres)
  const recent = events.slice(-400).map((e) => e.titleKey);
  const finished = events.filter((e) => e.kind === "chapter_read" || e.kind === "title_finished").map((e) => e.titleKey);
  const keys = [...new Set([...lib.map((r) => r.titleKey), ...prog.map((r) => r.titleKey), ...recent, ...finished])];
  const titles = await getCachedTitles(keys);
  await kvSet("activeProfile", profile.id);
  set({
    ready: true,
    profile,
    profiles: profiles ?? (await d.getAll("profiles")),
    library: new Map(lib.map((r) => [r.titleKey, r])),
    progress: new Map(prog.map((r) => [r.titleKey, r])),
    hidden: new Map(hid.map((r) => [r.titleKey, r])),
    titles,
    events,
    signalVersion: state.signalVersion + 1,
  });
}

export async function switchProfile(id: string) {
  const d = await db();
  const p = await d.get("profiles", id);
  if (p) await activate(p);
}

export async function createProfile(name: string): Promise<ProfileRecord> {
  const d = await db();
  const p = newProfile(name, state.profiles.length);
  await d.put("profiles", p);
  set({ profiles: [...state.profiles, p] });
  return p;
}

export async function updateProfile(patch: Partial<Omit<ProfileRecord, "id">>) {
  if (!state.profile) return;
  const p = { ...state.profile, ...patch, updatedAt: Date.now() };
  await (await db()).put("profiles", p);
  set({ profile: p, profiles: state.profiles.map((x) => (x.id === p.id ? p : x)) });
}

/** Delete a profile and every private record it owns. */
export async function deleteProfile(id: string) {
  const d = await db();
  if (state.profiles.length <= 1) throw new Error("Keep at least one profile");
  const tx = d.transaction(["profiles", "library", "progress", "hidden", "events", "comments", "intel"], "readwrite");
  await tx.objectStore("profiles").delete(id);
  for (const name of ["library", "progress", "hidden", "events", "comments"] as const) {
    const store = tx.objectStore(name);
    const keys = await store.index("byProfile").getAllKeys(id);
    for (const k of keys) await store.delete(k);
  }
  await tx.objectStore("intel").delete(id);
  await tx.done;
  const profiles = state.profiles.filter((p) => p.id !== id);
  if (state.profile?.id === id) await activate(profiles[0]!, profiles);
  else set({ profiles });
}

/** Remember public metadata for titles the profile interacts with. */
export async function rememberTitle(t: Title) {
  const titles = new Map(state.titles);
  titles.set(t.key, { ...(titles.get(t.key) ?? {}), ...t });
  set({ titles });
  await cacheTitles([t]);
}

export async function signal(kind: SignalKind, t: Title | undefined, titleKey = t?.key, extra: { value?: number; context?: string } = {}) {
  const profile = state.profile;
  if (!profile || !titleKey) return;
  // Incognito: no event, so no history, rewards or recommender learning (listeners never fire).
  if (isIncognito()) return;
  if (t) await rememberTitle(t);
  const e: EventRecord = { profileId: profile.id, seq: ++seq, kind, titleKey, at: Date.now(), ...extra };
  await (await db()).put("events", e);
  set({ events: [...state.events, e], signalVersion: state.signalVersion + 1 });
  signalListeners.forEach((l) => l(e, t ?? state.titles.get(titleKey)));
}

export async function profileEvents(profileId = state.profile?.id): Promise<EventRecord[]> {
  if (!profileId) return [];
  return (await db()).getAllFromIndex("events", "byProfile", profileId);
}

// ------------------------------------------------------------------ library

async function putLibrary(rec: LibraryRecord | null, key: string) {
  const d = await db();
  const library = new Map(state.library);
  if (rec && (rec.status || rec.favorite || rec.rating || rec.collections.length)) {
    await d.put("library", rec);
    library.set(key, rec);
  } else if (state.profile) {
    await d.delete("library", [state.profile.id, key]);
    library.delete(key);
  }
  set({ library });
}

function baseRecord(key: string): LibraryRecord {
  const now = Date.now();
  return state.library.get(key) ?? { profileId: state.profile!.id, titleKey: key, favorite: false, collections: [], addedAt: now, updatedAt: now };
}

/** `context` "reader" marks a completion the reader earned by reading the final chapter. */
export async function setStatus(t: Title, status: LibraryStatus | undefined, context?: string, value?: number) {
  if (!state.profile) return;
  const prev = state.library.get(t.key);
  const rec = { ...baseRecord(t.key), status, updatedAt: Date.now() };
  await rememberTitle(t);
  await putLibrary(rec, t.key);
  if (status && !prev?.status) await signal("library_add", t);
  if (status === "completed" && prev?.status !== "completed") await signal("title_finished", t, t.key, context ? { context, value } : {});
  if (status === "dropped" && prev?.status !== "dropped") await signal("dropped", t);
}

export async function toggleFavorite(t: Title) {
  if (!state.profile) return;
  const rec = baseRecord(t.key);
  const next = { ...rec, favorite: !rec.favorite, updatedAt: Date.now() };
  await rememberTitle(t);
  await putLibrary(next, t.key);
  if (next.favorite) await signal("favorite", t);
}

export async function rate(t: Title, rating: 1 | -1 | undefined) {
  if (!state.profile) return;
  const rec = { ...baseRecord(t.key), rating, updatedAt: Date.now() };
  await rememberTitle(t);
  await putLibrary(rec, t.key);
  if (rating === 1) await signal("like", t);
  if (rating === -1) await signal("dislike", t);
}

export async function setCollections(t: Title, collections: string[]) {
  if (!state.profile) return;
  const rec = { ...baseRecord(t.key), collections: [...new Set(collections.map((c) => c.trim()).filter(Boolean))], updatedAt: Date.now() };
  await rememberTitle(t);
  await putLibrary(rec, t.key);
}

export function allCollections(s: UserState = state): string[] {
  const set = new Set<string>();
  s.library.forEach((r) => r.collections.forEach((c) => set.add(c)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

// ------------------------------------------------------------------- hidden

export async function hideTitle(t: Title, reason: Hidden["reason"]) {
  if (!state.profile) return;
  const rec: Hidden = { profileId: state.profile.id, titleKey: t.key, reason, at: Date.now() };
  await (await db()).put("hidden", rec);
  const hidden = new Map(state.hidden);
  hidden.set(t.key, rec);
  set({ hidden });
  await signal(reason === "not_interested" ? "not_interested" : "hide", t);
}

export async function unhideTitle(key: string) {
  if (!state.profile) return;
  await (await db()).delete("hidden", [state.profile.id, key]);
  const hidden = new Map(state.hidden);
  hidden.delete(key);
  set({ hidden });
  await signal("unhide", undefined, key);
}

// ----------------------------------------------------------------- progress

export interface ProgressUpdate {
  title: Title;
  chapterId: string;
  /** Provider version being read; lets resume reopen the same source. */
  variantId?: string;
  sourceId?: string;
  language?: string | null;
  chapterNumber: number;
  chapterTitle?: string;
  page: number;
  pageCount: number;
  fraction: number;
  /** Vertical mode: scroll offset inside the current page, 0..1 of its height. */
  offset?: number;
  /** The reader reached the end of the chapter (last page seen). */
  finished: boolean;
  /** Total chapters known, to detect finishing the whole title. */
  lastChapterNumber?: number;
}

const RETURN_GAP_MS = 6 * 3600 * 1000;

/**
 * Save reading position. A chapter only counts as read when the reader
 * actually reached its end (`finished`), never just because it was opened.
 */
export async function saveProgress(u: ProgressUpdate): Promise<ProgressRecord | undefined> {
  const profile = state.profile;
  // Incognito: position, history, Continue reading and the auto "Reading"/"Completed" status stay as they were.
  if (!profile || isIncognito()) return;
  const now = Date.now();
  const prev = state.progress.get(u.title.key);
  const read = { ...(prev?.read ?? {}) };
  const newlyFinished = u.finished && !read[u.chapterId];
  if (newlyFinished) read[u.chapterId] = now;
  const rec: ProgressRecord = {
    profileId: profile.id,
    titleKey: u.title.key,
    chapterId: u.chapterId,
    ...(u.variantId ? { variantId: u.variantId } : {}),
    ...(u.sourceId ? { sourceId: u.sourceId } : {}),
    ...(u.language !== undefined ? { language: u.language } : {}),
    chapterNumber: u.chapterNumber,
    chapterTitle: u.chapterTitle,
    page: Math.max(0, u.page),
    pageCount: Math.max(0, u.pageCount),
    fraction: Math.min(1, Math.max(0, u.fraction)),
    offset: u.offset === undefined ? undefined : Math.min(1, Math.max(0, u.offset)),
    read,
    maxReadNumber: Math.max(prev?.maxReadNumber ?? 0, newlyFinished || read[u.chapterId] ? u.chapterNumber : 0),
    startedAt: prev?.startedAt ?? now,
    updatedAt: now,
  };
  await rememberTitle(u.title);
  await (await db()).put("progress", rec);
  const progress = new Map(state.progress);
  progress.set(u.title.key, rec);
  set({ progress });
  if (prev && now - prev.updatedAt > RETURN_GAP_MS) await signal("return", u.title);
  if (newlyFinished) {
    await signal("chapter_read", u.title, u.title.key, { value: u.chapterNumber });
    const last = u.lastChapterNumber;
    const finishedTitle = last !== undefined && u.chapterNumber >= last && u.title.meta?.status === "completed";
    if (finishedTitle && state.library.get(u.title.key)?.status !== "completed") await setStatus(u.title, "completed", "reader", last);
    else if (!state.library.get(u.title.key)?.status) await setStatus(u.title, "reading");
  }
  return rec;
}

export async function markChaptersRead(t: Title, chapters: { id: string; number: number; variants?: { providerChapterId: string; variantId?: string }[] }[], read: boolean) {
  const profile = state.profile;
  if (!profile || !chapters.length || isIncognito()) return;
  const prev = state.progress.get(t.key);
  const now = Date.now();
  const map = { ...(prev?.read ?? {}) };
  for (const c of chapters) {
    if (read) map[c.id] = map[c.id] ?? now;
    else for (const alias of chapterAliases(c)) delete map[alias]; // legacy provider-id marks too
  }
  const latest = [...chapters].sort((a, b) => b.number - a.number)[0]!;
  const rec: ProgressRecord = prev
    ? { ...prev, read: map, maxReadNumber: read ? Math.max(prev.maxReadNumber, latest.number) : prev.maxReadNumber, updatedAt: now }
    : { profileId: profile.id, titleKey: t.key, chapterId: latest.id, chapterNumber: latest.number, page: 0, pageCount: 0, fraction: read ? 1 : 0, read: map, maxReadNumber: read ? latest.number : 0, startedAt: now, updatedAt: now };
  await rememberTitle(t);
  await (await db()).put("progress", rec);
  const progress = new Map(state.progress);
  progress.set(t.key, rec);
  set({ progress });
}

export async function removeFromHistory(key: string) {
  const profile = state.profile;
  if (!profile) return;
  await (await db()).delete("progress", [profile.id, key]);
  const progress = new Map(state.progress);
  progress.delete(key);
  set({ progress });
}

export async function clearHistory() {
  const profile = state.profile;
  if (!profile) return;
  const d = await db();
  const keys = await d.getAllKeysFromIndex("progress", "byProfile", profile.id);
  const tx = d.transaction("progress", "readwrite");
  for (const k of keys) await tx.store.delete(k);
  await tx.done;
  set({ progress: new Map() });
}

/** Continue-reading order: recent activity first; long-idle brief tries sink. */
export function continueList(s: UserState = state): ProgressRecord[] {
  const now = Date.now();
  return [...s.progress.values()]
    .filter((p) => !s.hidden.has(p.titleKey) && s.library.get(p.titleKey)?.status !== "completed" && s.library.get(p.titleKey)?.status !== "dropped")
    .map((p) => {
      const days = (now - p.updatedAt) / 86_400_000;
      const engaged = Object.keys(p.read).length;
      const score = -days + Math.min(engaged, 10) * 0.8 - (engaged === 0 && days > 14 ? 30 : 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
