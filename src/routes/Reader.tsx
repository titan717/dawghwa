import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, Check, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, ListOrdered, RotateCw, Settings2 } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { ChapterNo } from "@/components/Editorial";
import { Sheet } from "@/components/Layer";
import { ErrorState, errorText } from "@/components/States";
import { useChapters, usePages, useSources, useTitle } from "@/lib/query";
import { updateSettings, useSettings, type Fit, type ReaderMode } from "@/lib/settings";
import { saveProgress, useUser } from "@/lib/store/user";
import { lifecycle, onBack, setImmersive, haptic } from "@/lib/platform";
import { prefersVertical, readerPath, titlePath, type Title } from "@/lib/titles";
import { useHead } from "@/lib/seo";
import { coverSrc } from "@/lib/api/images";
import type { Chapter, ChapterPage } from "@/lib/api/types";

type Mode = Exclude<ReaderMode, "auto">;

/** One page image: reserves space before load, retries on failure, never fakes content. */
function PageImage({ page, eager, onFail, onLoad, ratio, fit }: { page: ChapterPage; eager: boolean; onFail: (i: number) => void; onLoad: (i: number, r: number) => void; ratio?: number; fit: Fit }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const src = attempt === 0 ? page.url : `${page.url}${page.url.includes("?") ? "&" : "?"}r=${attempt}`;
  const ar = ratio ?? (page.width && page.height ? page.height / page.width : undefined);
  return (
    <div className={`rd-page rd-fit-${fit}`} data-state={state} style={ar ? ({ "--ar": ar } as React.CSSProperties) : undefined} data-index={page.index}>
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
      {state === "loading" && <span className="rd-page-num" aria-hidden="true">{page.index + 1}</span>}
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

function useReaderMode(title: Title | undefined): Mode {
  const s = useSettings();
  if (s.readerMode !== "auto") return s.readerMode;
  return prefersVertical(title) ? "vertical" : "single";
}

export default function Reader() {
  const { source = "", id = "", chapterId = "" } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const settings = useSettings();
  const sources = useSources();
  const t = useTitle(source, id);
  const title = t.data;
  const chapters = useChapters(title);
  const prog = useUser((s) => (title ? s.progress.get(title.key) : undefined));
  const src = sources.data?.find((s) => s.id === source);
  const readable = sources.data ? Boolean(src?.capabilities.chapterPages) : true;
  const pagesQ = usePages(source, chapterId, settings.dataSaver, readable);
  const mode = useReaderMode(title);
  const rtl = settings.direction === "rtl" && mode !== "vertical";
  const pages = useMemo(() => pagesQ.data?.pages ?? [], [pagesQ.data]);
  const count = pages.length;

  const list = useMemo(() => chapters.data?.chapters ?? [], [chapters.data]);
  const idx = list.findIndex((c) => c.id === chapterId);
  const chapter: Chapter | undefined = list[idx];
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 ? list[idx + 1] : undefined;

  // a synchronous position mirror covers reloads that land before the IndexedDB write commits
  const mirror = chapterId ? readPos(chapterId) : undefined;
  const fresh = mirror && (prog?.chapterId !== chapterId || mirror.t > (prog?.updatedAt ?? 0)) ? mirror : undefined;
  const startPage = Number(params.get("p") ?? (fresh ? fresh.page : prog?.chapterId === chapterId ? prog.page : 0)) || 0;
  const [page, setPage] = useState(startPage);
  const [controls, setControls] = useState(true);
  const [panel, setPanel] = useState(false);
  const [chList, setChList] = useState(false);
  useEffect(() => {
    if (chList) requestAnimationFrame(() => document.querySelector('.rd-ch[aria-current="true"]')?.scrollIntoView({ block: "center" }));
  }, [chList]);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [failures, setFailures] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [endView, setEndView] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  useHead({ title: title ? `${title.title}${chapter ? ` · Chapter ${chapter.number}` : ""}` : "Reader", noindex: true });

  // reset per chapter
  useEffect(() => {
    setPage(startPage);
    setCountdown(null);
    setReachedEnd(false);
    setEndView(false);
    setFailures(0);
    setRatios({});
    restored.current = false;
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // immersive system bars follow the controls
  useEffect(() => {
    void setImmersive(!controls);
  }, [controls]);
  useEffect(() => () => void setImmersive(false), []);

  // ------------------------------------------------------------ progress
  // vertical mode: the page at the top of the viewport and how far into it the reader is
  const anchor = useRef<{ page: number; offset: number } | null>(null);
  const latest = useRef({ page, reachedEnd });
  latest.current = { page, reachedEnd };
  // true while a restored position is being held in place; programmatic scrolls then are not reader intent
  const pinning = useRef(false);
  const save = useCallback(
    (finished = latest.current.reachedEnd) => {
      if (!title || !chapter || !count) return;
      // measure at save time: images above may have changed height since the last scroll event
      if (mode === "vertical" && scroller.current && !pinning.current) anchor.current = measureAnchor(scroller.current) ?? anchor.current;
      const a = mode === "vertical" ? anchor.current : null;
      const p = Math.min(a ? a.page : latest.current.page, count - 1);
      writePos(chapter.id, p, a?.offset);
      void saveProgress({ title, chapterId: chapter.id, chapterNumber: chapter.number, chapterTitle: chapter.title, page: p, offset: a?.offset, pageCount: count, fraction: finished ? 1 : (p + 1) / count, finished, lastChapterNumber: list.at(-1)?.number });
    },
    [title, chapter, count, list, mode],
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

  // ------------------------------------------------------------ vertical tracking
  useEffect(() => {
    if (mode !== "vertical" || !count || !scroller.current) return;
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
    const end = root.querySelector(".rd-end");
    const endIo = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setReachedEnd(true), { threshold: 0.3 });
    if (end) endIo.observe(end);
    return () => {
      io.disconnect();
      endIo.disconnect();
    };
  }, [mode, count, chapterId]);

  // track the exact reading position (page at the viewport top + offset inside it), saved with progress
  useEffect(() => {
    if (mode !== "vertical" || !count) return;
    let raf = 0;
    let last = 0;
    let trailing = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!scroller.current) return;
        anchor.current = measureAnchor(scroller.current) ?? anchor.current;
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
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(trailing);
      window.removeEventListener("scroll", on);
    };
  }, [mode, count, chapterId]);

  // restore the saved position once pages exist; keep it pinned while images above it load
  // and change height, until the reader scrolls or touches the page themselves
  useEffect(() => {
    if (mode !== "vertical" || !count || !title || restored.current) return;
    restored.current = true;
    anchor.current = null;
    const offset = fresh && fresh.page === startPage ? (fresh.offset ?? 0) : prog?.chapterId === chapterId && prog.page === startPage ? (prog.offset ?? 0) : 0;
    if (startPage <= 0 && offset <= 0) return void window.scrollTo(0, 0);
    const root = scroller.current;
    if (!root) return;
    const pin = () => {
      const el = root.querySelector<HTMLElement>(`[data-index="${startPage}"]`);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * offset;
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
  }, [mode, count, startPage, title]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ paged
  const spreads = useMemo(() => {
    if (mode !== "double") return pages.map((_, i) => [i]);
    const out: number[][] = [[0]];
    for (let i = 1; i < count; i += 2) out.push(i + 1 < count ? [i, i + 1] : [i]);
    return out;
  }, [mode, pages, count]);
  const spreadIdx = Math.max(0, spreads.findIndex((s) => s.includes(page)));
  const goChapter = useCallback(
    (c?: Chapter) => {
      if (!c || !title) return;
      save();
      nav(readerPath(title, c.id), { replace: true });
    },
    [nav, title, save],
  );
  const step = useCallback(
    (dir: 1 | -1) => {
      if (mode === "vertical") {
        window.scrollBy({ top: dir * window.innerHeight * 0.85, behavior: "smooth" });
        return;
      }
      if (endView) {
        if (dir === 1) goChapter(next);
        else setEndView(false);
        return;
      }
      const ni = spreadIdx + dir;
      if (ni >= spreads.length) {
        setReachedEnd(true);
        setEndView(true);
        return;
      }
      if (ni < 0) return;
      const target = spreads[ni]!;
      setPage(target[0]!);
      if (ni === spreads.length - 1) setReachedEnd(true);
    },
    [mode, spreadIdx, spreads, endView, next, goChapter],
  );
  useEffect(() => {
    if (mode !== "vertical" && spreads.length && spreadIdx === spreads.length - 1) setReachedEnd(true);
  }, [mode, spreads, spreadIdx]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel || chList || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const fwd = rtl ? "ArrowLeft" : "ArrowRight";
      const back = rtl ? "ArrowRight" : "ArrowLeft";
      if (e.key === fwd || (mode !== "vertical" && (e.key === " " || e.key === "PageDown"))) {
        e.preventDefault();
        step(1);
      } else if (e.key === back || (mode !== "vertical" && e.key === "PageUp")) {
        e.preventDefault();
        step(-1);
      }
      else if (e.key === "]") goChapter(next);
      else if (e.key === "[") goChapter(prev);
      else if (e.key === "m") setControls((c) => !c);
      else if (e.key === "Escape") setControls(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rtl, mode, step, goChapter, next, prev, panel, chList]);

  // Android back / Escape: close panel, then leave to the title page
  useEffect(
    () =>
      onBack(() => {
        if (panel) return (setPanel(false), true);
        if (chList) return (setChList(false), true);
        if (title) nav(titlePath(title), { replace: true });
        else nav(-1);
        return true;
      }),
    [panel, chList, title, nav],
  );

  // swipe for paged modes
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    touch.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s || mode === "vertical") return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - s.t < 600) {
      const forward = rtl ? dx > 0 : dx < 0;
      step(forward ? 1 : -1);
      swiped.current = true;
    }
  };
  const swiped = useRef(false);
  const onTap = (e: React.MouseEvent) => {
    if (swiped.current) return void (swiped.current = false);
    if ((e.target as HTMLElement).closest("button, a")) return;
    const x = e.clientX / window.innerWidth;
    if (mode === "vertical" || !settings.tapZones || (x > 0.3 && x < 0.7)) return setControls((c) => !c);
    const forward = rtl ? x < 0.3 : x > 0.7;
    step(forward ? 1 : -1);
  };

  const onLoad = useCallback((i: number, r: number) => setRatios((m) => (m[i] === r ? m : { ...m, [i]: r })), []);
  const onFail = useCallback(() => setFailures((n) => n + 1), []);

  // auto-advance: countdown on the end panel
  useEffect(() => {
    if (!reachedEnd || !settings.autoNext || !next || mode !== "vertical") return setCountdown(null);
    setCountdown(5);
    const iv = setInterval(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearInterval(iv);
  }, [reachedEnd, settings.autoNext, next, mode]);
  // Fire once per countdown: clear it before navigating, so the next chapter's "next" can't re-trigger it.
  useEffect(() => {
    if (countdown !== 0) return;
    setCountdown(null);
    goChapter(next);
  }, [countdown, goChapter, next]);

  // Blueprint "Pull to read next": at the very bottom of a scrolled chapter, dragging up past
  // the end by ~90px opens the next chapter. The visible button does the same for taps, mice and keyboards.
  const [pull, setPull] = useState(0);
  const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (mode !== "vertical" || !next) return;
    let startY: number | null = null;
    let amount = 0;
    const atBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    const onStart = (e: TouchEvent) => {
      startY = atBottom() ? e.touches[0]!.clientY : null;
      amount = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      amount = Math.max(0, (startY - e.touches[0]!.clientY) / 90);
      setPull(amount);
    };
    const onEnd = () => {
      if (startY !== null && amount >= 1) goChapter(next);
      startY = null;
      amount = 0;
      setPull(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [mode, next, goChapter]);

  // preload upcoming pages in paged mode
  useEffect(() => {
    if (mode === "vertical") return;
    for (let i = page + 1; i < Math.min(count, page + 4); i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = pages[i]!.url;
    }
  }, [mode, page, pages, count]);

  const sourceName = src?.name ?? title?.sourceName ?? source;
  const backTo = title ? titlePath(title) : "/";

  // ------------------------------------------------------------ states
  if (sources.data && !readable)
    return (
      <div className="reader reader-msg">
        <div className="state state-center">
          <h1 style={{ fontSize: "var(--text-xl)" }}>Reading isn't available for {sourceName} in Dawghwa</h1>
          <p>This source doesn't provide chapter pages through the Dawghwa API, so the chapter opens on the source's own site.</p>
          <div className="cluster">
            {chapter && (
              <a className="btn btn-primary" href={chapter.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} /> Open on {sourceName}
              </a>
            )}
            <Link className="btn" to={backTo}>
              Back to title
            </Link>
          </div>
        </div>
      </div>
    );

  const creators = [...new Set([...(title?.meta?.authors ?? []), ...(title?.meta?.artists ?? [])])];
  const vertical = mode === "vertical";
  // Blueprint v2 reader end: Creator block, Next card with cover, TOP, and "Pull to read next".
  const endPanel = (
    <div className="rd-end" aria-live="polite">
      <section className="rd-end-sheet">
        <p className="rd-end-kicker">
          End of <ChapterNo n={chapter?.number} />
        </p>
        {creators.length > 0 && (
          <div className="rd-creator">
            <h2>Creator</h2>
            <p>{creators.join(", ")}</p>
          </div>
        )}
        {next ? (
          <button className="rd-next-card" onClick={() => goChapter(next)}>
            {title?.cover ? <img src={coverSrc(title.cover)} alt="" referrerPolicy="no-referrer" decoding="async" /> : <span className="rd-next-thumb" />}
            <span className="rd-next-body">
              <strong>Next Chapter</strong>
              <span>
                Chapter {next.number}
                {next.title ? `: ${next.title}` : ""}
              </span>
            </span>
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        ) : list.length ? (
          <div className="rd-caught">
            <Mascot size={96} className="rd-end-mascot" pose="done" />
            <div>
              <h2 className="rd-end-title">You're caught up</h2>
              <p className="rd-end-note">This is the latest chapter on {sourceName}. New chapters show up in My Series when they're released.</p>
            </div>
          </div>
        ) : null}
        {countdown !== null && countdown > 0 && (
          <p className="rd-countdown">
            Continuing in {countdown}s ·{" "}
            <button className="link-btn" onClick={() => setCountdown(null)}>
              Stay here
            </button>
          </p>
        )}
        <Link className="rd-back-title" to={backTo}>
          Back to {title?.title ?? "title"}
        </Link>
      </section>
      {vertical && (
        <div className="rd-pull" data-armed={pull >= 1 || undefined}>
          <button className="rd-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })} aria-label="Back to top of chapter">
            <ChevronUp size={18} aria-hidden="true" />
            TOP
          </button>
          {next && (
            <button className="rd-pull-go" onClick={() => goChapter(next)} style={{ "--pull": Math.min(1, pull) } as React.CSSProperties}>
              <span className="rd-pull-ico" aria-hidden="true">
                <ArrowDown size={30} strokeWidth={1.8} />
              </span>
              <span>{pull >= 1 ? "Release to read next chapter" : "Pull to read next chapter"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  const body = pagesQ.isError ? (
    <div className="state state-center">
      <ErrorState error={pagesQ.error} retry={() => void pagesQ.refetch()} />
      {errorText(pagesQ.error).offline && <p className="muted">Chapter pages aren't stored offline. Reconnect to keep reading.</p>}
    </div>
  ) : !pagesQ.data ? (
    <div className="rd-loading" aria-busy="true">
      <div className="rd-page skeleton" />
    </div>
  ) : !count ? (
    <div className="state state-center">
      <h2>This chapter has no pages</h2>
      <p>{sourceName} returned an empty chapter. It may be hosted externally.</p>
      {chapter && (
        <a className="btn" href={chapter.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} /> Open on {sourceName}
        </a>
      )}
    </div>
  ) : mode === "vertical" ? (
    <div className={`rd-strip ${settings.pageGap ? "rd-gap" : ""}`} ref={scroller}>
      {pages.map((p) => (
        <PageImage key={p.url} page={p} eager={Math.abs(p.index - startPage) < 3} onFail={onFail} onLoad={onLoad} ratio={ratios[p.index]} fit="width" />
      ))}
      {endPanel}
    </div>
  ) : endView ? (
    endPanel
  ) : (
    <div className={`rd-spread ${rtl ? "rd-rtl" : ""} rd-fit-${settings.fit}`} data-count={spreads[spreadIdx]?.length}>
      {(spreads[spreadIdx] ?? []).map((i) => (
        <PageImage key={pages[i]!.url} page={pages[i]!} eager onFail={onFail} onLoad={onLoad} ratio={ratios[i]} fit={settings.fit} />
      ))}
    </div>
  );

  const pageLabel = count ? (mode === "double" ? `${(spreads[spreadIdx] ?? []).map((i) => i + 1).join("-")} / ${count}` : `${Math.min(page, count - 1) + 1} / ${count}`) : "";

  const fraction = count ? (reachedEnd ? 1 : (Math.min(page, count - 1) + 1) / count) : 0;

  return (
    <div className={`reader reader-${mode}`} data-controls={controls || undefined} onClick={onTap} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div className="rd-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${fraction})` }} />
      </div>
      <header className="rd-top" aria-hidden={!controls} inert={!controls || undefined}>
        <Link className="icon-btn" to={backTo} replace aria-label="Back to title">
          <ArrowLeft size={20} />
        </Link>
        <div className="rd-titles">
          <span className="rd-series">{title?.title ?? (t.isError ? "Reader" : "Loading…")}</span>
          <span className="rd-chapter">
            {[chapter ? `Chapter ${chapter.number}${chapter.title ? `: ${chapter.title}` : ""}` : "", chapter?.group?.name, `via ${prettySource(sourceName)}`].filter(Boolean).join(" · ")}
          </span>
        </div>
        {list.length > 1 && (
          <button className="icon-btn" aria-label="Chapters" aria-haspopup="dialog" onClick={() => setChList(true)}>
            <ListOrdered size={20} />
          </button>
        )}
        <button className="icon-btn" aria-label="Reader settings" aria-haspopup="dialog" onClick={() => setPanel(true)}>
          <Settings2 size={20} />
        </button>
      </header>

      <main className="rd-body">
        {failures >= 3 && (
          <div className="banner banner-warn rd-banner" role="status">
            Several pages failed. Image links from {sourceName} can expire.
            <button className="btn btn-sm" onClick={() => (setFailures(0), void pagesQ.refetch())}>
              Reload pages
            </button>
          </div>
        )}
        {body}
      </main>

      {count > 0 && (
        <footer className="rd-bottom" aria-hidden={!controls} inert={!controls || undefined}>
        <button className="icon-btn" disabled={!(rtl ? next : prev)} onClick={() => goChapter(rtl ? next : prev)} aria-label={rtl ? "Next chapter" : "Previous chapter"}>
          <ChevronLeft size={20} />
        </button>
        {count > 1 ? (
          <input
            className="rd-slider"
            type="range"
            min={0}
            max={count - 1}
            value={Math.min(page, count - 1)}
            dir={rtl ? "rtl" : "ltr"}
            aria-label="Page"
            aria-valuetext={`Page ${page + 1} of ${count}`}
            onChange={(e) => {
              const p = Number(e.target.value);
              setPage(p);
              setEndView(false);
              if (mode === "vertical") scroller.current?.querySelector(`[data-index="${p}"]`)?.scrollIntoView({ block: "start" });
              if (p === count - 1) setReachedEnd(true);
            }}
          />
        ) : (
          <span style={{ flex: 1 }} />
        )}
        {rtl && count > 1 && (
          <span className="rd-dir" title="Pages run right to left">
            <ArrowLeft size={13} aria-hidden="true" /> RTL
          </span>
        )}
        <span className="rd-count">{pageLabel}</span>
        <button className="icon-btn" disabled={!(rtl ? prev : next)} onClick={() => goChapter(rtl ? prev : next)} aria-label={rtl ? "Previous chapter" : "Next chapter"}>
          <ChevronRight size={20} />
        </button>
        </footer>
      )}

      <Sheet open={chList} onClose={() => setChList(false)} title="Chapters">
        <ol className="rd-chlist" onClick={(e) => e.stopPropagation()}>
          {[...list].reverse().map((c) => {
            const read = Boolean(prog?.read[c.id]);
            return (
              <li key={c.id}>
                <button className="rd-ch" aria-current={c.id === chapterId ? "true" : undefined} data-read={read || undefined} onClick={() => (setChList(false), goChapter(c))}>
                  <ChapterNo n={c.number} />
                  <span className="rd-ch-title">{c.title || `Chapter ${c.number}`}</span>
                  {read && <Check size={16} aria-label="Read" />}
                </button>
              </li>
            );
          })}
        </ol>
      </Sheet>
      <Sheet open={panel} onClose={() => setPanel(false)} title="Reader settings">
        <div className="stack" onClick={(e) => e.stopPropagation()}>
          <div className="settings-row">
            <span>Layout</span>
            <div className="segmented" role="radiogroup" aria-label="Layout">
              {(["auto", "vertical", "single", "double"] as const).map((m) => (
                <button key={m} role="radio" aria-checked={settings.readerMode === m} onClick={() => updateSettings({ readerMode: m })}>
                  {m === "auto" ? "Auto" : m === "vertical" ? "Scroll" : m === "single" ? "Single" : "Double"}
                </button>
              ))}
            </div>
          </div>
          {mode !== "vertical" && (
            <>
              <div className="settings-row">
                <span>Direction</span>
                <div className="segmented" role="radiogroup" aria-label="Reading direction">
                  <button role="radio" aria-checked={settings.direction === "rtl"} onClick={() => updateSettings({ direction: "rtl" })}>
                    Right to left
                  </button>
                  <button role="radio" aria-checked={settings.direction === "ltr"} onClick={() => updateSettings({ direction: "ltr" })}>
                    Left to right
                  </button>
                </div>
              </div>
              <div className="settings-row">
                <span>Fit</span>
                <div className="segmented" role="radiogroup" aria-label="Page fit">
                  {(["width", "height", "original"] as const).map((f) => (
                    <button key={f} role="radio" aria-checked={settings.fit === f} onClick={() => updateSettings({ fit: f })}>
                      {f === "width" ? "Width" : f === "height" ? "Height" : "Original"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="switch settings-row">
                <span>Tap edges to turn pages</span>
                <input type="checkbox" checked={settings.tapZones} onChange={(e) => updateSettings({ tapZones: e.target.checked })} />
              </label>
            </>
          )}
          {mode === "vertical" && (
            <>
              <label className="switch settings-row">
                <span>Gap between pages</span>
                <input type="checkbox" checked={settings.pageGap} onChange={(e) => updateSettings({ pageGap: e.target.checked })} />
              </label>
              <label className="switch settings-row">
                <span>Continue to next chapter automatically</span>
                <input type="checkbox" checked={settings.autoNext} onChange={(e) => updateSettings({ autoNext: e.target.checked })} />
              </label>
            </>
          )}
          <label className="switch settings-row">
            <span>
              Data saver
              <small className="muted" style={{ display: "block" }}>
                Smaller, compressed page images
              </small>
            </span>
            <input type="checkbox" checked={settings.dataSaver} onChange={(e) => (updateSettings({ dataSaver: e.target.checked }), void haptic("light"))} />
          </label>
          <p className="muted" style={{ fontSize: "var(--text-xs)" }}>
            Keys: arrows turn pages, [ and ] change chapter, M toggles controls.
          </p>
        </div>
      </Sheet>
    </div>
  );
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
    if (keys.length > 20) keys.map((k) => [k, readPos(k.slice(POS_KEY.length))?.t ?? 0] as const).sort((a, b) => a[1] - b[1]).slice(0, keys.length - 20).forEach(([k]) => localStorage.removeItem(k));
  } catch {
    /* storage full or blocked: IndexedDB progress still applies */
  }
}

/** The page at the top of the viewport and how far into it (0–1) the reader has scrolled. */
function measureAnchor(root: HTMLElement): { page: number; offset: number } | null {
  for (const el of root.querySelectorAll<HTMLElement>(".rd-page")) {
    const r = el.getBoundingClientRect();
    if (r.bottom > 0) return { page: Number(el.dataset.index), offset: r.height ? Math.max(0, -r.top) / r.height : 0 };
  }
  return null;
}

/** Source ids ("mangadex") read as names ("MangaDex") when the source list hasn't loaded. */
function prettySource(name: string): string {
  const known: Record<string, string> = { mangadex: "MangaDex", anilist: "AniList", comick: "ComicK", mangapill: "MangaPill" };
  return known[name.toLowerCase()] ?? (name.charAt(0).toUpperCase() + name.slice(1));
}
