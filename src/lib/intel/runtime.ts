import { useSyncExternalStore } from "react";
import { db, getCachedTitles, kvGet, kvSet } from "../store/db";
import { isIncognito } from "../store/incognito";
import { getUser, profileEvents, subscribeUser } from "../store/user";
import type { Title } from "../titles";
import { deserialize, serialize, train, type LearnerState, type SerializedState } from "./learner";

/**
 * Per-profile intelligence runtime. The model lives in IndexedDB (`intel`
 * store keyed by profile id) and is retrained from that profile's events in a
 * Web Worker (main-thread fallback). Nothing leaves the device.
 */

let current: LearnerState | null = null;
let currentProfile: string | null = null;
let version = 0;
const subs = new Set<() => void>();
const emit = () => {
  version++;
  subs.forEach((s) => s());
};

export function getIntel(): LearnerState | null {
  return current && current.profileId === getUser().profile?.id ? current : null;
}

export function useIntel(): LearnerState | null {
  useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => version,
    () => version,
  );
  return getIntel();
}

let worker: Worker | null | undefined;
let reqId = 0;
const pending = new Map<number, (s: SerializedState | null) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    if (typeof Worker === "undefined") return (worker = null);
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent<{ id: number; state?: SerializedState; error?: string }>) => {
      pending.get(ev.data.id)?.(ev.data.state ?? null);
      pending.delete(ev.data.id);
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = null;
      pending.forEach((r) => r(null));
      pending.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

const forgottenKey = (pid: string) => `intel:forgotten:${pid}`;
const resetKey = (pid: string) => `intel:resetAt:${pid}`;
const POOL_SIZE = 300;

/** Gather everything the learner needs for one profile. */
async function gather(profileId: string) {
  const events = await profileEvents(profileId);
  const keys = [...new Set(events.map((e) => e.titleKey))];
  const titles = await getCachedTitles(keys);
  const d = await db();
  // Contrast pool: catalogue titles cached from browse rows (public metadata).
  const pool: Title[] = [];
  let cursor = await d.transaction("titles").store.openCursor(null, "prev");
  while (cursor && pool.length < POOL_SIZE) {
    if (cursor.value.meta && !titles.has(cursor.value.key)) pool.push(cursor.value);
    cursor = await cursor.continue();
  }
  const forgotten = (await kvGet<string[]>(forgottenKey(profileId))) ?? [];
  const resetAt = (await kvGet<number>(resetKey(profileId))) ?? 0;
  return { events, titles, pool, forgotten, resetAt };
}

async function trainProfile(profileId: string): Promise<LearnerState> {
  const g = await gather(profileId);
  const w = getWorker();
  if (w) {
    const id = ++reqId;
    const titles = Object.fromEntries(g.titles);
    const res = await new Promise<SerializedState | null>((resolve) => {
      pending.set(id, resolve);
      w.postMessage({ id, input: { profileId, events: g.events, titles, pool: g.pool, forgotten: g.forgotten, resetAt: g.resetAt } });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          resolve(null);
        }
      }, 15_000);
    });
    const s = res && deserialize(res);
    if (s) return s;
  }
  return train({ profileId, events: g.events, titles: g.titles, pool: g.pool, forgotten: new Set(g.forgotten), resetAt: g.resetAt });
}

let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;

export async function retrain(profileId = getUser().profile?.id): Promise<void> {
  if (!profileId || isIncognito()) return;
  const s = await trainProfile(profileId);
  if (getUser().profile?.id !== profileId) return; // profile switched meanwhile
  current = s;
  emit();
  await (await db()).put("intel", { profileId, state: serialize(s), updatedAt: Date.now() });
}

function schedule(delay = 600) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    running = (running ?? Promise.resolve()).then(() => retrain()).catch(() => undefined);
  }, delay);
}

/** Load the persisted model for the active profile, then follow its signals. */
export function startIntel(): () => void {
  let lastVersion = -1;
  const sync = async () => {
    const u = getUser();
    const pid = u.profile?.id ?? null;
    if (pid !== currentProfile) {
      currentProfile = pid;
      current = null;
      emit();
      if (!pid) return;
      const rec = await (await db()).get("intel", pid);
      const s = rec ? deserialize(rec.state as SerializedState) : null;
      if (s && getUser().profile?.id === pid) {
        current = s;
        emit();
      }
      lastVersion = u.signalVersion;
      schedule(s ? 2_000 : 50);
      return;
    }
    if (u.signalVersion !== lastVersion) {
      lastVersion = u.signalVersion;
      schedule();
    }
  };
  void sync();
  return subscribeUser(() => void sync());
}

/** Remove one title's influence (events kept for history, excluded from learning). */
export async function forgetTitle(key: string) {
  const pid = getUser().profile?.id;
  if (!pid) return;
  const list = new Set((await kvGet<string[]>(forgottenKey(pid))) ?? []);
  list.add(key);
  await kvSet(forgottenKey(pid), [...list]);
  await retrain(pid);
}

/** Start the learned profile over. Library, history and onboarding answers stay. */
export async function resetIntel() {
  const pid = getUser().profile?.id;
  if (!pid) return;
  await kvSet(resetKey(pid), Date.now());
  await kvSet(forgottenKey(pid), []);
  await retrain(pid);
}
