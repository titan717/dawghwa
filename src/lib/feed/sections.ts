import type { BrowseQuery, MangaKind } from "../api/types";
import type { LearnerState } from "../intel/learner";
import { evidence } from "../intel/learner";
import { detectThemes } from "../intel/themes";
import type { Prefs } from "../intel/rank";
import type { Title } from "../titles";

/**
 * Home sections are data, not hard-coded screens. Each catalogue section is a
 * real catalogue query (GET /api/catalog); "local" filters (story themes) are
 * applied to that query's results and the subtitle says how the row was made.
 * A row with fewer than `min` real items is not shown: no filler content.
 */

export interface SectionDef {
  id: string;
  title: string;
  /** Honest one-line description of how the row is built. */
  subtitle: string;
  query: BrowseQuery;
  /** Local filter over the query results. */
  filter?: (t: Title) => boolean;
  /** Feature keys this row is about (used to personalise row order). */
  focus: string[];
  /** Base priority (higher = earlier) before personalisation. */
  priority: number;
  min?: number;
  /** Larger cards / editorial layout. */
  layout?: "row" | "wide" | "ranked" | "spread";
  /** Link target for "See all". */
  more?: string;
}

const themeFilter = (id: string) => (t: Title) => detectThemes(t).includes(id);
const kindQ = (kinds: MangaKind[], extra: BrowseQuery = {}): BrowseQuery => ({ kinds, order: "popular", limit: 40, ...extra });
const THIS_YEAR = new Date().getFullYear();
const DARK = new Set(["psychological", "tragedy", "horror", "gore", "thriller"]);

export const CATALOGUE_SECTIONS: SectionDef[] = [
  { id: "trending", title: "Popular this year", subtitle: `Most-followed series first published in ${THIS_YEAR}`, query: { order: "popular", year: THIS_YEAR, limit: 40 }, focus: [], priority: 90, layout: "ranked", more: `/discover?year=${THIS_YEAR}` },
  { id: "new-chapters", title: "New chapters", subtitle: "Most recently updated series", query: { order: "latest", limit: 40 }, focus: [], priority: 85, more: "/discover?order=latest" },
  { id: "popular-manhwa", title: "Popular manhwa", subtitle: "Korean series, by followers", query: kindQ(["manhwa"]), focus: ["k:manhwa"], priority: 80, more: "/discover?kind=manhwa" },
  { id: "popular-manga", title: "Popular manga", subtitle: "Japanese series, by followers", query: kindQ(["manga"]), focus: ["k:manga"], priority: 79, more: "/discover?kind=manga" },
  { id: "popular-manhua", title: "Popular manhua", subtitle: "Chinese series, by followers", query: kindQ(["manhua"]), focus: ["k:manhua"], priority: 60, more: "/discover?kind=manhua" },
  { id: "completed", title: "Finished series", subtitle: "Completed, most recently updated first", query: { status: ["completed"], order: "latest", limit: 40 }, focus: ["st:completed"], priority: 70, layout: "spread", more: "/discover?status=completed&order=latest" },
  { id: "top-rated", title: "Highest rated", subtitle: "By reader rating", query: { order: "rating", limit: 40 }, focus: [], priority: 65, layout: "ranked", more: "/discover?order=rating" },
  { id: "revenge", title: "Revenge stories", subtitle: "Synopsis mentions revenge or vengeance", query: kindQ(["manhwa"], { includedTags: ["Action"], limit: 100 }), filter: themeFilter("revenge"), focus: ["s:revenge"], priority: 50, layout: "wide", more: "/search?q=revenge%20manhwa" },
  { id: "regression", title: "Second chances", subtitle: "Regression and time-travel stories", query: { includedTags: ["Fantasy"], order: "popular", limit: 100 }, filter: themeFilter("regression"), focus: ["s:regression", "t:time travel"], priority: 49, layout: "wide", more: "/search?q=regression" },
  { id: "overpowered", title: "Overpowered leads", subtitle: "Synopsis calls the lead the strongest, overpowered or invincible", query: { includedTags: ["Action"], order: "popular", limit: 100 }, filter: themeFilter("overpowered"), focus: ["s:overpowered"], priority: 48, more: "/search?q=overpowered%20mc" },
  { id: "dark-fantasy", title: "Dark fantasy", subtitle: "Fantasy tagged psychological, tragedy, horror, gore or thriller", query: { includedTags: ["Fantasy"], order: "popular", limit: 100 }, filter: (t) => (t.meta?.tags ?? []).some((x) => DARK.has(x.toLowerCase())), focus: ["g:fantasy", "g:tragedy", "g:psychological"], priority: 47, layout: "spread", more: "/search?q=dark%20fantasy" },
  { id: "cultivation", title: "Cultivation and murim", subtitle: "Martial-arts series whose synopsis mentions cultivation, sects or murim", query: { includedTags: ["Martial Arts"], order: "popular", limit: 100 }, filter: themeFilter("cultivation"), focus: ["s:cultivation", "t:martial arts", "g:wuxia"], priority: 46, more: "/search?q=cultivation" },
  { id: "dungeon", title: "Dungeons and towers", subtitle: "Synopsis mentions dungeons, towers, gates or hunters", query: { includedTags: ["Action", "Fantasy"], order: "popular", limit: 100 }, filter: themeFilter("dungeon"), focus: ["s:dungeon"], priority: 45, layout: "wide", more: "/search?q=dungeon" },
  { id: "martial-arts", title: "Martial arts", subtitle: "Tagged Martial Arts, by followers", query: { includedTags: ["Martial Arts"], order: "popular", limit: 40 }, focus: ["t:martial arts", "g:action"], priority: 43, more: "/discover?tag=Martial%20Arts" },
  { id: "psychological", title: "Mind games", subtitle: "Tagged Psychological, by followers", query: { includedTags: ["Psychological"], order: "popular", limit: 40 }, focus: ["g:psychological"], priority: 42, layout: "wide", more: "/discover?tag=Psychological" },
  { id: "romance", title: "Romance", subtitle: "Popular romance across formats", query: { includedTags: ["Romance"], order: "popular", limit: 40 }, focus: ["g:romance"], priority: 44, more: "/discover?tag=Romance" },
];

