import type { EventRecord } from "../store/db";
import type { SignalKind } from "../store/user";
import type { Title } from "../titles";
import { effectiveEvents } from "./learner";
import { SIGNAL_WEIGHTS } from "./signals";

/**
 * Taste signal: a transparency aid that tells the reader how much this device
 * has to go on. It is NOT a probability that a recommendation is right, it
 * does not change ranking, and it must never be presented as accuracy.
 *
 *   C = M * (1 - exp(-n_eff / 5))
 *
 *   M     = metadata coverage (0..1): share of the profile's interacted titles
 *           (any trainable event) whose metadata is known. `train()` cannot
 *           learn from titles without metadata, so they should not make the
 *           signal look strong.
 *   n_eff = number of distinct titles with at least one informative
 *           interaction: any trainable signal except a plain `open` (too weak,
 *           0.08), on a title with metadata. Explicit negatives (hide, not for
 *           me, dislike, dropped) are informative and count. Binge-reading one
 *           title counts once.
 *
 * Thresholds (documented in docs/RECOMMENDATIONS.md): early < 0.35,
 * growing < 0.70, strong >= 0.70. With full metadata coverage that is
 * 0-2 titles early, 3-6 growing, 7+ strong.
 */

export const N_SCALE = 5;
export const TASTE_THRESHOLDS = { growing: 0.35, strong: 0.7 } as const;

export type TasteLabel = "early" | "growing" | "strong";

export interface TasteEvidence {
  /** Evidence index C in [0, 1). */
  c: number;
  /** Metadata coverage M in [0, 1]. */
  m: number;
  /** Distinct informative titles (n_eff). */
  nEff: number;
  /** Distinct titles with any trainable interaction. */
  interacted: number;
  label: TasteLabel;
  /** Title the profile engaged with most strongly, for "Because you read X". */
  topTitleKey?: string;
}

export function evidenceIndex(m: number, nEff: number): number {
  if (!(m > 0) || !(nEff > 0)) return 0;
  return Math.min(1, m) * (1 - Math.exp(-nEff / N_SCALE));
}

export function tasteLabel(c: number): TasteLabel {
  if (c >= TASTE_THRESHOLDS.strong) return "strong";
  if (c >= TASTE_THRESHOLDS.growing) return "growing";
  return "early";
}

export interface EvidenceOptions {
  forgotten?: Set<string>;
  resetAt?: number;
}

export function tasteEvidence(events: EventRecord[], titles: Map<string, Title> | Record<string, Title>, opts: EvidenceOptions = {}): TasteEvidence {
  const get = (k: string) => (titles instanceof Map ? titles.get(k) : titles[k]);
  const interacted = new Set<string>();
  const withMeta = new Set<string>();
  const informative = new Set<string>();
  const strength = new Map<string, { w: number; at: number }>();
  const rejected = new Set<string>();
  for (const e of effectiveEvents(events, opts.forgotten, opts.resetAt)) {
    const sig = SIGNAL_WEIGHTS[e.kind as SignalKind];
    if (!sig) continue;
    interacted.add(e.titleKey);
    const t = get(e.titleKey);
    if (!t?.meta) continue;
    withMeta.add(e.titleKey);
    if (e.kind === "open") continue;
    informative.add(e.titleKey);
    if (!sig.y) rejected.add(e.titleKey);
    else {
      const cur = strength.get(e.titleKey) ?? { w: 0, at: 0 };
      strength.set(e.titleKey, { w: cur.w + sig.w, at: Math.max(cur.at, e.at) });
    }
  }
  const m = interacted.size ? withMeta.size / interacted.size : 0;
  const nEff = informative.size;
  const c = evidenceIndex(m, nEff);
  let topTitleKey: string | undefined;
  let best = { w: 0, at: 0 };
  for (const [k, v] of strength) {
    if (rejected.has(k)) continue; // never cite a title the reader turned down
    if (v.w > best.w || (v.w === best.w && v.at > best.at)) {
      best = v;
      topTitleKey = k;
    }
  }
  return { c, m, nEff, interacted: interacted.size, label: tasteLabel(c), topTitleKey };
}
