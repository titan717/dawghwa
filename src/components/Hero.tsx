import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "@/components/Toast";
import { useChapters } from "@/lib/query";
import { setStatus, useUser } from "@/lib/store/user";
import { kindLabel, markUnreadable, plainText, readerPath, statusLabel, titlePath, type Title } from "@/lib/titles";
import { coverSrc } from "@/lib/api/images";
import { animateScrollLeft } from "@/lib/motion";

/**
 * Blueprint home hero: one large artwork card per featured series, title and
 * genres centred over a dark fade, a white "Start reading" pill and a glass
 * "Save" button. Slides are a native scroll-snap track (swipe on touch,
 * arrows/dots/keyboard elsewhere); nothing auto-advances. The active slide's
 * key art drifts slowly (ken-burns) and its copy rises in; both are CSS-only and
 * off under reduced motion.
 */
export function Hero({ items }: { items: Title[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root: el, threshold: [0.6] },
    );
    el.querySelectorAll<HTMLElement>(".hero-slide").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el || !items.length) return;
      const n = (i + items.length) % items.length;
      const slide = el.children[n] as HTMLElement | undefined;
      // tweened with --dur-slide / --ease-out rather than the browser's variable smooth scroll
      void animateScrollLeft(el, slide ? slide.offsetLeft - el.offsetLeft : 0);
    },
    [items.length],
  );

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    go(active + (e.key === "ArrowRight" ? 1 : -1));
  };

  return (
    <section className="hero" aria-roledescription="carousel" aria-label="Featured series" onKeyDown={onKey}>
      <div className="hero-track" ref={track}>
        {items.map((t, i) => (
          <HeroSlide key={t.key} t={t} i={i} n={items.length} active={i === active} />
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button className="hero-arrow" data-side="prev" onClick={() => go(active - 1)} aria-label="Previous featured series">
            <ChevronLeft size={22} />
          </button>
          <button className="hero-arrow" data-side="next" onClick={() => go(active + 1)} aria-label="Next featured series">
            <ChevronRight size={22} />
          </button>
          <div className="hero-dots" role="group" aria-label="Choose featured series">
            {items.map((x, i) => (
              <button key={x.key} aria-label={`Show ${x.title}`} aria-current={i === active || undefined} onClick={() => go(i)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function HeroSlide({ t, i, n, active }: { t: Title; i: number; n: number; active: boolean }) {
  const lib = useUser((s) => s.library.get(t.key));
  const p = useUser((s) => s.progress.get(t.key));
  // chapters only for the visible slide: one request, not one per slide
  const chapters = useChapters(active ? t : undefined);
  const first = chapters.data?.chapters[0];
  useEffect(() => {
    if (chapters.data && !chapters.data.chapters.length) markUnreadable(t.key);
  }, [chapters.data, t.key]);
  const saved = Boolean(lib?.status);
  const read = p ? { to: readerPath(t, p.chapterId, p.page || undefined), label: `Continue ch. ${p.chapterNumber}` } : first
      ? { to: readerPath(t, first.id), label: "Start reading" }
      : { to: titlePath(t), label: chapters.data ? "View series" : "Start reading" };
  const genres = (t.meta?.genres ?? []).slice(0, 3);
  const facts = [kindLabel(t.meta?.kind), statusLabel(t.meta?.status)].filter(Boolean).join(" · ");
  const art = coverSrc(t.coverLarge ?? t.cover);
  return (
    <article className="hero-slide" data-i={i} aria-roledescription="slide" aria-label={`${i + 1} of ${n}: ${t.title}`} aria-hidden={!active || undefined} inert={!active || undefined}>
      <Link to={titlePath(t)} className="hero-art" tabIndex={-1} aria-hidden="true">
        {art && <img src={art} alt="" loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} decoding="async" referrerPolicy="no-referrer" onError={hideBroken} />}
      </Link>
      {art && (
        <div className="hero-cover" aria-hidden="true">
          <img src={art} alt="" loading={i === 0 ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={hideBroken} />
        </div>
      )}
      <div className="hero-body">
        {facts && <p className="hero-kicker">{facts}</p>}
        <h2 className="hero-title" data-long={t.title.length > 60 ? "xl" : t.title.length > 30 ? "l" : undefined}>
          <Link to={titlePath(t)}>{t.title}</Link>
        </h2>
        {genres.length > 0 && <p className="hero-genres">{genres.join(", ")}</p>}
        {t.meta?.description && <p className="hero-desc">{plainText(t.meta.description)}</p>}
        <div className="hero-actions">
          <Link className="btn btn-light btn-lg" to={read.to}>
            {read.label}
          </Link>
          <button
            className="btn btn-glass btn-lg"
            aria-pressed={saved}
            onClick={() => {
              const was = lib?.status;
              void setStatus(t, saved ? undefined : "plan");
              toast(saved ? "Removed from your library" : "Saved to your library", { label: "Undo", run: () => void setStatus(t, was) });
            }}
          >
            {saved ? <Check size={18} /> : <Plus size={18} />} {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}

/** A failed key-art image disappears instead of showing the browser's broken-image glyph; the brand gradient shows through. */
function hideBroken(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.dataset.failed = "";
}
