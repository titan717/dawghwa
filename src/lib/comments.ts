import { useEffect, useSyncExternalStore } from "react";
import { db, type CommentRecord } from "./store/db";
import { isIncognito } from "./store/incognito";
import { getUser, signal, subscribeUser } from "./store/user";
import type { Title } from "./titles";

/**
 * Chapter comments, stored on this device for the active profile only (D5).
 * There is no comments endpoint in the API and no audience: "Top" means pinned
 * first, then your own thumbs up, then the liveliest threads.
 */

export const MAX_COMMENT = 500;
export type CommentSort = "top" | "newest";
export interface Thread {
  comment: CommentRecord;
  replies: CommentRecord[];
}

const cache = new Map<string, CommentRecord[]>();
const loading = new Set<string>();
const subs = new Set<() => void>();
let version = 0;
let profileId: string | undefined;
const EMPTY: CommentRecord[] = [];

function bump() {
  version++;
  subs.forEach((s) => s());
}

subscribeUser(() => {
  const id = getUser().profile?.id;
  if (id === profileId) return;
  profileId = id;
  cache.clear();
  bump();
});

async function load(chapterId: string) {
  const pid = getUser().profile?.id;
  if (!pid || loading.has(chapterId)) return;
  loading.add(chapterId);
  try {
    const rows = await (await db()).getAllFromIndex("comments", "byChapter", [pid, chapterId]);
    if (getUser().profile?.id !== pid) return;
    cache.set(chapterId, rows);
    bump();
  } finally {
    loading.delete(chapterId);
  }
}

/** All comments on one chapter (top-level and replies), loaded on first use. */
export function useChapterComments(chapterId: string | undefined): { items: CommentRecord[]; ready: boolean } {
  useSyncExternalStore(
    (fn) => (subs.add(fn), () => void subs.delete(fn)),
    () => version,
  );
  const pid = useSyncExternalStore(subscribeUser, () => getUser().profile?.id);
  useEffect(() => {
    if (chapterId && pid && !cache.has(chapterId)) void load(chapterId);
  }, [chapterId, pid]);
  const items = chapterId ? cache.get(chapterId) : undefined;
  return { items: items ?? EMPTY, ready: Boolean(items) };
}

function put(rec: CommentRecord) {
  const list = (cache.get(rec.chapterId) ?? []).filter((c) => c.id !== rec.id);
  list.push(rec);
  cache.set(rec.chapterId, list);
  bump();
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function cleanBody(body: string): string {
  return body.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_COMMENT);
}

export async function addComment(input: { title: Title; chapterId: string; chapterNumber?: number; body: string; parentId?: string }): Promise<CommentRecord | undefined> {
  const pid = getUser().profile?.id;
  const body = cleanBody(input.body);
  if (!pid || !body || isIncognito()) return; // Incognito: comments are not kept
  const now = Date.now();
  const rec: CommentRecord = { profileId: pid, id: newId(), titleKey: input.title.key, chapterId: input.chapterId, chapterNumber: input.chapterNumber, body, parentId: input.parentId, at: now, updatedAt: now };
  await (await db()).put("comments", rec);
  put(rec);
  // The event feeds quests and the "Margin notes" set; the recommender ignores it.
  await signal("comment", input.title, input.title.key, { context: input.chapterId });
  return rec;
}

async function patch(c: CommentRecord, change: Partial<CommentRecord>) {
  if (isIncognito()) return c; // Incognito: edits, pins and votes are not kept
  const rec = { ...c, ...change, updatedAt: Date.now() };
  await (await db()).put("comments", rec);
  put(rec);
  return rec;
}

export function editComment(c: CommentRecord, body: string) {
  const b = cleanBody(body);
  if (!b || b === c.body) return Promise.resolve(c);
  return patch(c, { body: b, editedAt: Date.now() });
}
export const togglePin = (c: CommentRecord) => patch(c, { pinned: !c.pinned || undefined });
export const voteComment = (c: CommentRecord, v: 1 | -1) => patch(c, { vote: c.vote === v ? undefined : v });

/** Delete a comment and its replies. */
export async function deleteComment(c: CommentRecord) {
  const list = cache.get(c.chapterId) ?? [];
  const gone = [c, ...list.filter((x) => x.parentId === c.id)];
  const tx = (await db()).transaction("comments", "readwrite");
  for (const g of gone) await tx.store.delete([g.profileId, g.id]);
  await tx.done;
  const ids = new Set(gone.map((g) => g.id));
  cache.set(
    c.chapterId,
    list.filter((x) => !ids.has(x.id)),
  );
  bump();
}

/** Top-level threads in display order; replies oldest first. */
export function threads(items: CommentRecord[], sort: CommentSort): Thread[] {
  const replies = new Map<string, CommentRecord[]>();
  const top: CommentRecord[] = [];
  const ids = new Set(items.map((c) => c.id));
  for (const c of items) {
    if (c.parentId && ids.has(c.parentId)) replies.set(c.parentId, [...(replies.get(c.parentId) ?? []), c]);
    else top.push(c);
  }
  const score = (c: CommentRecord) => (c.vote ?? 0) * 2 + Math.min(3, replies.get(c.id)?.length ?? 0);
  top.sort((a, b) => (sort === "top" ? Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || score(b) - score(a) || b.at - a.at : b.at - a.at));
  return top.map((comment) => ({ comment, replies: (replies.get(comment.id) ?? []).sort((a, b) => a.at - b.at) }));
}

/** "now", "5m", "3h", "2d", then a short date. */
export function ago(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "now";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d`;
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Test helper. */
export function resetCommentsForTests() {
  cache.clear();
  loading.clear();
  profileId = undefined;
}
