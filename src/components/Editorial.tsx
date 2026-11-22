import type { ReactNode } from "react";

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
