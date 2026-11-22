import { useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Dices } from "lucide-react";
import { Cover } from "@/components/Cover";
import { Kicker } from "@/components/Editorial";
import { ResultsError } from "@/components/DiscoveryStates";
import { toast } from "@/components/Toast";
import { useRankContext } from "@/lib/feed/context";
import { surprise } from "@/lib/intel/rank";
import { signal } from "@/lib/store/user";
import { useBrowse, useVocabulary } from "@/lib/query";
import { titlePath, type Title, isMature } from "@/lib/titles";

/**
 * Discover hub. Every tile links to a real filter: genre / format / status /
 * order map to /api/browse filters on the catalogue view; story themes and
 * collections are natural-language searches whose filters the Search screen
 * shows as chips (server or on-device). Tile artwork comes from one popular
 * browse pool filtered locally; a tile with no matching covers stays typographic.
 */

import { GENRES } from "@/lib/genres";

const FORMATS = [
  { kind: "manhwa", label: "Manhwa", note: "Korean. Mostly full-colour vertical webtoons." },
  { kind: "manga", label: "Manga", note: "Japanese. Paged, read right to left." },
  { kind: "manhua", label: "Manhua", note: "Chinese. Cultivation, wuxia and more." },
] as const;

const SHELVES = [
  { to: "/discover?order=popular&new=365", label: "Rising this year", note: "Most followed, added in the last 12 months" },
  { to: "/discover?order=rating", label: "Highest rated", note: "By reader rating" },
  { to: "/discover?order=latest", label: "New chapters", note: "Most recently updated" },
  { to: "/discover?status=completed&order=latest", label: "Completed", note: "Finished series, start to end" },
  { to: "/discover?order=new", label: "Newly added", note: "Latest additions to the catalogue" },
  { to: "/discover?view=all", label: "Whole catalogue", note: "Every filter, every format" },
];

const THEMES = [
  { q: "revenge manhwa", label: "Revenge" },
  { q: "regression", label: "Regression" },
  { q: "overpowered mc", label: "Overpowered leads" },
  { q: "cultivation", label: "Cultivation" },
  { q: "dungeon", label: "Dungeons & towers" },
  { q: "dark fantasy", label: "Dark fantasy" },
  { q: "time travel", label: "Time travel" },
  { q: "wholesome", label: "Wholesome" },
];

const COLLECTIONS = [
  { q: "completed fantasy manhwa", label: "Finished fantasy manhwa", note: "Completed, Fantasy, Manhwa" },
  { q: "hidden gems with fewer than 100 chapters", label: "Short hidden gems", note: "High rating, small following, under 100 chapters" },
  { q: "completed romance under 60 chapters", label: "A weekend romance", note: "Completed romance under 60 chapters" },
  { q: "scary horror manga", label: "Lights off", note: "Horror manga, scary moods" },
  { q: "seinen psychological", label: "Mind games", note: "Seinen, Psychological" },
  { q: "martial arts manhua", label: "Murim & wuxia", note: "Martial arts manhua" },
];

const has = (t: Title, g: string) => (t.meta?.genres ?? []).concat(t.meta?.tags ?? []).some((x) => x.toLowerCase() === g.toLowerCase());

function Art({ items }: { items: Title[] }) {
  if (!items.length) return null;
  return (
    <span className="tile-art" aria-hidden="true">
      {items.slice(0, 3).map((t) => (
        <Cover key={t.key} mature={isMature(t)} src={t.cover} title={t.title} sizes="80px" />
      ))}
    </span>
  );
}

