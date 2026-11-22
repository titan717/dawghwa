import { describe, expect, it } from "vitest";
import type { EventRecord } from "../store/db";
import type { Title } from "../titles";
import { evidenceIndex, tasteEvidence, tasteLabel } from "./confidence";

const mk = (key: string, meta = true): Title => ({ key, sourceId: "x", id: key, url: "", title: `Title ${key}`, meta: meta ? { genres: ["Action"] } : undefined });
let seq = 0;
const e = (kind: string, titleKey: string, at = ++seq): EventRecord => ({ profileId: "p", seq: ++seq, kind, titleKey, at });
const titles = new Map<string, Title>([..."abcdefgh"].map((k) => [k, mk(k)] as [string, Title]).concat([["z", mk("z", false)]]));

describe("evidence index", () => {
  it("follows C = M * (1 - exp(-n/5))", () => {
    expect(evidenceIndex(1, 0)).toBe(0);
    expect(evidenceIndex(0, 10)).toBe(0);
    expect(evidenceIndex(1, 5)).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(evidenceIndex(0.5, 5)).toBeCloseTo(0.5 * (1 - Math.exp(-1)), 6);
  });

  it("maps to early / growing / strong at 0.35 and 0.70", () => {
    expect(tasteLabel(0)).toBe("early");
    expect(tasteLabel(0.3499)).toBe("early");
    expect(tasteLabel(0.35)).toBe("growing");
    expect(tasteLabel(0.6999)).toBe("growing");
    expect(tasteLabel(0.7)).toBe("strong");
    // full metadata: 2 titles early, 3 growing, 7 strong
    expect(tasteLabel(evidenceIndex(1, 2))).toBe("early");
    expect(tasteLabel(evidenceIndex(1, 3))).toBe("growing");
    expect(tasteLabel(evidenceIndex(1, 6))).toBe("growing");
    expect(tasteLabel(evidenceIndex(1, 7))).toBe("strong");
  });
});

describe("taste evidence from events", () => {
  it("is early with no history", () => {
    const r = tasteEvidence([], titles);
    expect(r).toMatchObject({ c: 0, nEff: 0, interacted: 0, label: "early" });
    expect(r.topTitleKey).toBeUndefined();
  });

  it("counts distinct informative titles; opens and binges do not inflate it", () => {
    const evs = [e("open", "a"), e("open", "b"), ...Array.from({ length: 40 }, () => e("chapter_read", "c")), e("image_error", "d"), e("surprise_pick", "e")];
    const r = tasteEvidence(evs, titles);
    expect(r.nEff).toBe(1);
    expect(r.interacted).toBe(3);
    expect(r.label).toBe("early");
  });

  it("counts explicit negatives as informative but never cites them", () => {
    const r = tasteEvidence([e("chapter_read", "a"), e("like", "b"), e("chapter_read", "c"), e("dislike", "c")], titles);
    expect(r.nEff).toBe(3);
    expect(r.topTitleKey).toBe("b");
  });

  it("lowers the signal when titles lack metadata", () => {
    const full = tasteEvidence(["a", "b", "c", "d"].map((k) => e("like", k)), titles);
    const partial = tasteEvidence(["a", "b", "c", "d", "z"].map((k) => e("like", k)), titles);
    expect(partial.m).toBeCloseTo(0.8);
    expect(partial.c).toBeLessThan(full.c);
    expect(partial.nEff).toBe(4);
  });

  it("respects unhide, forgotten titles and reset", () => {
    expect(tasteEvidence([e("hide", "a"), e("unhide", "a")], titles).nEff).toBe(0);
    const evs = ["a", "b", "c", "d", "e", "f", "g"].map((k) => e("like", k));
    expect(tasteEvidence(evs, titles).label).toBe("strong");
    expect(tasteEvidence(evs, titles, { forgotten: new Set(["a", "b", "c", "d"]) }).label).toBe("growing");
    expect(tasteEvidence(evs, titles, { resetAt: Infinity }).nEff).toBe(0);
  });
});
