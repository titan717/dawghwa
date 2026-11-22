import { beforeEach, describe, expect, it } from "vitest";
import { soloLevelingChapters } from "@/test/catalog";
import { MAX_PER_PROFILE, readPos, resetPositionsForTests, writePos } from "./position";
import { createProfile, getUser, initUser } from "./user";

const [ch1, ch2] = soloLevelingChapters; // real canonical chapter keys (Solo Leveling)

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  resetPositionsForTests();
  await initUser();
});

describe("reader position mirror", () => {
  it("is scoped per profile: A's position is never used for B", async () => {
    const a = getUser().profile!.id;
    const b = (await createProfile("Second reader")).id;
    writePos(a, ch1!.id, 17, 0.25);
    expect(localStorage.getItem(`dawghwa.pos.${a}.${ch1!.id}`)).not.toBeNull();
    expect(readPos(a, ch1!.id)).toMatchObject({ page: 17, offset: 0.25 });
    expect(readPos(b, ch1!.id)).toBeUndefined();
    writePos(b, ch1!.id, 3);
    expect(readPos(a, ch1!.id)?.page).toBe(17);
    expect(readPos(b, ch1!.id)?.page).toBe(3);
  });

  it("ignores legacy unscoped keys and removes them on the next write", () => {
    const a = getUser().profile!.id;
    const legacy = `dawghwa.pos.${ch1!.id}`;
    localStorage.setItem(legacy, JSON.stringify({ page: 30, t: Date.now() }));
    expect(readPos(a, ch1!.id)).toBeUndefined();
    writePos(a, ch2!.id, 5);
    expect(localStorage.getItem(legacy)).toBeNull();
    expect(readPos(a, ch2!.id)?.page).toBe(5);
  });

  it(`keeps at most ${MAX_PER_PROFILE} positions per profile without touching other profiles`, async () => {
    const a = getUser().profile!.id;
    const b = (await createProfile("Second reader")).id;
    writePos(b, ch1!.id, 9);
    // the real Solo Leveling chapter keys follow one pattern (…/und/s0/ch:<n>); continue it for chapters 1..25
    const prefix = ch1!.id.replace(/ch:1$/, "ch:");
    for (let n = 1; n <= MAX_PER_PROFILE + 5; n++) {
      localStorage.setItem(`dawghwa.pos.${a}.${prefix}${n}`, JSON.stringify({ page: n, t: n }));
    }
    writePos(a, ch2!.id, 1);
    const mine = Object.keys(localStorage).filter((k) => k.startsWith(`dawghwa.pos.${a}.`));
    expect(mine).toHaveLength(MAX_PER_PROFILE);
    expect(readPos(a, ch2!.id)?.page).toBe(1);
    expect(readPos(b, ch1!.id)?.page).toBe(9);
  });
});
