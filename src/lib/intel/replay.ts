import type { EventRecord } from "../store/db";
import type { SignalKind } from "../store/user";
import type { Title } from "../titles";
import { tasteEvidence, type TasteLabel } from "./confidence";
import { PERSONAS, type Persona } from "./evaluate";
import { cosineSparse, vectorize } from "./features";
import { effectiveEvents, train } from "./learner";
import { rank } from "./rank";

/**
 * Chronological replay evaluation (docs/RECOMMENDER_EVAL.md).
 *
 * Per profile: take its effective events, find the first-engagement time of
 * each engaged title, cut at the 80th percentile (T), train only on events
 * before T (with now = T) and test on titles first engaged at or after T.
 *
 *  - Unobserved titles are unknown, not negatives: precision is a lower bound.
 *  - Explicit negatives after T (dislike / not interested / hide / dropped)
 *    are a separate set; "harm" = share of the top K the reader later rejected.
 *  - Titles with any event before T are not candidates (already seen/hidden).
 *
 * Works on any event log. The repo has no real reading history, so the
 * shipped run uses synthetic persona histories: those numbers are labelled
 * "synthetic, regression only" and are never real-world accuracy.
 */

export const KS = [10, 20] as const;

const ENGAGED: Record<string, number> = {
  chapter_read: 1,
  return: 1,
  library_add: 2,
  more_like_this: 2,
  like: 3,
  favorite: 3,
  title_finished: 3,
};
const NEGATIVE = new Set<SignalKind>(["dislike", "not_interested", "hide", "dropped"]);

export interface Split {
  cutoff: number;
  train: EventRecord[];
  /** Graded gain (1..3) per relevant held-out title. */
  relevant: Map<string, number>;
  /** Explicit negatives after the cut-off (not seen before it). */
  negatives: Set<string>;
  /** Titles with any event before the cut-off. */
  seen: Set<string>;
  engaged: number;
}

/** Chronological per-profile split. Returns null when fewer than `minEngaged` engaged titles. */
export function chronoSplit(events: EventRecord[], pct = 0.8, minEngaged = 5): Split | null {
  const eff = effectiveEvents(events).sort((a, b) => a.at - b.at || a.seq - b.seq);
  const first = new Map<string, number>();
  for (const e of eff) if (ENGAGED[e.kind] && !first.has(e.titleKey)) first.set(e.titleKey, e.at);
  if (first.size < minEngaged) return null;
  const order = [...first.entries()].sort((a, b) => a[1] - b[1]);
  const idx = Math.min(order.length - 1, Math.max(1, Math.floor(order.length * pct)));
  const cutoff = order[idx]![1];
  const train = eff.filter((e) => e.at < cutoff);
  const seen = new Set(train.map((e) => e.titleKey));
  const relevant = new Map<string, number>();
  const negatives = new Set<string>();
  for (const e of eff) {
    if (e.at < cutoff || seen.has(e.titleKey)) continue;
    const g = ENGAGED[e.kind];
    if (g) relevant.set(e.titleKey, Math.max(relevant.get(e.titleKey) ?? 0, g));
    if (NEGATIVE.has(e.kind as SignalKind)) negatives.add(e.titleKey);
  }
  // A title engaged and later rejected counts as a negative, not a hit.
  for (const k of negatives) relevant.delete(k);
  return { cutoff, train, relevant, negatives, seen, engaged: first.size };
}

export interface ListMetrics {
  precision: number;
  recall: number;
  ndcg: number;
  ndcgBinary: number;
  diversity: number;
  harm: number;
}

/** Intra-list diversity: mean pairwise 1 - cosine of feature vectors. */
export function intraListDiversity(list: Title[]): number {
  let pairs = 0;
  let dis = 0;
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      dis += 1 - cosineSparse(vectorize(list[i]!), vectorize(list[j]!));
      pairs++;
    }
  return pairs ? dis / pairs : 0;
}

