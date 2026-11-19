import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Dices, Play, RefreshCw, Sparkles, Timer } from "lucide-react";
import { Row, SectionHead } from "@/components/Row";
import { ChapterNo, LeadCard, WideCard } from "@/components/Editorial";
import { Hero } from "@/components/Hero";
import { CategoryShelf } from "@/components/CategoryShelf";
import { TitleCard } from "@/components/TitleCard";
import { Cover } from "@/components/Cover";
import { ErrorState, RowSkeleton } from "@/components/States";
import { toast } from "@/components/Toast";
import { CATALOGUE_SECTIONS, orderSections, type SectionDef } from "@/lib/feed/sections";
import { noteShown, useRankContext } from "@/lib/feed/context";
import { rank, rerankRow, surprise, type RankContext, type Scored } from "@/lib/intel/rank";
import { evidence } from "@/lib/intel/learner";
import { cosineSparse, vectorize } from "@/lib/intel/features";
import { useBrowse } from "@/lib/query";
import { clearCatalogFiltersFailure } from "@/lib/api/catalog";
import { useHead } from "@/lib/seo";
import { continueList, signal, useUser } from "@/lib/store/user";
import { MascotSays } from "@/components/Mascot";
import { Brand } from "@/components/Brand";
import { QuestStrip } from "@/components/Quests";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProgressRing, useSeriesFraction } from "@/components/ProgressRing";
import type { ProgressRecord } from "@/lib/store/db";
import { readerPath, titlePath, type Title, isMature, isKnownUnreadable } from "@/lib/titles";

const MIN_ROW = 6;

/** One Retry for the whole page: forget remembered failures, then refetch every failed query. */
function retryAll(qc: ReturnType<typeof useQueryClient>) {
  clearCatalogFiltersFailure();
  void qc.refetchQueries({ type: "active", predicate: (x) => x.state.status === "error" });
}

