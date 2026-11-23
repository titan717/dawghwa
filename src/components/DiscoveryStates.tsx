import "@/styles/discovery.css";
import { RefreshCw, WifiOff } from "lucide-react";
import { Mascot } from "./Mascot";
import { errorText } from "./States";

/**
 * Generic result-list failure for search and discovery. Never shows the underlying
 * error text (it can describe the backend); only offline vs. "something went wrong".
 */
export function ResultsError({ error, retry, compact, offline: forceOffline, offlineBody }: { error: unknown; retry?: () => void; compact?: boolean; offline?: boolean; offlineBody?: string }) {
  const offline = forceOffline ?? errorText(error).offline;
  const title = offline ? "You're offline" : "Something went wrong";
  const body = offline ? (offlineBody ?? "Reconnect to search. Your library and history are still here.") : "Check your connection and try again.";
  if (compact)
    return (
      <div className="inline-state" role="alert">
        {offline && <WifiOff size={18} aria-hidden="true" />}
        <span style={{ flex: 1 }}>
          <strong style={{ color: "var(--ink-2)" }}>{title}.</strong> {body}
        </span>
        {retry && (
          <button className="btn btn-sm" onClick={retry}>
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    );
  return (
    <div className="state state-center" role="alert">
      <Mascot pose={offline ? "offline" : "error"} />
      <h2>{title}</h2>
      <p>{body}</p>
      {retry && (
        <button className="btn" onClick={retry}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

/** Some results are shown but part of the request failed: a quiet note, never naming what failed. */
export function PartialNote({ retry }: { retry: () => void }) {
  return (
    <p className="partial-note" role="status">
      <span>Some results couldn't load.</span>
      <button className="btn btn-ghost btn-sm" onClick={retry}>
        <RefreshCw size={14} aria-hidden="true" /> Try again
      </button>
    </p>
  );
}
