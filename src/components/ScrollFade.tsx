import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal scroller with decorative edge fades that appear only when there is more
 * content on that side (DESIGN_REVIEW_C2 #20). The fades never take pointer events and
 * are narrow (24px) so they can't fully cover a focused item. When `activeSelector`
 * matches a child, it is scrolled into view on mount and when `activeKey` changes.
 */
export function ScrollFade({ children, className = "", label, role, activeSelector, activeKey, sticky }: { children: ReactNode; className?: string; label?: string; role?: string; activeSelector?: string; activeKey?: string; sticky?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const x = Math.abs(el.scrollLeft);
      setEdges((e) => {
        const next = { start: x > 2, end: x < max - 2 };
        return e.start === next.start && e.end === next.end ? e : next;
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : undefined;
    ro?.observe(el);
    return () => (el.removeEventListener("scroll", update), ro?.disconnect());
  }, []);
  useEffect(() => {
    if (!activeSelector) return;
    const a = ref.current?.querySelector<HTMLElement>(activeSelector);
    const el = ref.current;
    if (!a || !el) return;
    // scroll only the strip, never the page
    const left = a.offsetLeft - (el.clientWidth - a.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "auto" });
  }, [activeSelector, activeKey]);
  return (
    <div className={`scroll-fade ${sticky ? "scroll-fade-sticky" : ""}`} data-fade-start={edges.start || undefined} data-fade-end={edges.end || undefined}>
      <div ref={ref} className={`scroll-fade-track ${className}`} role={role} aria-label={role ? label : undefined}>
        {children}
      </div>
    </div>
  );
}
