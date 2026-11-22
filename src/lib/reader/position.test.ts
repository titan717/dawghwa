import { beforeEach, describe, expect, it } from "vitest";
import { hashChapterId, POS_LIMIT, POS_PREFIX, posKey, prunePos, readPos, writePos } from "./position";

const A = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CH = "mangadex:abc/en/ch:12";

describe("reader position mirror", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a position for one profile", () => {
    writePos(A, CH, { page: 7, offset: 0.4 }, { skip: false, now: 1000 });
    expect(readPos(A, CH)).toEqual({ page: 7, offset: 0.4, t: 1000 });
  });

  it("keeps profiles apart", () => {
    writePos(A, CH, { page: 7 }, { skip: false });
    expect(readPos(B, CH)).toBeUndefined();
    writePos(B, CH, { page: 2 }, { skip: false });
    expect(readPos(A, CH)?.page).toBe(7);
    expect(readPos(B, CH)?.page).toBe(2);
  });

  it("never puts the chapter id (or the source id inside it) in the key", () => {
    writePos(A, CH, { page: 1 }, { skip: false });
    const keys = Object.keys(localStorage);
    expect(keys).toEqual([posKey(A, CH)]);
    expect(keys[0]).toMatch(/^dawghwa\.pos\.[0-9a-f-]+\.[0-9a-z]{1,7}$/);
    expect(keys[0]).not.toContain("mangadex");
    expect(keys[0]).not.toContain("ch:12");
  });

  it("hashes stably and distinguishes chapters", () => {
    expect(hashChapterId(CH)).toBe(hashChapterId(CH));
    expect(hashChapterId(CH)).not.toBe(hashChapterId("mangadex:abc/en/ch:13"));
    expect(hashChapterId("")).toMatch(/^[0-9a-z]+$/);
  });

  it("ignores legacy unscoped keys for every profile and leaves them in place", () => {
    const legacy = POS_PREFIX + CH;
    localStorage.setItem(legacy, JSON.stringify({ page: 9, t: Date.now() }));
    expect(readPos(A, CH)).toBeUndefined();
    expect(readPos(B, CH)).toBeUndefined();
    for (let i = 0; i < POS_LIMIT + 5; i++) writePos(A, `c${i}`, { page: i }, { skip: false, now: i });
    expect(localStorage.getItem(legacy)).not.toBeNull();
  });

  it("skip turns writes off (Incognito)", () => {
    writePos(A, CH, { page: 3 }, { skip: true });
    expect(readPos(A, CH)).toBeUndefined();
    expect(localStorage.length).toBe(0);
  });

  it("prunes only the writing profile's oldest entries", () => {
    for (let i = 0; i < 5; i++) writePos(B, `b${i}`, { page: i }, { skip: false, now: i });
    for (let i = 0; i < POS_LIMIT + 3; i++) writePos(A, `a${i}`, { page: i }, { skip: false, now: 100 + i });
    const aKeys = Object.keys(localStorage).filter((k) => k.startsWith(`${POS_PREFIX}${A}.`));
    expect(aKeys).toHaveLength(POS_LIMIT);
    expect(readPos(A, "a0")).toBeUndefined();
    expect(readPos(A, "a2")).toBeUndefined();
    expect(readPos(A, `a${POS_LIMIT + 2}`)?.page).toBe(POS_LIMIT + 2);
    for (let i = 0; i < 5; i++) expect(readPos(B, `b${i}`)?.page).toBe(i);
  });

  it("prunePos is a no-op under the limit and tolerates junk values", () => {
    localStorage.setItem(posKey(A, "x"), "not json");
    prunePos(A, 5);
    expect(localStorage.getItem(posKey(A, "x"))).toBe("not json");
    expect(readPos(A, "x")).toBeUndefined();
  });

  it("returns nothing without a profile or chapter", () => {
    writePos(undefined, CH, { page: 1 });
    expect(localStorage.length).toBe(0);
    expect(readPos(undefined, CH)).toBeUndefined();
    expect(readPos(A, undefined)).toBeUndefined();
  });
});