export function listMetrics(ranked: Title[], relevant: Map<string, number>, negatives: Set<string>, k: number): ListMetrics {
  const top = ranked.slice(0, k);
  let hits = 0;
  let dcg = 0;
  let dcgB = 0;
  let harm = 0;
  top.forEach((t, i) => {
    const g = relevant.get(t.key) ?? 0;
    if (g > 0) {
      hits++;
      dcg += (2 ** g - 1) / Math.log2(i + 2);
      dcgB += 1 / Math.log2(i + 2);
    }
    if (negatives.has(t.key)) harm++;
  });
  const gains = [...relevant.values()].sort((a, b) => b - a).slice(0, k);
  const idcg = gains.reduce((s, g, i) => s + (2 ** g - 1) / Math.log2(i + 2), 0);
  const idcgB = gains.reduce((s, _g, i) => s + 1 / Math.log2(i + 2), 0);
  return {
    precision: hits / k,
    recall: relevant.size ? hits / relevant.size : 0,
    ndcg: idcg ? dcg / idcg : 0,
    ndcgBinary: idcgB ? dcgB / idcgB : 0,
    diversity: intraListDiversity(top),
    harm: harm / k,
  };
}

export interface SystemContext {
  candidates: Title[];
  catalog: Title[];
  train: EventRecord[];
  cutoff: number;
  titles: Map<string, Title>;
  seed: number;
}

export interface System {
  id: string;
  name: string;
  run: (ctx: SystemContext, k: number) => Title[];
}

function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Systems compared (IDs follow docs/RECOMMENDER_EVAL.md). */
export const SYSTEMS: System[] = [
  { id: "S0", name: "Catalogue order", run: (c, k) => c.candidates.slice(0, k) },
  { id: "S1", name: "Popularity (follows)", run: (c, k) => [...c.candidates].sort((a, b) => (b.follows ?? 0) - (a.follows ?? 0)).slice(0, k) },
  { id: "S2", name: "Seeded random", run: (c, k) => shuffle(c.candidates, rng(c.seed)).slice(0, k) },
  {
    id: "S3",
    name: "Current rank() (Top Picks config)",
    run: (c, k) => {
      const state = train({ profileId: "replay", events: c.train, titles: c.titles, pool: c.catalog, now: c.cutoff });
      // Same options Home's Top Picks uses on main.
      return rank(c.candidates, { state, titleOf: (key) => c.titles.get(key), explore: 0.15 }, { k, lambda: 0.72, exploreEvery: 6 }).map((s) => s.title);
    },
  },
];

export interface ProfileHistory {
  id: string;
  events: EventRecord[];
}

export interface SystemReport {
  id: string;
  name: string;
  /** Macro-averaged per K. */
  at: Record<number, ListMetrics & { coverage: number }>;
  perProfileNdcg10: number[];
}