/** Page-level registry so later rows skip titles shown in earlier rows. */
function createClaims() {
  const claims = new Map<string, { order: number; keys: string[] }>();
  const subs = new Set<() => void>();
  let version = 0;
  return {
    set(id: string, order: number, keys: string[]) {
      const prev = claims.get(id);
      if (prev && prev.order === order && prev.keys.join() === keys.join()) return;
      claims.set(id, { order, keys });
      version++;
      subs.forEach((s) => s());
    },
    before(order: number) {
      const out = new Set<string>();
      claims.forEach((c) => c.order < order && c.keys.forEach((k) => out.add(k)));
      return out;
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    version: () => version,
    // failed shelves: only the first one shows the error banner, the rest step aside
    failed: new Set<number>(),
    fail(order: number, on: boolean) {
      if (this.failed.has(order) === on) return;
      if (on) this.failed.add(order);
      else this.failed.delete(order);
      version++;
      subs.forEach((s) => s());
    },
  };
}
type Claims = ReturnType<typeof createClaims>;

function useClaimed(claims: Claims, order: number) {
  useSyncExternalStore(claims.subscribe, claims.version, claims.version);
  return claims.before(order);
}

function SectionBody({ def, items }: { def: SectionDef; items: Title[] }) {
  if (def.layout === "spread") {
    const [lead, ...rest] = items;
    return (
      <section className="section spread" aria-labelledby={`row-${def.id}`}>
        <SectionHead id={def.id} title={def.title} subtitle={def.subtitle} more={def.more} />
        <div className="spread-grid">
          <LeadCard title={lead!} label={def.id === "hidden-gems" ? "Hidden gem" : def.id === "completed" ? "Finished" : undefined} />
          <div className="spread-rest">
            {rest.slice(0, 6).map((t) => (
              <TitleCard key={t.key} title={t} context={def.id} />
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (def.layout === "wide")
    return (
      <Row id={def.id} title={def.title} subtitle={def.subtitle} more={def.more} className="row-wide">
        {items.slice(0, 16).map((t) => (
          <WideCard key={t.key} title={t} />
        ))}
      </Row>
    );
  return (
    <Row id={def.id} title={def.title} subtitle={def.subtitle} more={def.more} ranked={def.layout === "ranked"}>
      {items.map((t, i) => (
        <TitleCard key={t.key} title={t} context={def.id} variant={def.layout === "ranked" ? "ranked" : "card"} rank={i + 1} />
      ))}
    </Row>
  );
}

function CatalogueSection({ def, ctx, claims, order }: { def: SectionDef; ctx: RankContext; claims: Claims; order: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(order < 4);
  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "600px 0px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);
  const q = useBrowse(visible ? def.query : null);
  const qc = useQueryClient();
  const claimed = useClaimed(claims, order);
  const items = useMemo(() => {
    const base = (q.data?.items ?? []).filter((t) => !def.filter || def.filter(t));
    const ranked = rerankRow(base, ctx);
    const fresh = ranked.filter((t) => !claimed.has(t.key));
    return (fresh.length >= MIN_ROW ? fresh : ranked).slice(0, 24);
  }, [q.data, def, ctx, claimed]);
  useEffect(() => {
    if (items.length) claims.set(def.id, order, items.slice(0, 12).map((t) => t.key));
  }, [items, claims, def.id, order]);
  const failedNow = q.isError && !q.data;
  useEffect(() => {
    claims.fail(order, failedNow);
    return () => claims.fail(order, false);
  }, [claims, order, failedNow]);
  if (failedNow) {
    const first = Math.min(...claims.failed) === order;
    if (!first) return <div ref={ref} hidden />;
    const n = claims.failed.size;
    return (
      <section className="section" ref={ref}>
        <ErrorState error={q.error} retry={() => retryAll(qc)} compact />
        {n > 1 && <p className="muted section-note">{n} shelves couldn't load. Retry reloads all of them.</p>}
      </section>
    );
  }
  if (!q.data)
    return (
      <section className="section" ref={ref} aria-busy="true">
        <SectionHead id={def.id} title={def.title} subtitle={def.subtitle} />
        <RowSkeleton layout={def.layout} />
      </section>
    );
  if (items.length < (def.min ?? MIN_ROW)) return <div ref={ref} />; // not enough real matches: row is omitted
  return (
    <div ref={ref}>
      <SectionBody def={def} items={items} />
    </div>
  );
}

function Featured({ ctx, claims }: { ctx: RankContext; claims: Claims }) {
  // most-followed series; prefer ones with a synopsis to show
  const q = useBrowse({ order: "popular", limit: 30 });
  const qc = useQueryClient();
  const failedNow = q.isError && !q.data;
  // the hero takes slot -1 in the failure registry, so when it fails every shelf below steps aside
  useEffect(() => {
    claims.fail(-1, failedNow);
    return () => claims.fail(-1, false);
  }, [claims, failedNow]);
  const items = useMemo(() => {
    // The hero is full-bleed key art, so it never features titles the provider marks suggestive or adult.
    const withCover = (q.data?.items ?? []).filter((t) => t.cover && !isMature(t));
    // titles already found to have nothing readable stay out of the hero, whose CTA promises reading
    const readable = withCover.filter((t) => !isKnownUnreadable(t.key));
    const pool = readable.length >= 3 ? readable : withCover;
    const described = pool.filter((t) => t.meta?.description);
    return rerankRow(described.length >= 3 ? described : pool, ctx).slice(0, 6);
  }, [q.data, ctx]);
  if (failedNow)
    return (
      <div className="home-error">
        <ErrorState error={q.error} retry={() => retryAll(qc)} />
      </div>
    );
  if (q.data && !items.length) return null;
  if (!items.length)
    return (
      <div className="hero hero-loading" aria-busy="true" aria-label="Loading featured series">
        <div className="hero-slide skeleton" />
      </div>
    );
  return <Hero items={items} />;
}

function ContinueReading() {
  const titles = useUser((s) => s.titles);
  const state = useUser((s) => s);
  const list = useMemo(() => continueList(state).slice(0, 12), [state]);
  if (!list.length) return null;
  return (
    <Row id="continue" title="Continue reading" more="/history" className="continue-row">
      {list.map((p) => {
        const t = titles.get(p.titleKey);
        if (!t) return null;
        const left = t.latestChapter ? Math.max(0, Math.floor(t.latestChapter - p.chapterNumber)) : undefined;
        const pct = Math.round(p.fraction * 100);
        return (
          <ContinueCard key={p.titleKey} p={p} t={t} left={left} pct={pct} />
        );
      })}
    </Row>
  );
}

function ContinueCard({ p, t, left, pct }: { p: ProgressRecord; t: Title; left?: number; pct: number }) {
  const series = useSeriesFraction(t.key, t.latestChapter);
  return (
          <Link className="continue-card" to={readerPath(t, p.chapterId, p.page || undefined)} aria-label={`Resume ${t.title}, chapter ${p.chapterNumber}, ${pct}% read`}>
            <Cover mature={isMature(t)} src={t.cover} title={t.title} sizes="64px" />
            <span className="continue-body">
              <span className="title">{t.title}</span>
              <span className="continue-meta">
                <ChapterNo n={p.chapterNumber} />
                {left ? <span className="continue-left">{left} new</span> : null}
              </span>
              <span className="progress-bar" aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
            </span>
            {series !== undefined ? (
              <ProgressRing value={series} size={44} stroke={3} className="continue-ring" label={`${Math.round(series * 100)}% of the series read`}>
                <span className="continue-go" aria-hidden="true">
                  <Play size={14} fill="currentColor" />
                </span>
              </ProgressRing>
            ) : (
              <span className="continue-go" aria-hidden="true">
                <Play size={16} fill="currentColor" />
              </span>
            )}
          </Link>
  );
}

/** Pools that personal rows rank from: real browse results only. */
function usePools(ctx: RankContext) {
  const s = ctx.state;
  const topGenres = useMemo(() => {
    if (!s) return ctx.prefs?.genres.slice(0, 2) ?? [];
    return Object.entries(s.affinity)
      .filter(([k, a]) => k.startsWith("g:") && a.pos >= 2 && a.score > 0)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 2)
      .map(([k]) => k.slice(2).replace(/\b\w/g, (c) => c.toUpperCase()).replace("Sci-fi", "Sci-Fi").replace("Slice Of Life", "Slice of Life").replace("Boys' Love", "Boys' Love"));
  }, [s, ctx.prefs]);
  const kinds = ctx.prefs?.kinds.length ? (ctx.prefs.kinds as ("manga" | "manhwa" | "manhua")[]) : undefined;
  const a = useBrowse({ order: "popular", limit: 100 });
  const b = useBrowse(topGenres.length ? { order: "popular", limit: 100, includedTags: topGenres.slice(0, 1), kinds } : null);
  const c = useBrowse(topGenres.length > 1 ? { order: "rating", limit: 100, includedTags: topGenres.slice(1, 2) } : null);
  const d = useBrowse({ order: "rating", limit: 100 });
  return useMemo(() => {
    const m = new Map<string, Title>();
    for (const q of [a, b, c, d]) for (const t of q.data?.items ?? []) m.set(t.key, t);
    return { items: [...m.values()], loading: a.isLoading || d.isLoading, error: a.error ?? d.error };
  }, [a, b, c, d]);
}

function PickedForYou({ ctx, pool, seed }: { ctx: RankContext; pool: Title[]; seed: number }) {
  const e = ctx.state ? evidence(ctx.state) : 0;
  const hasPrefs = Boolean(ctx.prefs?.genres.length || ctx.prefs?.kinds.length);
  const picks = useMemo(() => (pool.length ? rank(pool, { ...ctx, explore: 0.15 }, { k: 24, lambda: 0.72, exploreEvery: 6 }) : []), [pool, ctx, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => noteShown(picks.slice(0, 8).map((p) => p.title.key)), [picks]);
  if (!e && !hasPrefs) return null;
  if (picks.length < MIN_ROW) return null;
  return (
    <Row id="picked" title="Picked for you" subtitle={e > 0.3 ? "Learned on this device from what you read and save" : "From the genres you chose. Gets sharper as you read"}>
      {picks.map((p: Scored) => (
        <TitleCard key={p.title.key} title={p.title} reason={p.reason?.text} context="picked" />
      ))}
    </Row>
  );
}

function BecauseYouRead({ ctx }: { ctx: RankContext }) {
  const s = ctx.state;
  const seed = useMemo(() => {
    if (!s) return undefined;
    const best = Object.entries(s.liked)
      .filter(([, v]) => v > 0.8)
      .map(([k]) => ctx.titleOf?.(k))
      .filter((t): t is Title => Boolean(t?.meta?.genres?.length));
    const recent = Object.values(s.affinity).flatMap((a) => a.titles);
    return best.sort((a, b) => recent.indexOf(a.key) - recent.indexOf(b.key))[0];
  }, [s, ctx]);
  const q = useBrowse(seed ? { order: "popular", limit: 100, includedTags: seed.meta!.genres!.slice(0, 2), kinds: seed.meta?.kind ? [seed.meta.kind] : undefined } : null);
  const items = useMemo(() => {
    if (!seed || !q.data) return [];
    const sv = vectorize(seed);
    return q.data.items
      .filter((t) => t.key !== seed.key && !ctx.exclude?.has(t.key))
      .map((t) => ({ t, s: cosineSparse(sv, vectorize(t)) }))
      .filter((x) => x.s > 0.35)
      .sort((a, b) => b.s - a.s)
      .slice(0, 20)
      .map((x) => x.t);
  }, [seed, q.data, ctx.exclude]);
  if (!seed || items.length < MIN_ROW) return null;
  return (
    <Row id="because" title={`Because you read ${seed.title}`} subtitle="Shares its genres, themes and format">
      {items.map((t) => (
        <TitleCard key={t.key} title={t} context="because" />
      ))}
    </Row>
  );
}

function SomethingDifferent({ ctx, pool }: { ctx: RankContext; pool: Title[] }) {
  const s = ctx.state;
  const items = useMemo(() => {
    if (!s || Object.keys(s.liked).length < 3) return [];
    const positives = Object.keys(s.liked)
      .map((k) => ctx.titleOf?.(k))
      .filter((t): t is Title => Boolean(t?.meta));
    if (positives.length < 3) return [];
    const pv = positives.map(vectorize);
    return pool
      .filter((t) => !ctx.exclude?.has(t.key) && !s.liked[t.key] && (t.rating ?? 0) >= 7.8)
      .map((t) => ({ t, sim: Math.max(...pv.map((v) => cosineSparse(v, vectorize(t)))) }))
      .filter((x) => x.sim < 0.25)
      .sort((a, b) => (b.t.rating ?? 0) - (a.t.rating ?? 0))
      .slice(0, 16)
      .map((x) => x.t);
  }, [s, ctx, pool]);
  if (items.length < MIN_ROW) return null;
  return (
    <Row id="different" title="Something different" subtitle="Highly rated, and unlike what you usually read">
      {items.map((t) => (
        <TitleCard key={t.key} title={t} reason="Outside your usual reading" context="different" />
      ))}
    </Row>
  );
}

export default function Home() {
  const profile = useUser((s) => s.profile);
  const ctx = useRankContext();
  const pickCtx = useRankContext({ excludeLibrary: true });
  const pool = usePools(pickCtx);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [seed, setSeed] = useState(0);
  const [shownCount, setShownCount] = useState(8);
  const claims = useMemo(() => createClaims(), [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  useSyncExternalStore(claims.subscribe, claims.version, claims.version);
  const homeDown = claims.failed.size > 0;
  const sections = useMemo(() => orderSections(CATALOGUE_SECTIONS, ctx.state, ctx.prefs), [ctx.state, ctx.prefs]);
  const more = useRef<HTMLDivElement>(null);
  const recentSurprises = useRef<string[]>([]);
  const [params, setParams] = useSearchParams();
  const surpriseRef = useRef<() => void>(() => {});
  const wantsSurprise = params.get("surprise") === "1";
  useEffect(() => {
    // Quest links use /?surprise=1 to run Surprise me once the pool is ready.
    if (!wantsSurprise || pool.loading) return;
    setParams({}, { replace: true });
    surpriseRef.current();
  }, [wantsSurprise, pool.loading, setParams]);
  useHead({ title: "Dawghwa", path: "/", jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "Dawghwa", url: location.origin, potentialAction: { "@type": "SearchAction", target: `${location.origin}/search?q={query}`, "query-input": "required name=query" } } });
  useEffect(() => {
    if (!more.current || shownCount >= sections.length) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setShownCount((n) => Math.min(sections.length, n + 3)), { rootMargin: "400px 0px" });
    io.observe(more.current);
    return () => io.disconnect();
  }, [shownCount, sections.length]);
  if (profile && !profile.onboarded) return <Navigate to="/welcome" replace />;
  const doSurprise = () => {
    const pick = surprise(pool.items, pickCtx, recentSurprises.current);
    if (!pick) {
      toast(pool.loading ? "Still loading titles, try again in a moment" : "Nothing new to surprise you with right now");
      return;
    }
    recentSurprises.current = [pick.title.key, ...recentSurprises.current].slice(0, 10);
    void signal("surprise_pick", pick.title);
    nav(titlePath(pick.title), { state: { reason: pick.reason?.text ?? "Surprise pick" } });
  };
  surpriseRef.current = doSurprise;
  return (
    <div className="page home">
      <h1 className="sr-only">Dawghwa home</h1>
      {/* The shell has no top bar (D6): on phones and tablets Home carries the brand, and it scrolls away. */}
      <div className="home-bar">
        <Brand />
        {profile && (
          <Link to="/profile" className="home-bar-avatar" aria-label={`Profile: ${profile.name}`}>
            <ProfileAvatar profile={profile} size={36} />
          </Link>
        )}
      </div>
      <Featured ctx={ctx} claims={claims} />
      <nav className="mood-strip" aria-label="Quick picks">
        <button className="mood mood-lime" onClick={doSurprise}>
          <Dices size={17} /> Surprise me
        </button>
        <Link className="mood" to="/search?q=completed%20romance%20with%20fewer%20than%20100%20chapters">
          <Sparkles size={16} /> Short completed romance
        </Link>
        <Link className="mood" to="/search?q=completed%20fantasy%20manhwa">
          <CheckCircle2 size={16} /> Completed fantasy
        </Link>
        <Link className="mood" to="/discover?order=latest">
          <Timer size={16} /> Fresh chapters
        </Link>
        <button
          className="mood"
          onClick={async () => {
            await qc.invalidateQueries({ queryKey: ["browse"] });
            setSeed((n) => n + 1);
            toast("Feed refreshed");
          }}
        >
          <RefreshCw size={16} /> Refresh feed
        </button>
      </nav>
      <QuestStrip />
      <div className="feed">
        <ContinueReading />
        <CategoryShelf ctx={ctx} preferred={ctx.prefs?.genres} quiet={homeDown} />
        <PickedForYou ctx={pickCtx} pool={pool.items} seed={seed} />
        <BecauseYouRead ctx={pickCtx} />
        {sections.slice(0, shownCount).map((d, i) => (
          <CatalogueSection key={`${d.id}-${seed}`} def={d} ctx={ctx} claims={claims} order={i} />
        ))}
        <SomethingDifferent ctx={pickCtx} pool={pool.items} />
      </div>
      <div ref={more} />
      {shownCount < sections.length && (
        <div style={{ marginTop: 32 }}>
          <button className="btn" onClick={() => setShownCount((n) => n + 4)}>
            Show more sections
          </button>
        </div>
      )}
      {shownCount >= sections.length && !homeDown && (
        <div className="feed-end">
          <MascotSays variant="head" size={72}>
            That's the whole issue. Lost in another world? <Link to="/discover">Discover</Link> has every shelf.
          </MascotSays>
        </div>
      )}
    </div>
  );
}