/**
 * Personalised row order: each row's base priority plus the profile's learned
 * affinity for the row's focus features (only once there is real evidence),
 * plus onboarding picks. Fixed rows (featured, continue, picked) are handled
 * by the page and are not part of this ordering.
 */
export function orderSections(defs: SectionDef[], state: LearnerState | null, prefs?: Prefs): SectionDef[] {
  const e = state ? evidence(state) : 0;
  const prefKeys = new Set([...(prefs?.genres ?? []).map((g) => `g:${g.toLowerCase()}`), ...(prefs?.genres ?? []).map((g) => `t:${g.toLowerCase()}`), ...(prefs?.kinds ?? []).map((k) => `k:${k}`)]);
  const avoidKeys = new Set((prefs?.avoid ?? []).map((g) => `g:${g.toLowerCase()}`));
  return defs
    .map((d) => {
      let boost = 0;
      for (const f of d.focus) {
        const a = state?.affinity[f];
        if (a && a.pos >= 2) boost += Math.max(-20, Math.min(25, a.score * 6)) * e;
        if (prefKeys.has(f)) boost += 12 * (1 - e * 0.5);
        if (avoidKeys.has(f)) boost -= 60;
      }
      return { d, v: d.priority + boost };
    })
    .sort((a, b) => b.v - a.v)
    .map((x) => x.d);
}

/** Remove items already shown in earlier rows so the page does not repeat itself. */
export function dedupeAcross<T extends { key: string }>(rows: T[][], minPerRow: number): T[][] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const fresh = row.filter((t) => !seen.has(t.key));
    const out = fresh.length >= minPerRow ? fresh : row; // never empty a row just to dedupe
    out.slice(0, 20).forEach((t) => seen.add(t.key));
    return out;
  });
}
