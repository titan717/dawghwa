import type { ReactNode } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { isApiError } from "@/lib/api/errors";
import { Mascot, type Pose } from "./Mascot";

/**
 * Skeletons reuse the real card classes (.card-cover, .card-title, .card-meta), so the
 * placeholder has the same box sizes as the card that replaces it: no shift on load.
 */
export function CardSkeleton() {
  return (
    <div className="card card-skeleton" aria-hidden="true">
      <span className="card-cover">
        <span className="cover skeleton" />
      </span>
      <span className="card-title skel-lines">
        <i className="skeleton" style={{ width: "88%" }} />
        <i className="skeleton" style={{ width: "56%" }} />
      </span>
      <span className="card-meta">
        <span className="skeleton skel-text" style={{ width: "48%" }}>
          &nbsp;
        </span>
      </span>
    </div>
  );
}

/** Ranked-row placeholder: same three-column grid (rank, cover, text) as `.ranked-item`. */
function RankedSkeleton() {
  return (
    <div className="card card-skeleton" aria-hidden="true">
      <span className="ranked-item">
        <span className="ranked-num skel-rank" />
        <span className="cover skeleton" />
        <span>
          <span className="card-title skel-lines">
            <i className="skeleton" style={{ width: "90%" }} />
            <i className="skeleton" style={{ width: "60%" }} />
          </span>
          <span className="card-meta" style={{ marginTop: 4 }}>
            <span className="skeleton skel-text" style={{ width: "40%" }}>
              &nbsp;
            </span>
          </span>
        </span>
      </span>
    </div>
  );
}

export function RowSkeleton({ count = 8, layout = "row" }: { count?: number; layout?: "row" | "ranked" | "wide" | "spread" }) {
  if (layout === "ranked")
    return (
      <div className="row-ranked">
        <div className="row-track" aria-hidden="true">
          {Array.from({ length: Math.max(count, 9) }, (_, i) => (
            <RankedSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  if (layout === "wide")
    return (
      <div className="row-wide">
        <div className="row-track" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className="wide-card card-skeleton">
              <span className="cover skeleton" />
              <span className="wide-body">
                <span className="card-title skel-lines">
                  <i className="skeleton" style={{ width: "80%" }} />
                  <i className="skeleton" style={{ width: "45%" }} />
                </span>
                <span className="skeleton skel-block" />
              </span>
            </span>
          ))}
        </div>
      </div>
    );
  if (layout === "spread")
    return (
      <div className="spread-grid" aria-hidden="true">
        <span className="lead-card panel card-skeleton">
          <span className="cover skeleton" />
          <span className="lead-body">
            <span className="skeleton skel-block" style={{ height: 44 }} />
            <span className="skeleton skel-block" />
          </span>
        </span>
        <div className="spread-rest">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  return (
    <div className="row-track" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 12, density }: { count?: number; density?: "compact" | "covers" }) {
  return (
    <div className="grid" data-density={density} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Placeholder for profile-shaped pages while the local store opens (no flash of empty states). */
export function ProfileSkeleton() {
  return (
    <div className="page page-narrow" aria-busy="true" aria-label="Loading">
      <div className="skeleton-head">
        <div className="skeleton skeleton-avatar" />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-line" style={{ width: "40%" }} />
          <div className="skeleton skeleton-line" style={{ width: "70%" }} />
        </div>
      </div>
      <div className="skeleton skeleton-block" />
      <div className="skeleton skeleton-block" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton-thumb" />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-line" style={{ width: "60%" }} />
            <div className="skeleton skeleton-line" style={{ width: "35%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action, pose = "empty", center }: { title: string; children?: ReactNode; action?: ReactNode; pose?: Pose; center?: boolean }) {
  return (
    <div className={`state ${center ? "state-center" : ""}`}>
      <Mascot pose={pose} />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function errorText(e: unknown): { title: string; body: string; offline: boolean } {
  if (isApiError(e)) {
    if (e.kind === "offline") return { title: "You're offline", body: "Reconnect to load this. Your library and history are still here.", offline: true };
    if (e.unsupported) return { title: "Not available from this source", body: e.userMessage, offline: false };
    return { title: "Couldn't load this", body: e.userMessage, offline: false };
  }
  return { title: "Something went wrong", body: e instanceof Error ? e.message : "Please try again.", offline: false };
}

export function ErrorState({ error, retry, center, compact }: { error: unknown; retry?: () => void; center?: boolean; compact?: boolean }) {
  const t = errorText(error);
  if (compact)
    return (
      <div className="inline-state" role="alert">
        {t.offline && <WifiOff size={18} />}
        <span style={{ flex: 1 }}>
          <strong style={{ color: "var(--ink-2)" }}>{t.title}.</strong> {t.body}
        </span>
        {retry && (
          <button className="btn btn-sm" onClick={retry}>
            <RefreshCw size={14} /> Retry
          </button>
        )}
      </div>
    );
  return (
    <div className={`state ${center ? "state-center" : ""}`} role="alert">
      <Mascot pose={t.offline ? "offline" : "error"} />
      <h2>{t.title}</h2>
      <p>{t.body}</p>
      {retry && (
        <button className="btn" onClick={retry}>
          <RefreshCw size={16} /> Try again
        </button>
      )}
    </div>
  );
}
