import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bookmark as BookmarkIcon, BookmarkCheck, Check, ChevronLeft, ChevronRight, ListOrdered, Maximize2, MessageCircle, Minimize2, RotateCw, Settings2, ThumbsDown, ThumbsUp, X, ZoomOut } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { ChapterNo } from "@/components/Editorial";
import { Sheet } from "@/components/Layer";
import { Segmented } from "@/components/Segmented";
import { Cover } from "@/components/Cover";
import { ProgressRing } from "@/components/ProgressRing";
import { CommentList, CommentsSheet } from "@/components/Comments";
import { Celebrations } from "@/components/Celebrate";
import { ErrorState, errorText } from "@/components/States";
import { useChapters, usePages, useSources, useTitle } from "@/lib/query";
import { reducedMotion, updateSettings, useSettings, type Settings } from "@/lib/settings";
import { clamp, useAutoHideBar, useStripZoom } from "@/lib/readerGestures";
import { relativeTime } from "@/lib/time";
import { rate, saveProgress, useUser } from "@/lib/store/user";
import { useSignInRequired } from "@/lib/store/accounts";
import { SignIn } from "@/components/SignIn";
import { lifecycle, onBack, setImmersive, haptic } from "@/lib/platform";
import { isMature, readerPath, titlePath } from "@/lib/titles";
import { threads, useChapterComments } from "@/lib/comments";
import type { Moment } from "@/lib/rewards/runtime";
import { useHead } from "@/lib/seo";
import type { Chapter, ChapterPage, ChapterVariant } from "@/lib/api/types";
import { api } from "@/lib/api/endpoints";
import { chapterAliases, chapterBadge, chapterLabel, editionLabel, fallbackPlan, findChapter, isChapterRead, languageLabel, mapPosition, pickVariant, variantIdOf } from "@/lib/chapters";
import { isBookmarked, removeBookmark, toggleBookmark, useBookmarks } from "@/lib/store/bookmarks";

/**
 * Scroll-only reader (D8). The top bar slides away on scroll-down and comes back on
 * scroll-up or a tap (D61, superseding D9's always-on bar) and carries the
 * chapter's comments and a 2px progress line on its bottom edge (D10); there is
 * no bottom bar. The chapter end holds the reward beat, the next episode and
 * comments, so nothing ever interrupts a chapter in progress.
 */

