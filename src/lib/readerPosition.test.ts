import { beforeEach, describe, expect, it } from "vitest";
import { catalog } from "@/test/catalog";
import { createProfile, deleteProfile, getUser, initUser, saveProgress, switchProfile } from "@/lib/store/user";
import { resetIncognitoForTests } from "@/lib/privacy/incognito";
import { migratePositions, POS_PREFIX, readPos, writePos } from "./readerPosition";

const [a] = catalog;

beforeEach(async () => {
  resetIncognitoForTests();
  localStorage.clear();
  await initUser();
});

describe("reader position mirror", () => {
  it("is keyed by profile", () => {
    const pid = getUser().profile!.id;
    writePos(pid, "ch-9", 12, 0.5);
    expect(localStorage.getItem(`${POS_PREFIX}${pid}.ch-9`)).toContain('"page":12');
    expect(localStorage.getItem(`${POS_PREFIX}ch-9`)).toBeNull();
  });

  it("does not leak a position when profiles switch mid-chapter", async () => {
    const first = getUser().profile!.id;
    // profile A is reading chapter 1, page 14
    writePos(first, "ch-1", 14, 0.2);
    await saveProgress({ profileId: first, title: a!, chapterId: "ch-1", chapterNumber: 1, page: 14, pageCount: 20, fraction: 0.7, finished: false });

    const second = await createProfile("Second");
    await switchProfile(second.id);
    // a save the reader queued under A lands after the switch: it must be dropped, not written to B
    await saveProgress({ profileId: first, title: a!, chapterId: "ch-1", chapterNumber: 1, page: 15, pageCount: 20, fraction: 0.75, finished: false });

    expect(readPos(second.id, "ch-1")).toBeUndefined();
    expect(getUser().progress.get(a!.key)).toBeUndefined();

    // B reads the same chapter to page 3; A's position is untouched
    writePos(second.id, "ch-1", 3);
    await saveProgress({ profileId: second.id, title: a!, chapterId: "ch-1", chapterNumber: 1, page: 3, pageCount: 20, fraction: 0.2, finished: false });
    expect(readPos(second.id, "ch-1")?.page).toBe(3);
    expect(readPos(first, "ch-1")?.page).toBe(14);

    await switchProfile(first);
    expect(getUser().progress.get(a!.key)?.page).toBe(14);
    expect(readPos(first, "ch-1")?.page).toBe(14);
  });

  it("removes legacy unkeyed entries and entries of deleted profiles", async () => {
    const keep = getUser().profile!.id;
    localStorage.setItem(`${POS_PREFIX}8b5e1c2a-0000-4000-8000-000000000001`, JSON.stringify({ page: 9, t: 1 }));
    localStorage.setItem(`${POS_PREFIX}ch.12`, JSON.stringify({ page: 2, t: 1 }));
    localStorage.setItem("dawghwa:settings", "{}");
    writePos(keep, "ch-1", 5);
    expect(migratePositions([keep])).toBe(2);
    expect(Object.keys(localStorage).filter((k) => k.startsWith(POS_PREFIX))).toEqual([`${POS_PREFIX}${keep}.ch-1`]);
    expect(localStorage.getItem("dawghwa:settings")).toBe("{}");

    const gone = await createProfile("Temp");
    writePos(gone.id, "ch-2", 1);
    await deleteProfile(gone.id);
    expect(readPos(gone.id, "ch-2")).toBeUndefined();
    expect(readPos(keep, "ch-1")?.page).toBe(5);
  });

  it("migrates on start", async () => {
    localStorage.setItem(`${POS_PREFIX}legacy-chapter`, JSON.stringify({ page: 9, t: 1 }));
    await initUser();
    expect(localStorage.getItem(`${POS_PREFIX}legacy-chapter`)).toBeNull();
  });

  it("keeps at most 20 chapters per profile", () => {
    const pid = getUser().profile!.id;
    for (let i = 0; i < 25; i++) writePos(pid, `c${i}`, i);
    expect(Object.keys(localStorage).filter((k) => k.startsWith(`${POS_PREFIX}${pid}.`))).toHaveLength(20);
  });

  it("ignores malformed entries", () => {
    const pid = getUser().profile!.id;
    localStorage.setItem(`${POS_PREFIX}${pid}.bad`, "{not json");
    localStorage.setItem(`${POS_PREFIX}${pid}.neg`, JSON.stringify({ page: -1, t: 1 }));
    expect(readPos(pid, "bad")).toBeUndefined();
    expect(readPos(pid, "neg")).toBeUndefined();
    expect(readPos(undefined, "bad")).toBeUndefined();
  });
});
