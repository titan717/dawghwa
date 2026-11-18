import type { ReactNode } from "react";

/** "CH.042" style chapter numeral: zero-padded integer part, decimals kept. */
export function chNum(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "";
  const [i, d] = String(n).split(".");
  return `${(i ?? "0").padStart(3, "0")}${d ? `.${d}` : ""}`;
}

/** Condensed chapter label, e.g. <ChapterNo n={42} /> renders "CH 042". */
export function ChapterNo({ n, prefix = "Ch", className = "" }: { n?: number; prefix?: string; className?: string }) {
  if (n === undefined) return null;
  return (
    <span className={`ch-no ${className}`} aria-label={`Chapter ${n}`}>
      <small aria-hidden="true">{prefix}</small>
      <span aria-hidden="true">{chNum(n)}</span>
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
