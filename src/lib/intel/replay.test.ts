import { describe, expect, it } from "vitest";
import { catalog } from "@/test/catalog";
import type { EventRecord } from "../store/db";
import type { Title } from "../titles";
import { chronoSplit, formatReport, listMetrics, pairedBootstrap, replay, syntheticHistories } from "./replay";

const T0 = Date.UTC(2026, 0, 1);
const mk = (key: string): Title => ({ key, sourceId: "x", id: key, url: "", title: key, meta: { genres: [key] } });
let seq = 0;
const e = (kind: string, titleKey: string, day: number): EventRecord => ({ profileId: "p", seq: ++seq, kind, titleKey, at: T0 + day * 86_400_000 });

describe("chronological split", () => {
  const events = [
    e("chapter_read", "a", 1),
    e("library_add", "b", 2),
    e("like", "c", 3),
    e("chapter_read", "d", 4),
    e("open", "o", 4.5),
    e("hide", "h1", 4.6),
    e("chapter_read", "e", 5), // cut-off: 80th pct of 6 engaged -> index 4
    e("like", "f", 6),
    e("chapter_read", "a", 7), // seen before T: never relevant
    e("not_interested", "n", 8),
    e("open", "u", 9), // open only: unknown, not relevant
  ];
  const s = chronoSplit(events)!;

  it("trains only on events before the cut-off", () => {
    expect(s.cutoff).toBe(T0 + 5 * 86_400_000);
    expect(s.train.every((x) => x.at < s.cutoff)).toBe(true);
    expect([...s.seen].sort()).toEqual(["a", "b", "c", "d", "h1", "o"]);
  });

  it("tests on later first engagements with graded gains; unobserved and opens are unknown", () => {
    expect(Object.fromEntries(s.relevant)).toEqual({ e: 1, f: 3 });
    expect([...s.negatives]).toEqual(["n"]);
  });

  it("skips profiles with fewer than 5 engaged titles", () => {
    expect(chronoSplit(events.slice(0, 4))).toBeNull();
  });
});

describe("list metrics", () => {
  const rel = new Map([["a", 3], ["b", 1]]);
  const neg = new Set(["x"]);
  const list = ["a", "x", "u", "b"].map(mk);

  it("computes P/R/NDCG with unknowns as non-hits, negatives separately", () => {
    const m = listMetrics(list, rel, neg, 4);
    expect(m.precision).toBeCloseTo(0.5);
    expect(m.recall).toBeCloseTo(1);
    const dcg = 7 / Math.log2(2) + 1 / Math.log2(5);
    const idcg = 7 / Math.log2(2) + 1 / Math.log2(3);
    expect(m.ndcg).toBeCloseTo(dcg / idcg, 6);
    expect(m.ndcgBinary).toBeCloseTo((1 + 1 / Math.log2(5)) / (1 + 1 / Math.log2(3)), 6);
    expect(m.harm).toBeCloseTo(0.25);
    expect(listMetrics([mk("a"), mk("b")], rel, neg, 2).ndcg).toBeCloseTo(1);
  });

  it("bootstrap interval brackets the mean", () => {
    const ci = pairedBootstrap([0.5, 0.6, 0.7], [0.1, 0.2, 0.2]);
    expect(ci.mean).toBeCloseTo(13 / 30);
    expect(ci.lo).toBeLessThanOrEqual(ci.mean);
    expect(ci.hi).toBeGreaterThanOrEqual(ci.mean);
  });
});

describe("replay on synthetic histories (synthetic, regression only)", { timeout: 60_000 }, () => {
  const histories = syntheticHistories(catalog);
  const rep = replay(histories, catalog);

  it("prints the metrics table", () => {
    console.log("\n" + formatReport(rep) + "\n");
    expect(rep.profiles).toBeGreaterThanOrEqual(18);
  });

  it("holds the guardrails", () => {
    expect(rep.guardrails).toEqual({ duplicates: 0, seenLeak: 0 });
  });

  it("current ranker beats popularity and random on held-out later reads", () => {
    const by = Object.fromEntries(rep.systems.map((s) => [s.id, s.at[10]!]));
    expect(by.S3!.ndcg).toBeGreaterThan(by.S1!.ndcg);
    expect(by.S3!.ndcg).toBeGreaterThan(by.S2!.ndcg);
    expect(by.S3!.harm).toBeLessThanOrEqual(by.S1!.harm);
  });

  it("is deterministic", () => {
    const again = replay(syntheticHistories(catalog), catalog);
    expect(again.systems.map((s) => s.at[10]!.ndcg)).toEqual(rep.systems.map((s) => s.at[10]!.ndcg));
  });
});
