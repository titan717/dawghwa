/** Normalised error for every API failure (HTTP, network, timeout, parse, offline). */
export type ApiErrorKind = "http" | "network" | "timeout" | "aborted" | "offline" | "parse";

const RETRYABLE_CODES = new Set([
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_NETWORK_ERROR",
  "UPSTREAM_RATE_LIMITED",
  "SOURCE_CIRCUIT_OPEN",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

const NON_RETRYABLE_CODES = new Set(["UPSTREAM_BLOCKED", "SOURCE_UNAVAILABLE", "UNSUPPORTED_CAPABILITY", "NOT_FOUND", "UPSTREAM_ERROR"]);

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;
  readonly retryAfterMs?: number;

  constructor(init: {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    code?: string;
    requestId?: string;
    details?: Record<string, unknown>;
    retryAfterMs?: number;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status ?? 0;
    this.code = init.code ?? init.kind.toUpperCase();
    this.requestId = init.requestId;
    this.details = init.details;
    this.retryAfterMs = init.retryAfterMs;
  }

  /** Worth retrying automatically (transient). Client errors and capability gaps are not. */
  get retryable(): boolean {
    if (this.kind === "aborted" || this.kind === "parse") return false;
    if (this.kind === "network" || this.kind === "timeout" || this.kind === "offline") return true;
    if (RETRYABLE_CODES.has(this.code)) return true;
    if (NON_RETRYABLE_CODES.has(this.code)) return false;
    return this.status >= 500 && this.status !== 501;
  }

  /** The backend cannot do this at all (not a temporary failure). */
  get unsupported(): boolean {
    return this.code === "UNSUPPORTED_CAPABILITY" || this.status === 501;
  }

  /** Short, human message suitable for UI. */
  get userMessage(): string {
    switch (this.kind) {
      case "offline":
        return "You're offline. Reconnect to load this.";
      case "timeout":
        return "This is taking too long. Try again in a moment.";
      case "network":
        return "Couldn't connect. Check your connection and try again.";
      case "aborted":
        return "Request cancelled.";
      case "parse":
        return "The server sent a response Dawghwa couldn't read.";
    }
    switch (this.code) {
      case "RATE_LIMITED":
        return "Too many requests. Give it a moment.";
      case "UPSTREAM_BLOCKED":
        return "This isn't available right now. Try again later.";
      case "UPSTREAM_TIMEOUT":
        return "This is taking too long. Try again in a moment.";
      case "SOURCE_UNAVAILABLE":
        return "This isn't available right now. Try again later.";
      case "SOURCE_CIRCUIT_OPEN":
        return "This isn't available right now. Try again in a minute.";
      case "UNSUPPORTED_CAPABILITY":
        return "This isn't available here.";
      case "NOT_FOUND":
        return "We couldn't find this.";
      default:
        // Never surface raw status text ("Service Unavailable") to readers.
        if (this.status >= 500) return "The Dawghwa service isn't responding right now. Try again in a moment.";
        if (this.status === 429) return "Too many requests. Give it a moment.";
        if (this.status >= 400) return "That request didn't work. Try again, or go back.";
        return "Something went wrong.";
    }
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof DOMException && e.name === "AbortError") return new ApiError({ kind: "aborted", message: "Aborted" });
  return new ApiError({ kind: "network", message: e instanceof Error ? e.message : String(e) });
}