export function DiscoverHub() {
  const nav = useNavigate();
  const ctx = useRankContext({ excludeLibrary: true });
  const vocab = useVocabulary();
  const a = useBrowse({ order: "popular", limit: 100 });
  const b = useBrowse({ order: "rating", limit: 100 });
  const recent = useRef<string[]>([]);
  const pool = useMemo(() => {
    const m = new Map<string, Title>();
    for (const q of [a, b]) for (const t of q.data?.items ?? []) if (t.cover) m.set(t.key, t);
    return [...m.values()];
  }, [a, b]);
  const known = useMemo(() => new Set((vocab.data?.tags ?? []).map((t) => t.name)), [vocab.data]);
  const genres = useMemo(() => {
    const used = new Set<string>();
    return GENRES.filter((g) => !known.size || known.has(g)).map((g) => {
      const art = pool.filter((t) => has(t, g) && !used.has(t.key)).slice(0, 3);
      art.forEach((t) => used.add(t.key));
      return { g, art };
    });
  }, [pool, known]);
  const formats = useMemo(() => FORMATS.map((f) => ({ ...f, art: pool.filter((t) => t.meta?.kind === f.kind).slice(3, 6) })), [pool]);

  const doSurprise = () => {
    const pick = surprise(pool, ctx, recent.current);
    if (!pick) {
      toast(a.isLoading ? "Still loading titles, try again in a moment" : "Nothing new to surprise you with right now");
      return;
    }
    recent.current = [pick.title.key, ...recent.current].slice(0, 10);
    void signal("surprise_pick", pick.title);
    nav(titlePath(pick.title), { state: { reason: pick.reason?.text ?? "Surprise pick" } });
  };

  return (
    <div className="page discover-hub">
      <header className="hub-head">
        <div>
          <h1>Discover</h1>
          <p className="muted">Something worth reading, by genre, format, theme or mood.</p>
        </div>
        <button className="btn btn-lime btn-lg" onClick={doSurprise}>
          <Dices size={18} /> Surprise me
        </button>
      </header>
      {a.isError && !a.data && <ResultsError error={a.error} retry={() => void a.refetch()} compact />}

      <section className="section" aria-labelledby="hub-genres">
        <div className="section-head">
          <div className="section-titles">
            <Kicker n="01">Genres</Kicker>
            <h2 id="hub-genres">Pick a genre</h2>
          </div>
        </div>
        <div className="genre-grid">
          {genres.map(({ g, art }, i) => (
            <Link key={g} to={`/discover?tag=${encodeURIComponent(g)}`} className={`genre-tile ${i < 2 ? "genre-tile-lg" : ""}`}>
              <span className="genre-name">{g}</span>
              <Art items={art} />
            </Link>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="hub-formats">
        <div className="section-head">
          <div className="section-titles">
            <Kicker n="02">Formats</Kicker>
            <h2 id="hub-formats">Manhwa, manga or manhua</h2>
          </div>
        </div>
        <div className="format-grid">
          {formats.map((f) => (
            <Link key={f.kind} to={`/discover?kind=${f.kind}`} className="format-tile panel">
              <span>
                <span className="format-name">{f.label}</span>
                <span className="format-note">{f.note}</span>
              </span>
              <Art items={f.art} />
            </Link>
          ))}
        </div>
      </section>

      <div className="hub-split">
        <section className="section" aria-labelledby="hub-shelves">
          <div className="section-head">
            <div className="section-titles">
              <Kicker n="03">Shelves</Kicker>
              <h2 id="hub-shelves">Trending, popular, finished</h2>
            </div>
          </div>
          <ol className="shelf-list">
            {SHELVES.map((s, i) => (
              <li key={s.to}>
                <Link to={s.to}>
                  <span className="shelf-no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="shelf-body">
                    <span className="shelf-label">{s.label}</span>
                    <span className="shelf-note">{s.note}</span>
                  </span>
                  <ArrowRight size={18} />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="section" aria-labelledby="hub-themes">
          <div className="section-head">
            <div className="section-titles">
              <Kicker n="04">Story themes</Kicker>
              <h2 id="hub-themes">What happens in it</h2>
              <p>Matched from synopses on this device, so results can miss some titles.</p>
            </div>
          </div>
          <div className="theme-cloud">
            {THEMES.map((t) => (
              <Link key={t.q} to={`/search?q=${encodeURIComponent(t.q)}`} className="theme-chip">
                {t.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="section" aria-labelledby="hub-collections">
        <div className="section-head">
          <div className="section-titles">
            <Kicker n="05">Collections</Kicker>
            <h2 id="hub-collections">Curated searches</h2>
            <p>Each one is a plain-language search. Open it to see exactly which filters apply.</p>
          </div>
        </div>
        <div className="collection-grid">
          {COLLECTIONS.map((c) => (
            <Link key={c.q} to={`/search?q=${encodeURIComponent(c.q)}`} className="collection-tile">
              <span className="collection-label">{c.label}</span>
              <span className="collection-note">{c.note}</span>
              <span className="collection-q">"{c.q}"</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
