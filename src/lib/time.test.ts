import { describe, expect, it } from "vitest";
import { relativeTime } from "./time";

const now = Date.parse("2026-11-19T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const H = 3600_000;

describe("relativeTime", () => {
  it("formats minutes, hours, days, weeks, months and years", () => {
    expect(relativeTime(ago(20_000), now)?.label).toBe("just now");
    expect(relativeTime(ago(5 * 60_000), now)?.label).toBe("5m ago");
    expect(relativeTime(ago(2 * H), now)?.label).toBe("2h ago");
    expect(relativeTime(ago(3 * 24 * H), now)?.label).toBe("3d ago");
    expect(relativeTime(ago(15 * 24 * H), now)?.label).toBe("2w ago");
    expect(relativeTime(ago(100 * 24 * H), now)?.label).toBe("3mo ago");
    expect(relativeTime(ago(800 * 24 * H), now)?.label).toBe("2y ago");
  });
  it("keeps provider strings it cannot parse and carries the ISO time", () => {
    expect(relativeTime("7y ago", now)).toEqual({ label: "7y ago" });
    expect(relativeTime(ago(2 * H), now)?.iso).toBe(ago(2 * H));
    expect(relativeTime(undefined, now)).toBeUndefined();
  });
  it("accepts unix seconds", () => {
    expect(relativeTime((now - 2 * H) / 1000, now)?.label).toBe("2h ago");
  });
});
