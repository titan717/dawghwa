import { reducedMotion } from "./settings";

/**
 * Small motion helpers shared by the carousels and shelves. Everything here is
 * skipped (instant) under reduced motion, so callers never branch on it.
 */

/** Read a duration token (e.g. `--dur-slide`) in ms; falls back when tokens are missing (tests). */
export function durationToken(name: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : n;
}

/** Same curve as `--ease-out` (cubic-bezier(0.2, 0.8, 0.2, 1)), close enough for scroll animation. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.2);

const running = new WeakMap<HTMLElement, number>();

/**
 * Animate an element's horizontal scroll to `left` with the app's ease-out
 * curve instead of the browser's variable smooth-scroll. Scroll snapping is
 * paused during the animation so it can't fight the tween, then restored.
 * A new call (or a user wheel/touch) cancels the previous one.
 */
export function animateScrollLeft(el: HTMLElement, left: number, ms = durationToken("--dur-slide", 420)): Promise<void> {
  const max = el.scrollWidth - el.clientWidth;
  const to = Math.max(0, Math.min(max, left));
  const from = el.scrollLeft;
  cancelAnimationFrame(running.get(el) ?? 0);
  if (reducedMotion() || ms <= 0 || Math.abs(to - from) < 1) {
    el.scrollLeft = to;
    return Promise.resolve();
  }
  el.dataset.tweening = "";
  return new Promise((resolve) => {
    const t0 = performance.now();
    const stop = () => {
      cancelAnimationFrame(running.get(el) ?? 0);
      running.delete(el);
      delete el.dataset.tweening;
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      resolve();
    };
    el.addEventListener("wheel", stop, { passive: true, once: true });
    el.addEventListener("touchstart", stop, { passive: true, once: true });
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      el.scrollLeft = from + (to - from) * easeOut(p);
      if (p < 1) running.set(el, requestAnimationFrame(step));
      else stop();
    };
    running.set(el, requestAnimationFrame(step));
  });
}

/**
 * Where a horizontal shelf should land after an arrow press: about one
 * viewport further, aligned so a card's leading edge sits on the track's
 * scroll-padding (snap-to-card), never mid-card.
 */
export function shelfTarget(el: HTMLElement, dir: 1 | -1): number {
  const kids = [...el.children] as HTMLElement[];
  if (!kids.length) return el.scrollLeft;
  const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
  const base = kids[0]!.offsetLeft - pad;
  const starts = kids.map((k) => k.offsetLeft - pad - base);
  const view = el.clientWidth - pad * 2;
  const now = el.scrollLeft;
  if (dir > 0) {
    // the first card that is not fully visible becomes the new leading card
    const next = starts.find((s, i) => s + kids[i]!.offsetWidth > now + view + 1);
    return next ?? el.scrollWidth;
  }
  // going back one viewport: the first card that fits entirely becomes the leading card
  const goal = now - view;
  if (goal <= 0) return 0;
  return starts.find((s) => s >= goal - 1) ?? 0;
}