export interface ReplayReport {
  profiles: number;
  skipped: number;
  medianEngaged: number;
  candidates: number;
  systems: SystemReport[];
  /** NDCG@10 of `bucketSystem` grouped by the taste-signal label at the cut-off. */
  buckets: Record<TasteLabel, { profiles: number; ndcg10: number; recall10: number }>;
  bucketSystem: string;
  guardrails: { duplicates: number; seenLeak: number };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function replay(histories: ProfileHistory[], catalog: Title[], systems: System[] = SYSTEMS, opts: { pct?: number; seed?: number } = {}): ReplayReport {
  const usable = catalog.filter((t) => t.meta);
  const titles = new Map(catalog.map((t) => [t.key, t]));
  const per = new Map<string, { k: number; m: ListMetrics }[]>();
  const covered = new Map<string, Map<number, Set<string>>>();
  const ndcg10 = new Map<string, number[]>();
  systems.forEach((s) => {
    per.set(s.id, []);
    covered.set(s.id, new Map(KS.map((k) => [k, new Set<string>()])));
    ndcg10.set(s.id, []);
  });
  const bucketsRaw: Record<TasteLabel, { n: number[]; r: number[] }> = { early: { n: [], r: [] }, growing: { n: [], r: [] }, strong: { n: [], r: [] } };
  const bucketSystem = systems.find((s) => s.id === "S3")?.id ?? systems[0]!.id;
  let skipped = 0;
  const engaged: number[] = [];
  const guard = { duplicates: 0, seenLeak: 0 };
  histories.forEach((h, pi) => {
    const split = chronoSplit(h.events, opts.pct ?? 0.8);
    if (!split || !split.relevant.size) {
      skipped++;
      return;
    }
    engaged.push(split.engaged);
    const candidates = usable.filter((t) => !split.seen.has(t.key));
    const ctx: SystemContext = { candidates, catalog: usable, train: split.train, cutoff: split.cutoff, titles, seed: (opts.seed ?? 42) + pi };
    const label = tasteEvidence(split.train, titles).label;
    for (const s of systems) {
      const list = s.run(ctx, Math.max(...KS));
      const keys = list.map((t) => t.key);
      if (new Set(keys).size !== keys.length) guard.duplicates++;
      if (keys.some((k) => split.seen.has(k))) guard.seenLeak++;
      for (const k of KS) {
        const m = listMetrics(list, split.relevant, split.negatives, k);
        per.get(s.id)!.push({ k, m });
        list.slice(0, k).forEach((t) => covered.get(s.id)!.get(k)!.add(t.key));
        if (k === 10) {
          ndcg10.get(s.id)!.push(m.ndcg);
          if (s.id === bucketSystem) {
            bucketsRaw[label].n.push(m.ndcg);
            bucketsRaw[label].r.push(m.recall);
          }
        }
      }
    }
  });
  const sorted = [...engaged].sort((a, b) => a - b);
  return {
    profiles: engaged.length,
    skipped,
    medianEngaged: sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0,
    candidates: usable.length,
    bucketSystem,
    guardrails: guard,
    buckets: Object.fromEntries(Object.entries(bucketsRaw).map(([l, v]) => [l, { profiles: v.n.length, ndcg10: mean(v.n), recall10: mean(v.r) }])) as ReplayReport["buckets"],
    systems: systems.map((s) => {
      const rows = per.get(s.id)!;
      const at = Object.fromEntries(
        KS.map((k) => {
          const ms = rows.filter((r) => r.k === k).map((r) => r.m);
          const avg = (f: (m: ListMetrics) => number) => mean(ms.map(f));
          return [k, { precision: avg((m) => m.precision), recall: avg((m) => m.recall), ndcg: avg((m) => m.ndcg), ndcgBinary: avg((m) => m.ndcgBinary), diversity: avg((m) => m.diversity), harm: avg((m) => m.harm), coverage: covered.get(s.id)!.get(k)!.size / usable.length }];
        }),
      );
      return { id: s.id, name: s.name, at, perProfileNdcg10: ndcg10.get(s.id)! };
    }),
  };
}

/** Paired bootstrap 95% interval of mean(a - b) over profiles. */
export function pairedBootstrap(a: number[], b: number[], resamples = 1000, seed = 7): { mean: number; lo: number; hi: number } {
  const d = a.map((x, i) => x - (b[i] ?? 0));
  if (!d.length) return { mean: 0, lo: 0, hi: 0 };
  const r = rng(seed);
  const means: number[] = [];
  for (let s = 0; s < resamples; s++) {
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += d[Math.floor(r() * d.length)]!;
    means.push(sum / d.length);
  }
  means.sort((x, y) => x - y);
  return { mean: mean(d), lo: means[Math.floor(resamples * 0.025)]!, hi: means[Math.floor(resamples * 0.975)]! };
}

// ------------------------------------------------------------ synthetic data

const POSITIVE_PLANS: SignalKind[][] = [
  ["chapter_read", "chapter_read"],
  ["chapter_read", "library_add"],
  ["chapter_read", "chapter_read", "chapter_read", "like"],
  ["library_add"],
  ["chapter_read", "return", "title_finished"],
  ["chapter_read", "favorite"],
];
const NEGATIVE_KINDS: SignalKind[] = ["not_interested", "hide", "dislike", "dropped"];

/**
 * Synthetic reading histories: each persona engages with `size` of its liked
 * titles in random order over 90 days, also opens some unrelated titles (no
 * label) and explicitly rejects some titles outside its taste. REGRESSION
 * ONLY: personas are defined by the same metadata the model learns from.
 */
export function syntheticHistories(catalog: Title[], opts: { sizes?: number[]; seed?: number; personas?: Persona[]; now?: number } = {}): ProfileHistory[] {
  const now = opts.now ?? Date.UTC(2026, 0, 1);
  const span = 90 * 86_400_000;
  const out: ProfileHistory[] = [];
  const usable = catalog.filter((t) => t.meta);
  (opts.personas ?? PERSONAS).forEach((p, pi) => {
    (opts.sizes ?? [6, 12, 24, 40]).forEach((size, si) => {
      const r = rng((opts.seed ?? 42) * 1000 + pi * 37 + si);
      const liked = shuffle(usable.filter(p.likes), r).slice(0, size);
      const others = shuffle(usable.filter((t) => !p.likes(t)), r);
      const events: EventRecord[] = [];
      let seq = 0;
      const push = (kind: SignalKind, t: Title, at: number) => events.push({ profileId: `syn-${pi}-${size}`, seq: ++seq, kind, titleKey: t.key, at });
      const start = now - span;
      const step = span / Math.max(1, liked.length);
      liked.forEach((t, i) => {
        let at = start + i * step + r() * step * 0.3;
        push("open", t, at);
        for (const kind of POSITIVE_PLANS[Math.floor(r() * POSITIVE_PLANS.length)]!) push(kind, t, (at += 3_600_000));
      });
      // Unrelated opens (unknown, never negative) and explicit rejections.
      const nOpens = Math.ceil(liked.length / 3);
      const nNeg = Math.ceil(liked.length / 5);
      others.slice(0, nOpens).forEach((t) => push("open", t, start + r() * span));
      // Readers reject what they are shown, which skews popular.
      const popularOthers = shuffle([...others.slice(nOpens)].sort((a, b) => (b.follows ?? 0) - (a.follows ?? 0)).slice(0, 60), r);
      popularOthers.slice(0, nNeg).forEach((t, i) => push(NEGATIVE_KINDS[i % NEGATIVE_KINDS.length]!, t, start + r() * span));
      events.sort((a, b) => a.at - b.at);
      events.forEach((e, i) => (e.seq = i + 1));
      out.push({ id: `${p.name} (${size})`, events });
    });
  });
  return out;
}

// ------------------------------------------------------------------ output

const f3 = (x: number) => x.toFixed(3);

export function formatReport(rep: ReplayReport, label = "synthetic, regression only"): string {
  const lines: string[] = [];
  lines.push(`Replay (${label}): ${rep.profiles} profiles evaluated, ${rep.skipped} skipped, median engaged titles ${rep.medianEngaged}, ${rep.candidates} catalogue titles. Chronological 80% cut-off per profile.`);
  lines.push("");
  lines.push("| System | P@10 | P@20 | R@10 | R@20 | NDCG@10 | NDCG@20 | NDCG@10 bin | Cov@10 | Cov@20 | ILD@10 | ILD@20 | Harm@10 | Harm@20 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const s of rep.systems) {
    const a = s.at[10]!;
    const b = s.at[20]!;
    lines.push(`| ${s.id} ${s.name} | ${f3(a.precision)} | ${f3(b.precision)} | ${f3(a.recall)} | ${f3(b.recall)} | ${f3(a.ndcg)} | ${f3(b.ndcg)} | ${f3(a.ndcgBinary)} | ${f3(a.coverage)} | ${f3(b.coverage)} | ${f3(a.diversity)} | ${f3(b.diversity)} | ${f3(a.harm)} | ${f3(b.harm)} |`);
  }
  const s3 = rep.systems.find((s) => s.id === "S3");
  const s1 = rep.systems.find((s) => s.id === "S1");
  if (s3 && s1) {
    const ci = pairedBootstrap(s3.perProfileNdcg10, s1.perProfileNdcg10);
    lines.push("");
    lines.push(`NDCG@10 S3 - S1: ${f3(ci.mean)} (95% paired bootstrap ${f3(ci.lo)} to ${f3(ci.hi)}, 1000 resamples, seed 7)`);
  }
  lines.push("");
  lines.push(`| Taste signal at cut-off | Profiles | NDCG@10 ${rep.bucketSystem} | R@10 ${rep.bucketSystem} |`);
  lines.push("| --- | --- | --- | --- |");
  for (const l of ["early", "growing", "strong"] as const) lines.push(`| ${l} | ${rep.buckets[l].profiles} | ${f3(rep.buckets[l].ndcg10)} | ${f3(rep.buckets[l].recall10)} |`);
  lines.push("");
  lines.push(`Guardrails: lists with duplicates ${rep.guardrails.duplicates}, lists containing already-seen/hidden titles ${rep.guardrails.seenLeak}.`);
  return lines.join("\n");
}
