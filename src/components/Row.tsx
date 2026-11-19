import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { animateScrollLeft, shelfTarget } from "@/lib/motion";

/** Editorial section heading: numbered (via CSS counter inside .feed), title, honest subtitle, "See all". */
export function SectionHead({ id, title, subtitle, more, action }: { id: string; title: string; subtitle?: string; more?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div className="section-titles">
        <h2 id={`row-${id}`}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
      {more && (
        <Link to={more} className="see-all" aria-label={`See all: ${title}`}>
          See all <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}

/** Horizontal shelf: native scroll + snap on touch, arrow buttons on desktop. */
export function Row({ id, title, subtitle, more, children, ranked, className = "", action }: { id: string; title: string; subtitle?: string; more?: string; children: ReactNode; ranked?: boolean; className?: string; action?: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);
  // arrows land on a card edge (snap-to-card) with the shared slide timing
  const by = (dir: 1 | -1) => {
    const el = track.current;
    if (el) void animateScrollLeft(el, shelfTarget(el, dir));
  };
  return (
    <section className={`section row ${ranked ? "row-ranked" : ""} ${className}`} aria-labelledby={`row-${id}`}>
      <SectionHead id={id} title={title} subtitle={subtitle} more={more} action={action} />
      <div className="row-frame">
        <div className="row-nav" data-side="prev">
          <button onClick={() => by(-1)} disabled={edges.start} aria-label="Scroll left" tabIndex={-1}>
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="row-track" ref={track}>
          {children}
        </div>
        <div className="row-nav" data-side="next">
          <button onClick={() => by(1)} disabled={edges.end} aria-label="Scroll right" tabIndex={-1}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
