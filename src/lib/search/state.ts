/**
 * Which designed state the search results area is in (Spec O). Pure, so every
 * branch is unit tested; the screen renders exactly one of these.
 */
export type SearchView = "idle" | "loading" | "results" | "partial" | "empty" | "error" | "offline";

export interface SearchViewInput {
  /** A query or a filter is active (or typing is pending). */
  showResults: boolean;
  /** Typed but not debounced yet, or the request has no data yet. */
  loading: boolean;
  /** The request failed. */
  isError: boolean;
  /** The failure was the device being offline (or the network unreachable). */
  offline: boolean;
  /** Results that can be shown. */
  count: number;
  /** Some of the results could not load (a later page or part of the request failed). */
  partial: boolean;
}

export function searchView(i: SearchViewInput): SearchView {
  if (!i.showResults) return "idle";
  if (i.isError && !i.count) return i.offline ? "offline" : "error";
  if (i.loading && !i.count) return "loading";
  if (!i.count) return "empty";
  return i.isError || i.partial ? "partial" : "results";
}

/** Text for the pre-mounted polite status line, so screen readers hear the outcome. Empty while idle or loading. */
export function statusLine(v: SearchView, count: number, more = false): string {
  switch (v) {
    case "results":
    case "partial":
      return `${count}${more ? "+" : ""} ${count === 1 ? "result" : "results"}${v === "partial" ? ". Some results couldn't load." : ""}`;
    case "empty":
      return "No matches";
    case "error":
      return "Something went wrong";
    case "offline":
      return "You're offline";
    default:
      return "";
  }
}