/** One page image: reserves space before load, retries on failure, never fakes content. */
function PageImage({ page, eager, onFail, onLoad, ratio }: { page: ChapterPage; eager: boolean; onFail: (i: number) => void; onLoad: (i: number, r: number) => void; ratio?: number }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const src = attempt === 0 ? page.url : `${page.url}${page.url.includes("?") ? "&" : "?"}r=${attempt}`;
  const ar = ratio ?? (page.width && page.height ? page.height / page.width : undefined);
  return (
    <div className="rd-page" data-state={state} style={ar ? ({ "--ar": ar } as React.CSSProperties) : undefined} data-index={page.index}>
      {state !== "error" && (
        <img
          key={src}
          src={src}
          alt={`Page ${page.index + 1}`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setState("ok");
            if (img.naturalWidth) onLoad(page.index, img.naturalHeight / img.naturalWidth);
          }}
          onError={() => {
            setState("error");
            onFail(page.index);
          }}
        />
      )}
      {state === "loading" && (
        <span className="rd-page-num" aria-hidden="true">
          {page.index + 1}
        </span>
      )}
      {state === "error" && (
        <div className="rd-page-error" role="alert">
          <p>Page {page.index + 1} didn't load.</p>
          <button
            className="btn btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              setState("loading");
              setAttempt((a) => a + 1);
            }}
          >
            <RotateCw size={15} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

/** A PIN-protected profile must be signed into first (D29). */
export default function Reader() {
  return useSignInRequired() ? <SignIn /> : <ReaderView />;
}

function ReaderView() {
  const { source = "", id = "", chapterId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const settings = useSettings();
  const sources = useSources();
  const t = useTitle(source, id);
  const title = t.data;
  const chapters = useChapters(title);
  const prog = useUser((s) => (title ? s.progress.get(title.key) : undefined));
  const rating = useUser((s) => (title ? s.library.get(title.key)?.rating : undefined));
  const [pageRefreshKey, setPageRefreshKey] = useState(0);

  // ------------------------------------------------------------ chapter + version
  const all = useMemo(() => chapters.data?.chapters ?? [], [chapters.data]);
  const found = findChapter(all, chapterId);
  const chapter: Chapter | undefined = found?.chapter;
  // Prev/next stay in the current chapter's translation language: never switch language silently.
  const list = useMemo(() => (chapter ? all.filter((c) => (c.language ?? "und") === (chapter.language ?? "und")) : all), [all, chapter]);
  const idx = chapter ? list.indexOf(chapter) : -1;
  const sameChapter = (cid: string | undefined) => Boolean(cid && chapter && chapterAliases(chapter).includes(cid));
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<{ kind: "fallback" | "approx" | "manual"; text: string } | null>(null);
  const [needsChoice, setNeedsChoice] = useState<{ failed: ChapterVariant; options: ChapterVariant[] } | null>(null);
  // a pending position to carry over when the version changes (fallback or manual switch)
  const [carry, setCarry] = useState<{ page: number; count: number; variantId: string } | null>(null);
  const preferredSource = params.get("s");
  const preferredVariant = params.get("v");
  const selectedVariant = pickVariant(chapter, {
    variantId: preferredVariant,
    sourceId: preferredSource,
    previous: prog && sameChapter(prog.chapterId) && prog.sourceId ? { sourceId: prog.sourceId } : null,
    failed,
  });
  const activeVariantId = selectedVariant ? variantIdOf(selectedVariant) : "";
  const activeSource = selectedVariant?.sourceId ?? preferredSource ?? source;
  const activeChapterId = selectedVariant?.providerChapterId ?? chapterId;
  const chapterKey = chapter?.id ?? chapterId;
  const src = sources.data?.find((s) => s.id === activeSource);
  // unified rows always carry variants; a legacy single-source list falls back to the source capability
  const readable = selectedVariant ? true : sources.data ? Boolean(sources.data.find((s) => s.id === source)?.capabilities.chapterPages) : true;
  const pagesQ = usePages(activeSource, activeChapterId, settings.dataSaver, readable && (Boolean(selectedVariant) || chapters.isSuccess || chapters.isError), selectedVariant?.url, pageRefreshKey);
  const pages = useMemo(() => pagesQ.data?.pages ?? [], [pagesQ.data]);
  const count = pages.length;
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 ? list[idx + 1] : undefined;

  // a synchronous position mirror covers reloads that land before the IndexedDB write commits
  const mirror = chapterKey ? readPos(chapterKey) : undefined;
  const fresh = mirror && (!sameChapter(prog?.chapterId) || mirror.t > (prog?.updatedAt ?? 0)) ? mirror : undefined;
  const paramPage = Number(params.get("p") ?? (fresh ? fresh.page : sameChapter(prog?.chapterId) ? prog!.page : 0)) || 0;
  const carried = carry && carry.variantId === activeVariantId && count ? mapPosition(carry.page, carry.count, count) : undefined;
  const startPage = carried ? carried.page : paramPage;
  const [page, setPage] = useState(startPage);
  const [panel, setPanel] = useState(false);
  const [chList, setChList] = useState(false);
  const commentsOpen = params.get("comments");
  const setComments = useCallback(
    (v: false | "read" | "write") =>
      setParams((p) => (v ? p.set("comments", v) : p.delete("comments"), p), {
        replace: true,
      }),
    [setParams],
  );
  useEffect(() => {
    if (chList) requestAnimationFrame(() => document.querySelector('.rd-ch[aria-current="true"]')?.scrollIntoView({ block: "center" }));
  }, [chList]);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [failures, setFailures] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [beat, setBeat] = useState<Moment | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const scrubbing = useRef(false);
  // the chapter the reader moved to from the end card / list: its pages spring in (D60)
  const [enterKey, setEnterKey] = useState<string | null>(null);
  const [endInView, setEndInView] = useState(false);
  const restored = useRef(false);
  const pageRefreshAt = useRef(0);
  // comments belong to the canonical chapter, so every version of it shares them
  const target = useMemo(() => (title && chapterKey ? { title, chapterId: chapterKey, chapterNumber: chapter?.number } : undefined), [title, chapterKey, chapter?.number]);
  const { items: comments } = useChapterComments(chapterKey);

  useHead({
    title: title ? `${title.title}${chapter ? ` · ${chapterLabel(chapter)}` : ""}` : "Reader",
    noindex: true,
  });

  // Older links and history use provider chapter ids; move them to the canonical chapter key
  // and pin the version they referred to (same source, same upload).
  useEffect(() => {
    if (!title || !found?.legacy) return;
    const v = found.chapter.variants?.find((x) => x.providerChapterId === chapterId || x.variantId === chapterId);
    const p = params.get("p");
    nav(readerPath(title, found.chapter.id, p ? Number(p) : undefined, v?.sourceId ?? preferredSource ?? undefined, v ? variantIdOf(v) : undefined), { replace: true });
  }, [found, title, chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // reset per chapter and per version
  useEffect(() => {
    setPage(startPage);
    setCountdown(null);
    setReachedEnd(false);
    setFailures(0);
    setPageRefreshKey(0);
    setRatios({});
    restored.current = false;
    pageRefreshAt.current = 0;
  }, [chapterKey, activeVariantId]); // eslint-disable-line react-hooks/exhaustive-deps
  // a new chapter starts with no reward beat, a clean failure list and no stale notices
  useEffect(() => {
    setBeat(null);
    setFailed(new Set());
    setNeedsChoice(null);
    setNotice((n) => (n?.kind === "fallback" || n?.kind === "approx" ? n : null));
  }, [chapterKey]);

  // carried position: once the new version's pages are known, map the page and explain approximations
  useEffect(() => {
    if (!carry || carry.variantId !== activeVariantId || !count) return;
    const m = mapPosition(carry.page, carry.count, count);
    setPage(m.page);
    if (!m.exact)
      setNotice((n) => ({
        kind: n?.kind === "fallback" ? "fallback" : "approx",
        text: `${n?.kind === "fallback" ? n.text + " " : ""}This version splits pages differently (${count} pages instead of ${carry.count}), so you're at the closest point: page ${m.page + 1}.`,
      }));
    setCarry(null);
    setParams((cur) => {
      const np = new URLSearchParams(cur);
      np.set("p", String(m.page));
      return np;
    }, { replace: true });
  }, [carry, activeVariantId, count]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android: the status bar hides while reading; the reader's own top bar stays (D9).
  useEffect(() => {
    void setImmersive(true);
    return () => void setImmersive(false);
  }, []);

  // Reward moments land in the end panel instead of a floating card (never mid-chapter:
  // chapter_read is emitted only once the end is reached).
  useEffect(() => {
    if (!settings.rewards) return;
    let off = false;
    let reset: (() => void) | undefined;
    void import("@/lib/rewards/runtime").then((m) => {
      if (off) return;
      m.startRewards();
      m.setRewardSink((g) => {
        setBeat((b) => mergeMoment(b, g));
        if (!reducedMotion()) void haptic("success");
      });
      reset = () => m.setRewardSink(null);
    });
    return () => {
      off = true;
      reset?.();
    };
  }, [settings.rewards]);

  // ------------------------------------------------------------ progress
  // the page at the top of the viewport and how far into it the reader is
  const anchor = useRef<{ page: number; offset: number } | null>(null);
  const latest = useRef({ page, reachedEnd });
  latest.current = { page, reachedEnd };
  // true while a restored position is being held in place; programmatic scrolls then are not reader intent
  const pinning = useRef(false);
  const save = useCallback(
    (finished = latest.current.reachedEnd) => {
      if (!title || !chapter || !count) return;
      // measure at save time: images above may have changed height since the last scroll event
      if (scroller.current && !pinning.current) anchor.current = measureAnchor(scroller.current) ?? anchor.current;
      const a = anchor.current;
      const p = Math.min(a ? a.page : latest.current.page, count - 1);
      writePos(chapter.id, p, a?.offset);
      void saveProgress({
        title,
        chapterId: chapter.id,
        variantId: selectedVariant ? variantIdOf(selectedVariant) : undefined,
        sourceId: selectedVariant?.sourceId,
        language: chapter.language,
        chapterNumber: chapter.number,
        chapterTitle: chapter.kind && chapter.kind !== "regular" ? chapterLabel(chapter) : chapter.title,
        page: p,
        offset: a?.offset,
        pageCount: count,
        fraction: finished ? 1 : (p + 1) / count,
        finished,
        lastChapterNumber: list.at(-1)?.number,
      });
    },
    [title, chapter, count, list, selectedVariant],
  );
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!count) return;
    const tm = setTimeout(() => save(), 900);
    return () => clearTimeout(tm);
  }, [page, count, save]);
  useEffect(() => {
    if (reachedEnd) save(true); // the chapter counts as read only once its last page was reached
  }, [reachedEnd, save]);
  useEffect(() => {
    const off = lifecycle.onPause(() => save());
    return () => void off();
  }, [save]);
  useEffect(() => () => save(), [save]);
  // web reload / tab close / app switch: lifecycle.onPause does not fire there
  useEffect(() => {
    const flush = () => save();
    const vis = () => document.visibilityState === "hidden" && save();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [save]);

  // ------------------------------------------------------------ tracking
  useEffect(() => {
    if (!count || !scroller.current) return;
    const root = scroller.current;
    const vis = new Map<number, number>();
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) vis.set(Number((e.target as HTMLElement).dataset.index), e.intersectionRatio);
        let best = -1;
        let bestR = 0;
        vis.forEach((r, i) => r > bestR && ((bestR = r), (best = i)));
        if (best >= 0) setPage(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    root.querySelectorAll<HTMLElement>(".rd-page").forEach((el) => io.observe(el));
    // the end marker sits right after the last page: reaching it is "last page reached"
    const end = root.querySelector(".rd-end-mark");
    const endIo = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setReachedEnd(true), { threshold: 0 });
    if (end) endIo.observe(end);
    // the bar stays put while the end card is on screen (D61)
    const card = root.querySelector(".rd-end");
    const cardIo = new IntersectionObserver((es) => setEndInView(es[es.length - 1]!.isIntersecting), { threshold: 0 });
    if (card) cardIo.observe(card);
    return () => {
      io.disconnect();
      endIo.disconnect();
      cardIo.disconnect();
    };
  }, [count, chapterKey, activeVariantId]);

  // live reading fraction for the top bar line (scroll position through the pages)
  const [fraction, setFraction] = useState(0);
  useEffect(() => {
    if (!count) return;
    let raf = 0;
    let last = 0;
    let trailing = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const root = scroller.current;
        if (!root) return;
        anchor.current = measureAnchor(root) ?? anchor.current;
        const strip = root.querySelector<HTMLElement>(".rd-pages");
        if (strip) {
          const r = strip.getBoundingClientRect();
          const span = r.height - window.innerHeight;
          setFraction(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1);
        }
        // throttled save (~500ms) plus a trailing save once scrolling settles
        const now = Date.now();
        if (restored.current && !pinning.current && now - last > 500) {
          last = now;
          saveRef.current();
        }
        clearTimeout(trailing);
        trailing = window.setTimeout(() => restored.current && !pinning.current && saveRef.current(), 250);
      });
    };
    window.addEventListener("scroll", on, { passive: true });
    on();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(trailing);
      window.removeEventListener("scroll", on);
    };
  }, [count, chapterKey, activeVariantId]);

  // restore the saved position once pages exist; keep it pinned while images above it load
  // and change height, until the reader scrolls or touches the page themselves
  useEffect(() => {
    if (!count || !title || restored.current) return;
    restored.current = true;
    anchor.current = null;
    const offset = carried ? 0 : fresh && fresh.page === startPage ? (fresh.offset ?? 0) : sameChapter(prog?.chapterId) && prog!.page === startPage ? (prog!.offset ?? 0) : 0;
    if (startPage <= 0 && offset <= 0) return void window.scrollTo(0, 0);
    const root = scroller.current;
    if (!root) return;
    const pin = () => {
      const el = root.querySelector<HTMLElement>(`[data-index="${startPage}"]`);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * offset - barHeight();
      window.scrollTo(0, Math.max(0, top - 1));
    };
    requestAnimationFrame(pin);
    const ro = new ResizeObserver(() => pin());
    ro.observe(root);
    pinning.current = true;
    const stop = () => {
      pinning.current = false;
      ro.disconnect();
      clearTimeout(tm);
      for (const e of ["wheel", "touchstart", "keydown", "pointerdown"]) window.removeEventListener(e, stop);
    };
    const tm = setTimeout(stop, 8000);
    for (const e of ["wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(e, stop, { passive: true, once: true });
    return stop;
  }, [count, startPage, title, activeVariantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ chrome + zoom (phase 3)
  const bar = useAutoHideBar(() => pinning.current || scrubbing.current);
  const quietBar = bar.quiet;
  const beforeZoomAdjust = useCallback(() => quietBar(400), [quietBar]);
  const zoom = useStripZoom(panRef, pagesRef, beforeZoomAdjust);
  const resetZoom = zoom.reset;
  const [barFocus, setBarFocus] = useState(false);
  const wide = useWide();
  const barHidden = bar.hidden && count > 0 && !panel && !chList && !commentsOpen && !endInView && !barFocus;
  useEffect(() => {
    resetZoom();
    bar.setHidden(false);
  }, [chapterKey, activeVariantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // one tap on the pages toggles the bar; two quick taps zoom (D62). The single tap waits
  // out the double-tap window so a zoom never flashes the bar.
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const tapTimer = useRef(0);
  useEffect(() => () => clearTimeout(tapTimer.current), []);
  const onPagesClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    const now = performance.now();
    const p = lastTap.current;
    if (p && now - p.t < 300 && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 40) {
      clearTimeout(tapTimer.current);
      lastTap.current = null;
      zoom.zoomAt(zoom.zoomRef.current > 1 ? 1 : 2, e.clientX, e.clientY);
      void haptic("light");
      return;
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => {
      lastTap.current = null;
      bar.setHidden((h) => !h);
    }, 300);
  };
  const zoomCenter = (z: number) => zoom.zoomAt(z, window.innerWidth / 2, window.innerHeight / 2);

  // the 2px progress line doubles as a scrubber: tap or drag to jump (D63)
  const seek = (f: number) => {
    const strip = pagesRef.current;
    if (!strip) return;
    const r = strip.getBoundingClientRect();
    const span = Math.max(0, r.height - window.innerHeight);
    quietBar(400);
    window.scrollTo(0, r.top + window.scrollY + span * clamp(f, 0, 1));
  };
  const seekFrom = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - r.left) / r.width);
  };
  const seekPage = (i: number) => {
    const el = pagesRef.current?.querySelector<HTMLElement>(`[data-index="${clamp(i, 0, count - 1)}"]`);
    if (!el) return;
    quietBar(400);
    window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - barHeight()));
  };
  const onScrubKey = (e: React.KeyboardEvent) => {
    const cur = Math.min(page, count - 1);
    const map: Record<string, () => void> = {
      ArrowRight: () => seekPage(cur + 1),
      ArrowUp: () => seekPage(cur + 1),
      ArrowLeft: () => seekPage(cur - 1),
      ArrowDown: () => seekPage(cur - 1),
      PageDown: () => seek(fraction + 0.1),
      PageUp: () => seek(fraction - 0.1),
      Home: () => seek(0),
      End: () => seek(1),
    };
    const fn = map[e.key];
    if (!fn) return;
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const goChapter = useCallback(
    (c?: Chapter) => {
      if (!c || !title) return;
      save();
      // keep the same provider and translation group when the next chapter has it
      const v = pickVariant(c, { previous: selectedVariant ?? null });
      setNotice(null);
      setEnterKey(c.id);
      nav(readerPath(title, c.id, undefined, v?.sourceId ?? activeSource, v ? variantIdOf(v) : undefined), { replace: true });
    },
    [nav, title, save, activeSource, selectedVariant],
  );

  /** Switch to another version of the same chapter, carrying the reading position. */
  const switchVariant = useCallback(
    (v: ChapterVariant, why: "manual" | "fallback") => {
      if (!chapter) return;
      if (why === "manual") save();
      const vid = variantIdOf(v);
      const at = Math.min(anchor.current?.page ?? page, Math.max(0, count - 1));
      setCarry({ page: at, count, variantId: vid });
      setNeedsChoice(null);
      setParams((cur) => {
        const np = new URLSearchParams(cur);
        np.set("s", v.sourceId);
        np.set("v", vid);
        np.set("p", String(at));
        return np;
      }, { replace: true });
    },
    [chapter, page, count, save, setParams],
  );

  /**
   * The current version failed. Try another version of the *same* chapter in
   * the *same* language and edition automatically; a different edition needs
   * the reader's choice; nothing else is ever substituted.
   */
  const fallbackFrom = useCallback(
    (kind: "pages" | "image" | "empty", errorCode?: string) => {
      if (!chapter || !selectedVariant) return;
      const failedId = variantIdOf(selectedVariant);
      if (failed.has(failedId)) return;
      const tried = new Set(failed).add(failedId);
      setFailed(tried);
      const plan = fallbackPlan(chapter, selectedVariant, tried);
      const to = plan.automatic[0];
      void api.report({ sourceId: selectedVariant.sourceId, kind, chapterKey: chapter.id, providerChapterId: selectedVariant.providerChapterId, errorCode, fallback: { attempted: Boolean(to), succeeded: false, toSourceId: to?.sourceId } });
      if (to) {
        const diffs = [to.sourceId !== selectedVariant.sourceId ? null : "another upload", (to.group?.id ?? "") !== (selectedVariant.group?.id ?? "") && to.group ? `translated by ${to.group.name}` : null].filter(Boolean);
        setNotice({
          kind: "fallback",
          text: `${selectedVariant.source} couldn't load ${chapterLabel(chapter)}. Switched to the same chapter (${languageLabel(to.language ?? chapter.language)}) on ${to.source}${diffs.length ? `, ${diffs.join(", ")}` : ""}.`,
        });
        switchVariant(to, "fallback");
      } else if (plan.manual.length) {
        setNeedsChoice({ failed: selectedVariant, options: plan.manual });
      }
    },
    [chapter, selectedVariant, failed, switchVariant],
  );

  // pages request failed or came back empty -> fallback
  useEffect(() => {
    if (!chapter || !selectedVariant || pagesQ.isFetching) return;
    if (pagesQ.isError) fallbackFrom("pages", (pagesQ.error as { code?: string } | null)?.code);
    else if (pagesQ.data && pagesQ.data.pages.length === 0) fallbackFrom("empty");
  }, [pagesQ.isError, pagesQ.data, pagesQ.isFetching, chapter, selectedVariant]); // eslint-disable-line react-hooks/exhaustive-deps

  // images keep failing after a fresh manifest -> fallback
  useEffect(() => {
    if (failures >= 3 && pageRefreshKey > 0 && !pagesQ.isFetching) fallbackFrom("image");
  }, [failures, pageRefreshKey, pagesQ.isFetching]); // eslint-disable-line react-hooks/exhaustive-deps

  // the fallback version loaded: tell the API the fallback worked
  const reportedOk = useRef<string>("");
  useEffect(() => {
    if (!notice || notice.kind !== "fallback" || !count || !selectedVariant || reportedOk.current === activeVariantId) return;
    reportedOk.current = activeVariantId;
    const from = chapter?.variants?.find((v) => failed.has(variantIdOf(v)));
    if (from) void api.report({ sourceId: from.sourceId, kind: "pages", chapterKey: chapter?.id, providerChapterId: from.providerChapterId, fallback: { attempted: true, succeeded: true, toSourceId: selectedVariant.sourceId } });
  }, [count, activeVariantId, notice]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ bookmarks & fullscreen
  const bookmarks = useBookmarks(title?.key);
  const curPage = Math.min(page, Math.max(0, count - 1));
  const marked = Boolean(title && chapter && count && bookmarks.length && isBookmarked(title.key, chapter.id, curPage));
  const onBookmark = () => {
    if (!title || !chapter || !count) return;
    const added = toggleBookmark({ titleKey: title.key, chapterId: chapter.id, chapterLabel: chapterLabel(chapter), page: curPage, pageCount: count, variantId: activeVariantId, sourceId: selectedVariant?.sourceId });
    void haptic("light");
    setNotice({ kind: "manual", text: added ? `Bookmarked page ${curPage + 1}.` : `Bookmark removed.` });
  };
  const [isFull, setIsFull] = useState(() => typeof document !== "undefined" && Boolean(document.fullscreenElement));
  useEffect(() => {
    const on = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => setNotice({ kind: "manual", text: "Fullscreen isn't available here." }));
  };

  // keyboard: the page scrolls natively; [ and ] change chapter, C opens comments
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel || chList || commentsOpen || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "]") goChapter(next);
      else if (e.key === "[") goChapter(prev);
      else if (e.key === "c" && target) setComments("read");
      else if (e.key === "z" && count) zoomCenter(zoom.zoomRef.current > 1 ? 1 : 2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goChapter, next, prev, panel, chList, commentsOpen, target, setComments, count]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android back / Escape: close a layer, then leave to the title page
  useEffect(
    () =>
      onBack(() => {
        if (panel) return (setPanel(false), true);
        if (chList) return (setChList(false), true);
        if (commentsOpen) return (setComments(false), true);
        if (zoom.zoomRef.current > 1) return (zoomCenter(1), true);
        if (title) nav(titlePath(title), { replace: true });
        else nav(-1);
        return true;
      }),
    [panel, chList, commentsOpen, setComments, title, nav], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onLoad = useCallback((i: number, r: number) => setRatios((m) => (m[i] === r ? m : { ...m, [i]: r })), []);
  const onFail = useCallback(() => {
    setFailures((n) => n + 1);
    // Provider page URLs can expire or point at unhealthy CDN nodes. Fetch a
    // fresh manifest at most once per 15 seconds rather than retrying a dead URL.
    if (Date.now() - pageRefreshAt.current > 15_000) {
      pageRefreshAt.current = Date.now();
      setPageRefreshKey((key) => key + 1);
    }
  }, []);

  // auto-advance: countdown on the end panel. Paused while comments are open.
  useEffect(() => {
    if (!reachedEnd || !settings.autoNext || !next || commentsOpen) return setCountdown(null);
    setCountdown(8);
    const iv = setInterval(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearInterval(iv);
  }, [reachedEnd, settings.autoNext, next, commentsOpen]);
  // Fire once per countdown: clear it before navigating, so the next chapter's "next" can't re-trigger it.
  useEffect(() => {
    if (countdown !== 0) return;
    setCountdown(null);
    goChapter(next);
  }, [countdown, goChapter, next]);

  const sourceName = src?.name ?? selectedVariant?.source ?? title?.sourceName ?? activeSource;
  const backTo = title ? titlePath(title) : "/";

  // ------------------------------------------------------------ states
  if ((chapters.isSuccess || sources.data) && !readable)
    return (
      <div className="reader reader-msg">
        <div className="state state-center">
          <h1 style={{ fontSize: "var(--text-xl)" }}>This chapter isn't readable in Dawghwa yet</h1>
          <p>No compatible source supplied in-app pages for this chapter. Pick another chapter or version from the title page.</p>
          <div className="cluster">
            <Link className="btn btn-primary" to={backTo}>
              Back to title
            </Link>
          </div>
        </div>
      </div>
    );

  const top = threads(comments, "top");
  const nextWhen = next ? relativeTime(next.lastUpdated) : undefined;
  const rateSeries = (r: 1 | -1) => {
    if (!title) return;
    const nextR = rating === r ? undefined : r;
    void rate(title, nextR);
    if (nextR) void haptic("success");
  };
  // "what's next" card (D64): next chapter first, then the way back and a quick rating
  const endPanel = (
    <section className="rd-end rd-wn" aria-label="End of chapter" data-in={reachedEnd || undefined}>
      <div className="rd-end-head">
        <p className="rd-end-kicker">
          End of <ChapterNo n={chapter?.number} label={chapter && chapter.numberText !== undefined ? chapterBadge(chapter) : undefined} />
        </p>
        {beat && settings.rewards ? <RewardBeat m={beat} /> : !next && <Mascot variant="head" size={64} className="rd-end-mascot" />}
      </div>

      {next ? (
        <div className="rd-next">
          <button className="rd-next-card" onClick={() => goChapter(next)} aria-describedby={countdown ? "rd-countdown" : undefined}>
            {title && <Cover src={title.cover} title={title.title} sizes="72px" mature={isMature(title)} />}
            <span className="rd-next-body">
              <span className="rd-next-kicker">Up next</span>
              <span className="rd-next-title">{chapterLabel(next)}</span>
              {nextWhen && (
                <time className="rd-next-when" dateTime={nextWhen.iso} title={nextWhen.full}>
                  Updated {nextWhen.label}
                </time>
              )}
            </span>
            <span className="rd-next-go" aria-hidden="true">
              <ChevronRight size={22} />
            </span>
            {countdown !== null && countdown > 0 && <span className="rd-next-timer" aria-hidden="true" style={{ "--cd": countdown / 8 } as React.CSSProperties} />}
          </button>
          {countdown !== null && countdown > 0 && (
            <p className="rd-countdown" id="rd-countdown" aria-live="polite">
              Next chapter in {countdown}s ·{" "}
              <button className="link-btn" onClick={() => setCountdown(null)}>
                Stay here
              </button>
            </p>
          )}
        </div>
      ) : list.length ? (
        <div className="rd-caught">
          <h2 className="rd-end-title">You're caught up</h2>
          <p className="rd-end-note">This is the latest chapter on {sourceName}. New chapters show up on Home when they're released.</p>
        </div>
      ) : null}

      <div className="rd-wn-actions">
        <Link className="btn rd-wn-back" to={backTo}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to series
        </Link>
        {title && (
          <div className="rd-rate" role="group" aria-labelledby="rd-rate-q">
            <span className="rd-rate-q" id="rd-rate-q">
              How's the series?
            </span>
            <button className="icon-btn rd-rate-btn" aria-label="Like this series" aria-pressed={rating === 1} data-pop={rating === 1 || undefined} onClick={() => rateSeries(1)}>
              <ThumbsUp size={18} />
            </button>
            <button className="icon-btn rd-rate-btn" aria-label="Not for me" aria-pressed={rating === -1} data-pop={rating === -1 || undefined} onClick={() => rateSeries(-1)}>
              <ThumbsDown size={18} />
            </button>
          </div>
        )}
      </div>

      {target && (
        <div className="rd-comments">
          <div className="rd-comments-head">
            <h2>Comments {comments.length ? <span className="tabular">({comments.length})</span> : null}</h2>
            {comments.length > 0 && (
              <button className="link-btn" onClick={() => setComments("read")}>
                See all
              </button>
            )}
          </div>
          {top.length ? <CommentList list={top} target={target} limit={2} /> : <p className="rd-end-note">Jot down a reaction to this chapter. Only you can see it.</p>}
          <button className="rd-leave" onClick={() => setComments("write")}>
            <MessageCircle size={18} aria-hidden="true" /> Leave a comment
          </button>
        </div>
      )}

      <p className="rd-credits">Credits: {[selectedVariant?.group?.name ?? chapter?.group?.name, `via ${prettySource(sourceName)}`, chapter?.language ? languageLabel(selectedVariant?.language ?? chapter.language) : null].filter(Boolean).join(" · ")}</p>
      {prev && (
        <div className="rd-end-links">
          <button className="btn btn-ghost" onClick={() => goChapter(prev)}>
            <ChevronLeft size={16} /> {chapterLabel(prev)}
          </button>
        </div>
      )}
    </section>
  );

  const body = needsChoice ? (
    <div className="state state-center rd-choice" role="alert">
      <h2>{needsChoice.failed.source} couldn't load this chapter</h2>
      <p>
        The same chapter is available in another edition. Editions can differ in translation and page layout, so Dawghwa
        won't switch without asking.
      </p>
      <div className="stack">
        {needsChoice.options.map((v) => (
          <button key={variantIdOf(v)} className="btn" onClick={() => switchVariant(v, "manual")}>
            Read on {v.source} · {editionLabel(v.edition)} · {languageLabel(v.language ?? chapter?.language)}
          </button>
        ))}
        <button className="btn btn-ghost" onClick={() => (setNeedsChoice(null), setFailed(new Set()), void pagesQ.refetch())}>
          <RotateCw size={15} /> Try {needsChoice.failed.source} again
        </button>
      </div>
    </div>
  ) : pagesQ.isError ? (
    <div className="state state-center">
      <ErrorState error={pagesQ.error} retry={() => (setFailed(new Set()), void pagesQ.refetch())} />
      {chapter && (chapter.variants?.length ?? 0) <= 1 && <p className="muted">No other source has this chapter in the same language.</p>}
      {errorText(pagesQ.error).offline && <p className="muted">Chapter pages aren't stored offline. Reconnect to keep reading.</p>}
    </div>
  ) : !pagesQ.data ? (
    <div className="rd-loading" aria-busy="true">
      <div className="rd-page skeleton" />
    </div>
  ) : !count ? (
    <div className="state state-center">
      <h2>This chapter has no readable pages</h2>
      <p>{sourceName} did not return any pages{chapter && (chapter.variants?.length ?? 0) > 1 ? ", and no other version in the same language and edition could be used automatically. You can pick a version in the reader settings." : ", and no other source has this chapter in the same language."}</p>
      <Link className="btn" to={backTo}>
        Back to title
      </Link>
    </div>
  ) : (
    // keyed: the loading skeleton's nodes must not be reused as the pan box (that reads as a layout shift)
    <div className="rd-strip" key="strip" ref={scroller}>
      <div className="rd-pan" ref={panRef}>
        <div className="rd-pages" ref={pagesRef} key={`${chapterKey}|${activeVariantId}`} data-enter={enterKey === chapterKey || undefined} onClick={onPagesClick}>
          {pages.map((p) => (
            <PageImage key={p.url} page={p} eager={Math.abs(p.index - startPage) < 3} onFail={onFail} onLoad={onLoad} ratio={ratios[p.index]} />
          ))}
        </div>
      </div>
      <div className="rd-end-mark" aria-hidden="true" />
      {endPanel}
    </div>
  );

  const shown = count ? (reachedEnd ? 1 : fraction) : 0;

  return (
    <div className="reader" data-width={settings.readerWidth} data-zoom={zoom.zoom > 1 || undefined} style={zoom.zoom > 1 ? ({ "--zoom": zoom.zoom } as React.CSSProperties) : undefined}>
      <Celebrations />
      <header className="rd-top" ref={topRef} data-hidden={barHidden || undefined} onFocus={(e) => e.target.matches(":focus-visible") && setBarFocus(true)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setBarFocus(false)}>
        <Link className="icon-btn" to={backTo} replace aria-label="Back to title">
          <ArrowLeft size={20} />
        </Link>
        <div className="rd-titles">
          <span className="rd-series">{title?.title ?? (t.isError ? "Reader" : "Loading…")}</span>
          <span className="rd-chapter">
            {[chapter ? chapterLabel(chapter) : "", `via ${prettySource(sourceName)}`, chapter?.language ? languageLabel(selectedVariant?.language ?? chapter.language) : null, count ? `${Math.min(page, count - 1) + 1} / ${count}` : ""].filter(Boolean).join(" · ")}
          </span>
        </div>
        {target && (
          <button className="icon-btn rd-cm-btn" aria-label={`Comments (${comments.length})`} aria-haspopup="dialog" onClick={() => setComments("read")}>
            <MessageCircle size={20} />
            {comments.length > 0 && (
              <span className="rd-cm-count tabular" aria-hidden="true">
                {comments.length > 99 ? "99+" : comments.length}
              </span>
            )}
          </button>
        )}
        {list.length > 1 && (
          <button className="icon-btn" aria-label="Chapters" aria-haspopup="dialog" onClick={() => setChList(true)}>
            <ListOrdered size={20} />
          </button>
        )}
        {count > 0 && (
          <button className="icon-btn" aria-label={marked ? "Remove bookmark" : "Bookmark this page"} aria-pressed={marked} onClick={onBookmark}>
            {marked ? <BookmarkCheck size={20} /> : <BookmarkIcon size={20} />}
          </button>
        )}
        <button className="icon-btn" aria-label="Reader settings" aria-haspopup="dialog" onClick={() => setPanel(true)}>
          <Settings2 size={20} />
        </button>
        <div
          className="rd-progress"
          role="slider"
          tabIndex={count ? 0 : -1}
          aria-label="Chapter progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(shown * 100)}
          aria-valuetext={count ? `Page ${Math.min(page, count - 1) + 1} of ${count}` : undefined}
          aria-disabled={!count || undefined}
          style={{ "--rd-frac": `${shown * 100}%` } as React.CSSProperties}
          onKeyDown={count ? onScrubKey : undefined}
          onPointerDown={(e) => {
            if (!count || e.button !== 0) return;
            scrubbing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.dataset.scrub = "";
            seekFrom(e);
          }}
          onPointerMove={(e) => scrubbing.current && seekFrom(e)}
          onPointerUp={(e) => {
            if (!scrubbing.current) return;
            scrubbing.current = false;
            delete e.currentTarget.dataset.scrub;
            quietBar(300);
          }}
          onPointerCancel={(e) => {
            scrubbing.current = false;
            delete e.currentTarget.dataset.scrub;
          }}
        >
          <span style={{ transform: `scaleX(${shown})` }} />
        </div>
      </header>

      <main className="rd-body">
        {notice && (
          <div className={`banner rd-banner rd-notice ${notice.kind === "manual" ? "" : "banner-warn"}`} role="status" aria-live="polite" data-testid="reader-notice">
            <span>{notice.text}</span>
            <button className="icon-btn" aria-label="Dismiss" onClick={() => setNotice(null)}>
              <X size={16} />
            </button>
          </div>
        )}
        {failures >= 3 && !notice && (
          <div className="banner banner-warn rd-banner" role="status">
            Several pages failed. Image links from {sourceName} can expire.
            <button className="btn btn-sm" onClick={() => (setFailures(0), void pagesQ.refetch())}>
              Reload pages
            </button>
          </div>
        )}
        {body}
      </main>

      {zoom.zoom > 1 && (
        <button className="rd-zoom-chip" onClick={() => (zoomCenter(1), void haptic("light"))}>
          <ZoomOut size={16} aria-hidden="true" /> <span className="tabular">{Math.round(zoom.zoom * 10) / 10}×</span> · Reset zoom
        </button>
      )}

      <CommentsSheet open={Boolean(commentsOpen)} onClose={() => setComments(false)} target={target} items={comments} compose={commentsOpen === "write"} />

      <Sheet open={chList} onClose={() => setChList(false)} title="Chapters">
        <ol className="rd-chlist">
          {bookmarks.length > 0 && (
            <li className="rd-bookmarks">
              <p className="rd-bm-head">Bookmarks</p>
              {bookmarks.slice(0, 20).map((b) => (
                <span key={`${b.chapterId}|${b.page}`} className="rd-bm">
                  <button
                    className="rd-ch"
                    onClick={() => {
                      setChList(false);
                      if (!title) return;
                      const c = findChapter(all, b.chapterId)?.chapter;
                      const v = c ? pickVariant(c, { variantId: b.variantId, sourceId: b.sourceId }) : undefined;
                      if (c && v && variantIdOf(v) !== b.variantId && b.pageCount) setCarry({ page: b.page, count: b.pageCount, variantId: variantIdOf(v) });
                      nav(readerPath(title, b.chapterId, b.page, v?.sourceId ?? b.sourceId, v ? variantIdOf(v) : b.variantId), { replace: true });
                    }}
                  >
                    <BookmarkCheck size={16} aria-hidden="true" />
                    <span className="rd-ch-title">
                      {b.chapterLabel} · page {b.page + 1}
                    </span>
                  </button>
                  <button className="icon-btn" aria-label={`Remove bookmark ${b.chapterLabel} page ${b.page + 1}`} onClick={() => title && removeBookmark(title.key, b.chapterId, b.page)}>
                    <X size={15} />
                  </button>
                </span>
              ))}
            </li>
          )}
          {[...list].reverse().map((c) => {
            const read = isChapterRead(prog?.read, c);
            return (
              <li key={c.id}>
                <button className="rd-ch" aria-current={c.id === chapterKey ? "true" : undefined} data-read={read || undefined} onClick={() => (setChList(false), goChapter(c))}>
                  <ChapterNo n={c.number} label={c.numberText !== undefined ? chapterBadge(c) : undefined} />
                  <span className="rd-ch-title">{chapterLabel(c)}</span>
                  {read && <Check size={16} aria-label="Read" />}
                </button>
              </li>
            );
          })}
        </ol>
      </Sheet>
      <Sheet open={panel} onClose={() => setPanel(false)} title="Reader settings">
        <div className="stack">
          <label className="switch settings-row">
            <span>Continue to next chapter automatically</span>
            <input type="checkbox" checked={settings.autoNext} onChange={(e) => updateSettings({ autoNext: e.target.checked })} />
          </label>
          <label className="switch settings-row">
            <span>
              Data saver
              <small className="muted" style={{ display: "block" }}>
                Smaller, compressed page images
              </small>
            </span>
            <input type="checkbox" checked={settings.dataSaver} onChange={(e) => (updateSettings({ dataSaver: e.target.checked }), void haptic("light"))} />
          </label>
          {wide && (
            <div className="settings-row rd-width-row">
              <span>Page width</span>
              <Segmented label="Page width" value={settings.readerWidth} options={WIDTHS.map((w) => [w.id, w.label])} onChange={(v) => (updateSettings({ readerWidth: v }), void haptic("light"))} />
              <WidthPreview src={pages[Math.min(page, count - 1)]?.url} width={settings.readerWidth} page={Math.min(page, count - 1) + 1} />
            </div>
          )}
          {typeof document !== "undefined" && document.fullscreenEnabled && (
            <div className="settings-row">
              <span>Fullscreen</span>
              <button className="btn btn-sm" onClick={toggleFullscreen} aria-pressed={isFull}>
                {isFull ? <Minimize2 size={15} /> : <Maximize2 size={15} />} {isFull ? "Exit" : "Enter"}
              </button>
            </div>
          )}
          {chapter?.variants && chapter.variants.length > 1 && (
            <label className="settings-row">
              <span>
                Chapter version
                <small className="muted" style={{ display: "block" }}>
                  Same chapter from another source or translation group. Wording and page splits can differ.
                </small>
              </span>
              <select
                className="input"
                aria-label="Chapter version"
                value={activeVariantId}
                onChange={(e) => {
                  const v = chapter.variants?.find((x) => variantIdOf(x) === e.target.value);
                  if (!v || variantIdOf(v) === activeVariantId) return;
                  setNotice(null);
                  switchVariant(v, "manual");
                }}
              >
                {chapter.variants.map((v) => (
                  <option key={variantIdOf(v)} value={variantIdOf(v)}>
                    {[v.source, v.group?.name, languageLabel(v.language ?? chapter.language), v.edition === "official" ? "Official" : null, failed.has(variantIdOf(v)) ? "failed" : null].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="muted" style={{ fontSize: "var(--text-xs)" }}>
            Pages scroll top to bottom. Double-tap or pinch to zoom. Keys: [ and ] change chapter, C opens comments, Z zooms.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

const WIDTHS: { id: Settings["readerWidth"]; label: string; px?: number }[] = [
  { id: "narrow", label: "Narrow", px: 600 },
  { id: "comfortable", label: "Comfortable", px: 820 },
  { id: "fit", label: "Fit screen" },
];

function useWide() {
  const q = "(min-width: 600px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

/**
 * Live preview for the width setting (D65): a scaled screen showing the page you're on
 * (its already-loaded image, no new request) at the chosen width.
 */
function WidthPreview({ src, width, page }: { src?: string; width: Settings["readerWidth"]; page: number }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const w = WIDTHS.find((x) => x.id === width);
  const frac = w?.px ? Math.min(1, w.px / vw) : 1;
  return (
    <figure className="rd-preview" aria-hidden="true">
      <div className="rd-preview-screen">
        <div className="rd-preview-page" style={{ width: `${frac * 100}%` }}>
          {src ? <img src={src} alt="" decoding="async"/> : null}
        </div>
      </div>
      <figcaption className="rd-preview-cap">
        Page {page} at {w?.label ?? "Fit screen"} · {w?.px ? `${Math.min(w.px, vw)}px` : "full width"} of your {vw}px window
      </figcaption>
    </figure>
  );
}

/** Several events can land at one chapter end (chapter, series, quest): show them as one beat. */
function mergeMoment(a: Moment | null, b: Moment): Moment {
  if (!a) return b;
  return {
    xp: a.xp + b.xp,
    levelUp: b.levelUp ?? a.levelUp,
    tiers: [...a.tiers, ...b.tiers],
    genres: [...a.genres, ...b.genres],
    completed: a.completed || b.completed,
    quests: [...a.quests, ...b.quests],
    unlocks: [...a.unlocks, ...b.unlocks],
    after: b.after,
  };
}

/** The chapter-end reward beat: XP, level ring and anything newly earned. Static under reduced motion. */
function RewardBeat({ m }: { m: Moment }) {
  const lv = m.after.level;
  const extras = [
    ...m.quests.map((q) => `Quest done: ${q.title}`),
    ...m.unlocks.map((u) => `Unlocked ${u.name}`),
    ...m.tiers.map((t) => `${t.set.name} ${["", "I", "II", "III", "IV", "V"][t.tier]}`),
    ...(m.genres.length ? [`Passport stamp: ${m.genres.join(", ")}`] : []),
  ];
  return (
    <div className={`rd-beat ${m.completed ? "rd-beat-done" : ""}`} role="status">
      {m.completed && (
        <div className="rd-beat-series">
          <Mascot variant="full" size={120} pose="done" className="rd-beat-mascot" />
          <p className="rd-beat-big">Series complete</p>
          <p className="rd-end-note">You read it to the final chapter. It's on your shelf under Completed.</p>
        </div>
      )}
      <div className="rd-beat-row">
        <ProgressRing value={lv.progress} size={56} stroke={5} label={`Level ${lv.level}, ${lv.into} of ${lv.span} XP`}>
          <span className="rd-beat-lv">{lv.level}</span>
        </ProgressRing>
        <div className="rd-beat-text">
          <p className="rd-beat-xp">+{m.xp} XP</p>
          <p className="rd-beat-sub">{m.levelUp ? `Level up · ${lv.tier.name}` : `${lv.span - lv.into} XP to level ${lv.level + 1}`}</p>
        </div>
        <Link className="link-btn rd-beat-link" to="/achievements">
          Awards
        </Link>
      </div>
      {extras.length > 0 && (
        <ul className="rd-beat-list">
          {extras.slice(0, 4).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Height of the fixed reader bar, so restored positions land below it. */
function barHeight(): number {
  return document.querySelector<HTMLElement>(".rd-top")?.offsetHeight ?? 0;
}

const POS_KEY = "dawghwa.pos.";
function readPos(chapterId: string): { page: number; offset?: number; t: number } | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(POS_KEY + chapterId) ?? "null");
    return v && typeof v.page === "number" && typeof v.t === "number" ? v : undefined;
  } catch {
    return undefined;
  }
}
function writePos(chapterId: string, page: number, offset?: number) {
  try {
    localStorage.setItem(POS_KEY + chapterId, JSON.stringify({ page, offset, t: Date.now() }));
    // keep the mirror small: drop all but the 20 most recent chapters
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(POS_KEY));
    if (keys.length > 20)
      keys
        .map((k) => [k, readPos(k.slice(POS_KEY.length))?.t ?? 0] as const)
        .sort((a, b) => a[1] - b[1])
        .slice(0, keys.length - 20)
        .forEach(([k]) => localStorage.removeItem(k));
  } catch {
    /* storage full or blocked: IndexedDB progress still applies */
  }
}

/** The page at the top of the viewport and how far into it (0–1) the reader has scrolled. */
function measureAnchor(root: HTMLElement): { page: number; offset: number } | null {
  for (const el of root.querySelectorAll<HTMLElement>(".rd-page")) {
    const r = el.getBoundingClientRect();
    if (r.bottom > 0)
      return {
        page: Number(el.dataset.index),
        offset: r.height ? Math.max(0, -r.top) / r.height : 0,
      };
  }
  return null;
}

/** Source ids ("mangadex") read as names ("MangaDex") when the source list hasn't loaded. */
function prettySource(name: string): string {
  const known: Record<string, string> = {
    mangadex: "MangaDex",
    anilist: "AniList",
    comick: "ComicK",
    mangapill: "MangaPill",
  };
  return known[name.toLowerCase()] ?? name.charAt(0).toUpperCase() + name.slice(1);
}
