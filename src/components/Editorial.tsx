import { memo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { prefetchTitle } from "@/lib/query";
import { compactNumber, kindLabel, plainText, statusLabel, titlePath, type Title, isMature } from "@/lib/titles";
import { Cover } from "./Cover";

/** "CH.042" style chapter numeral: zero-padded integer part, decimals kept. */
export function chNum(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "";
  const [i, d] = String(n).split(".");
  return `${(i ?? "0").padStart(3, "0")}${d ? `.${d}` : ""}`;
}

/** chNum for an exact number string: keeps "1.10" instead of float-formatting it. */
export function chNumText(s: string): string {
  const [i, d] = s.split(".");
  return `${(i ?? "0").padStart(3, "0")}${d ? `.${d}` : ""}`;
}

/** Condensed chapter label, e.g. <ChapterNo n={42} /> renders "CH 042". */
export function ChapterNo({ n, label, prefix = "Ch", className = "" }: { n?: number; label?: string; prefix?: string; className?: string }) {
  if (n === undefined && !label) return null;
  // exact number strings ("1.10") are shown as-is; kind badges ("Pro", "SP") replace the prefix
  const numeric = label === undefined || /^\d+(?:\.\d+)?$/.test(label);
  const text = label === undefined ? chNum(n) : numeric ? chNumText(label) : label;
  return (
    <span className={`ch-no ${className}`}>
      {/* aria-label isn't allowed on a plain span (axe aria-prohibited-attr): spoken text lives in sr-only */}
      <span className="sr-only">{numeric ? `Chapter ${label ?? n}` : label}</span>
      {numeric && <small aria-hidden="true">{prefix}</small>}
      <span aria-hidden="true">{text}</span>
    </span>
  );
}

/** Rotated sticker label (e.g. "Done", "Hot", "New"). Tones map to brand accents. */
export function Sticker({ tone = "accent", children, className = "" }: { tone?: "accent" | "lime" | "lavender" | "ink"; children: ReactNode; className?: string }) {
  return <span className={`sticker sticker-${tone} ${className}`}>{children}</span>;
}

/** Numbered kicker shown above editorial headings ("01 · Featured"). */
export function Kicker({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <span className="kicker">
      {n && <b>{n}</b>}
      {children}
    </span>
  );
}

const facts = (t: Title) => [kindLabel(t.meta?.kind), statusLabel(t.meta?.status), t.meta?.year].filter(Boolean).join(" · ");

/** Landscape card: cover + title + two-line synopsis. Used by themed rails. */
export const WideCard = memo(function WideCard({ title: t, reason }: { title: Title; reason?: string }) {
  return (
    <Link to={titlePath(t)} className="wide-card" onMouseEnter={() => prefetchTitle(t)} onFocus={() => prefetchTitle(t)}>
      <Cover mature={isMature(t)} src={t.cover} large={t.coverLarge} title={t.title} sizes="88px" />
      <span className="wide-body">
        <span className="card-title">{t.title}</span>
        <span className="wide-facts">{facts(t)}</span>
        {reason ? <span className="card-reason">{reason}</span> : t.meta?.description ? <span className="wide-desc">{plainText(t.meta.description)}</span> : null}
      </span>
    </Link>
  );
});

/** Large lead story for a "spread" section: one feature plus a strip of covers. */
export function LeadCard({ title: t, label }: { title: Title; label?: string }) {
  const genres = (t.meta?.genres ?? []).slice(0, 3);
  return (
    <Link to={titlePath(t)} className="lead-card panel" onMouseEnter={() => prefetchTitle(t)} onFocus={() => prefetchTitle(t)}>
      <Cover mature={isMature(t)} src={t.cover} large={t.coverLarge} title={t.title} sizes="(min-width: 768px) 170px, 120px" />
      <span className="lead-body">
        {label && <span className="lead-label">{label}</span>}
        <span className="lead-title">{t.title}</span>
        <span className="wide-facts">
          {facts(t)}
          {t.rating ? (
            <>
              {" · "}
              <Star size={11} style={{ verticalAlign: -1 }} aria-label="Rating" /> {t.rating.toFixed(1)}
            </>
          ) : null}
          {t.follows ? ` · ${compactNumber(t.follows)} followers` : ""}
        </span>
        {t.meta?.description && <span className="lead-desc">{plainText(t.meta.description)}</span>}
        {genres.length > 0 && (
          <span className="lead-tags">
            {genres.map((g) => (
              <span key={g} className="tag">
                {g}
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
