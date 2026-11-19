/**
 * "updated 2h ago" for chapter rows (D51). Providers send ISO timestamps or,
 * for some scraped sources, an already-relative string ("7y ago"), which is kept.
 */
export function relativeTime(value: string | number | undefined | null, now = Date.now()): { label: string; iso?: string; full?: string } | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const at = typeof value === "number" ? (value < 1e12 ? value * 1000 : value) : Date.parse(value);
  if (!Number.isFinite(at)) return typeof value === "string" ? { label: value.trim() } : undefined;
  const s = Math.round((now - at) / 1000);
  const d = new Date(at);
  const full = d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const iso = d.toISOString();
  if (s < 0) return { label: d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }), iso, full };
  const out = (label: string) => ({ label, iso, full });
  if (s < 60) return out("just now");
  if (s < 3600) return out(`${Math.floor(s / 60)}m ago`);
  if (s < 86400) return out(`${Math.floor(s / 3600)}h ago`);
  if (s < 7 * 86400) return out(`${Math.floor(s / 86400)}d ago`);
  if (s < 8 * 7 * 86400) return out(`${Math.floor(s / (7 * 86400))}w ago`);
  if (s < 365 * 86400) return out(`${Math.floor(s / (30 * 86400))}mo ago`);
  return out(`${Math.floor(s / (365 * 86400))}y ago`);
}
