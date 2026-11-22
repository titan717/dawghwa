import { beforeEach, describe, expect, it } from "vitest";
import { catalog, soloLevelingChapters } from "@/test/catalog";
import { createProfile, deleteProfile, getUser, initUser, profileEvents, saveProgress, setStatus, switchProfile, toggleFavorite } from "./user";
import { exportProfile, importProfile } from "./transfer";
import { db } from "./db";

const [a, b, c] = catalog; // a: Solo Leveling
const CH1 = soloLevelingChapters[0]!.id; // its real canonical chapter 1 key

function progressUpdate(t = a!, over: Partial<Parameters<typeof saveProgress>[0]> = {}) {
  return { title: t, chapterId: CH1, chapterNumber: 1, page: 0, pageCount: 20, fraction: 0, finished: false, ...over };
}

beforeEach(async () => {
  await initUser();
});

describe("reader progress", () => {
  it("does not mark a chapter read just because it was opened", async () => {
    const rec = await saveProgress(progressUpdate());
    expect(rec?.read).toEqual({});
    expect(rec?.maxReadNumber).toBe(0);
    expect(getUser().library.get(a!.key)?.status).toBeUndefined();
    const kinds = (await profileEvents()).map((e) => e.kind);
    expect(kinds).not.toContain("chapter_read");
  });

  it("does not mark read when stopped part way", async () => {
    const rec = await saveProgress(progressUpdate(a, { page: 15, fraction: 0.75 }));
    expect(rec?.read[CH1]).toBeUndefined();
    expect(rec?.page).toBe(15);
  });

  it("marks read only on reaching the end, once", async () => {
    await saveProgress(progressUpdate(a, { page: 19, fraction: 1, finished: true }));
    await saveProgress(progressUpdate(a, { page: 19, fraction: 1, finished: true }));
    const rec = getUser().progress.get(a!.key)!;
    expect(rec.read[CH1]).toBeTypeOf("number");
    expect(rec.maxReadNumber).toBe(1);
    expect(getUser().library.get(a!.key)?.status).toBe("reading");
    const reads = (await profileEvents()).filter((e) => e.kind === "chapter_read");
    expect(reads).toHaveLength(1);
  });

  it("clamps out-of-range values", async () => {
    const rec = await saveProgress(progressUpdate(a, { page: -3, fraction: 4 }));
    expect(rec?.page).toBe(0);
    expect(rec?.fraction).toBe(1);
  });
});

describe("profile isolation", () => {
  it("keeps library, progress and events separate per profile", async () => {
    const first = getUser().profile!.id;
    await setStatus(a!, "plan");
    await saveProgress(progressUpdate(a, { page: 5, fraction: 0.25 }));

    const second = await createProfile("Second");
    await switchProfile(second.id);
    expect(getUser().profile!.id).toBe(second.id);
    expect(getUser().library.size).toBe(0);
    expect(getUser().progress.size).toBe(0);
    expect(await profileEvents()).toHaveLength(0);

    await toggleFavorite(b!);
    expect(getUser().library.get(b!.key)?.favorite).toBe(true);

    await switchProfile(first);
    expect(getUser().library.has(b!.key)).toBe(false);
    expect(getUser().library.get(a!.key)?.status).toBe("plan");
    expect(getUser().progress.get(a!.key)?.page).toBe(5);
  });

  it("deleting a profile removes all of its private records", async () => {
    const keep = getUser().profile!.id;
    const gone = await createProfile("Temp");
    await switchProfile(gone.id);
    await setStatus(c!, "reading");
    await deleteProfile(gone.id);
    expect(getUser().profile!.id).toBe(keep);
    const d = await db();
    expect(await d.getAllFromIndex("library", "byProfile", gone.id)).toHaveLength(0);
    expect(await d.getAllFromIndex("events", "byProfile", gone.id)).toHaveLength(0);
    expect(await d.get("profiles", gone.id)).toBeUndefined();
  });
});

describe("export / import", () => {
  it("round-trips a profile into a new, separate profile", async () => {
    const original = getUser().profile!.id;
    await setStatus(a!, "completed");
    await toggleFavorite(b!);
    await saveProgress(progressUpdate(a, { page: 19, fraction: 1, finished: true }));
    const data = await exportProfile();
    expect(data.format).toBe("dawghwa-profile");
    // the id itself isn't exported; only the quest seed travels (D34)
    expect(JSON.stringify({ ...data, profile: { ...data.profile, questSeed: undefined } })).not.toContain(original);

    const imported = await importProfile(JSON.stringify(data));
    expect(imported.id).not.toBe(original);
    expect(getUser().profile!.id).toBe(imported.id);
    expect(getUser().library.get(a!.key)?.status).toBe("completed");
    expect(getUser().library.get(b!.key)?.favorite).toBe(true);
    expect(getUser().progress.get(a!.key)?.read[CH1]).toBeTypeOf("number");
    expect(getUser().titles.get(a!.key)?.title).toBe(a!.title);
    expect((await profileEvents()).length).toBe(data.events.length);

    // the source profile is untouched
    await switchProfile(original);
    expect(getUser().library.get(a!.key)?.status).toBe("completed");
  });

  it("rejects invalid files without creating a profile", async () => {
    const before = (await (await db()).getAll("profiles")).length;
    await expect(importProfile("not json")).rejects.toThrow(/valid JSON/);
    await expect(importProfile(JSON.stringify({ format: "other" }))).rejects.toThrow(/Dawghwa profile/);
    expect((await (await db()).getAll("profiles")).length).toBe(before);
  });
});
