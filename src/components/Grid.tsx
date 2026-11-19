import { useEffect, useRef } from "react";
import type { Title } from "@/lib/titles";
import { TitleCard } from "./TitleCard";

/** Responsive cover grid with an infinite-scroll sentinel (and a real button fallback). */
export function TitleGrid({ items, onMore, hasMore, loadingMore, context, reasons, density, highlight }: { density?: "compact" | "covers"; highlight?: string; items: Title[]; onMore?: () => void; hasMore?: boolean; loadingMore?: boolean; context?: string; reasons?: Map<string, string> }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onMore || !hasMore || !end.current) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && !loadingMore && onMore(), { rootMargin: "800px 0px" });
    io.observe(end.current);
    return () => io.disconnect();
  }, [onMore, hasMore, loadingMore]);
  return (
    <>
      <div className="grid" data-density={density}>
        {items.map((t, i) => (
          <TitleCard key={t.key} title={t} context={context} eager={i < 6} reason={reasons?.get(t.key)} highlight={highlight} />
        ))}
      </div>
      <div ref={end} />
      {hasMore && onMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <button className="btn" onClick={onMore} disabled={loadingMore} aria-busy={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
