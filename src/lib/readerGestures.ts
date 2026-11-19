import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { reducedMotion } from "./settings";

/**
 * Reader chrome and zoom behaviour (UI polish phase 3, D61-D64). The reader stays
 * scroll-only (D8); these only change how its bar and strip respond to the reader.
 */

/** px of continuous downward scroll before the bar slides away */
export const HIDE_AFTER = 24;
/** px of upward scroll that brings it straight back */
export const SHOW_AFTER = 6;
/** the bar always shows this close to the top of the chapter */
export const SHOW_NEAR_TOP = 96;
export const ZOOM_MAX = 3;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Pure scroll decision, exported for tests: given the running delta (`acc`, negative
 * while scrolling up) and the new step, returns the new delta and whether to hide/show.
 */
export function barStep(acc: number, dy: number, y: number): { acc: number; hidden?: boolean } {
  if (y < SHOW_NEAR_TOP) return { acc: 0, hidden: false };
  if (dy > 0) {
    const a = Math.max(0, acc) + dy;
    return a > HIDE_AFTER ? { acc: a, hidden: true } : { acc: a };
  }
  if (dy < 0) {
    const a = Math.min(0, acc) + dy;
    return a < -SHOW_AFTER ? { acc: a, hidden: false } : { acc: a };
  }
  return { acc };
}

/** WEBTOON-style top bar: hides on scroll-down, comes back at once on scroll-up. */
export function useAutoHideBar(paused: () => boolean) {
  const [hidden, setHidden] = useState(false);
  const quietUntil = useRef(0);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  });
  useEffect(() => {
    let lastY = window.scrollY;
    let acc = 0;
    const on = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      // programmatic scrolls (restore, zoom, scrubbing) are not the reader's intent
      if (performance.now() < quietUntil.current || pausedRef.current()) {
        acc = 0;
        return;
      }
      const r = barStep(acc, dy, y);
      acc = r.acc;
      if (r.hidden !== undefined) setHidden(r.hidden);
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const quiet = useCallback((ms: number) => {
    quietUntil.current = performance.now() + ms;
  }, []);
  return { hidden, setHidden, quiet };
}

function cssTime(name: string, fallback: number): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
}

/**
 * Strip zoom: the pages get wider (and so taller) inside a horizontal pan box, so the
 * window keeps scrolling vertically as usual. `zoomAt` keeps the point under the finger
 * fixed, then springs from the old size (FLIP) unless motion is reduced.
 */
export function useStripZoom(pan: RefObject<HTMLDivElement | null>, pages: RefObject<HTMLDivElement | null>, beforeAdjust: () => void) {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  const zoomAt = useCallback(
    (target: number, px: number, py: number, from?: DOMRect) => {
      const p = pages.current;
      const w = pan.current;
      if (!p || !w) return;
      const z = Math.round(clamp(target, 1, ZOOM_MAX) * 100) / 100;
      const r0 = from ?? p.getBoundingClientRect();
      if (!r0.width || !r0.height) return;
      const fx = (px - r0.left) / r0.width;
      const fy = (py - r0.top) / r0.height;
      beforeAdjust();
      p.getAnimations().forEach((a) => a.cancel());
      p.style.transform = "";
      p.style.transformOrigin = "";
      zoomRef.current = z;
      flushSync(() => setZoom(z));
      const r1 = p.getBoundingClientRect();
      w.scrollLeft += r1.left + fx * r1.width - px;
      window.scrollBy(0, r1.top + fy * r1.height - py);
      if (reducedMotion() || typeof p.animate !== "function") return;
      const r2 = p.getBoundingClientRect();
      const s = r0.width / r2.width;
      if (Math.abs(s - 1) < 0.01) return;
      const origin = `${px - r2.left}px ${py - r2.top}px`;
      const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-spring-physics").trim() || "ease-out";
      const frames = [
        { transformOrigin: origin, transform: `scale(${s})` },
        { transformOrigin: origin, transform: "none" },
      ];
      const duration = cssTime("--dur-spring", 550);
      try {
        p.animate(frames, { duration, easing });
      } catch {
        p.animate(frames, { duration, easing: "ease-out" });
      }
    },
    [pages, pan, beforeAdjust],
  );

  const reset = useCallback(() => {
    zoomRef.current = 1;
    setZoom(1);
  }, []);

  // two-finger pinch on the strip: scale with a transform while the fingers move, then
  // commit the new width at the end so the layout (and scroll math) stay simple
  useEffect(() => {
    const w = pan.current;
    if (!w) return;
    let start: { d: number; cx: number; cy: number; z: number; ox: number; oy: number } | null = null;
    let last = { s: 1, cx: 0, cy: 0 };
    const two = (e: TouchEvent) => {
      const a = e.touches[0]!;
      const b = e.touches[1]!;
      return { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1, cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2 };
    };
    const onStart = (e: TouchEvent) => {
      const p = pages.current;
      if (e.touches.length !== 2 || !p) return;
      const t = two(e);
      const r = p.getBoundingClientRect();
      start = { ...t, z: zoomRef.current, ox: t.cx - r.left, oy: t.cy - r.top };
      last = { s: 1, cx: t.cx, cy: t.cy };
      p.style.transformOrigin = `${start.ox}px ${start.oy}px`;
      e.preventDefault();
    };
    const onMove = (e: TouchEvent) => {
      const p = pages.current;
      if (!start || e.touches.length !== 2 || !p) return;
      e.preventDefault();
      const t = two(e);
      // allow a little rubber-band below 1x and above the max; the commit clamps
      const s = clamp((start.z * t.d) / start.d, 0.85, ZOOM_MAX * 1.1) / start.z;
      last = { s, cx: t.cx, cy: t.cy };
      p.style.transform = `translate(${t.cx - start.cx}px, ${t.cy - start.cy}px) scale(${s})`;
    };
    const onEnd = (e: TouchEvent) => {
      const p = pages.current;
      if (!start || e.touches.length >= 2 || !p) return;
      const z0 = start.z;
      start = null;
      const rect = p.getBoundingClientRect();
      zoomAt(z0 * last.s, last.cx, last.cy, rect);
    };
    w.addEventListener("touchstart", onStart, { passive: false });
    w.addEventListener("touchmove", onMove, { passive: false });
    w.addEventListener("touchend", onEnd);
    w.addEventListener("touchcancel", onEnd);
    return () => {
      w.removeEventListener("touchstart", onStart);
      w.removeEventListener("touchmove", onMove);
      w.removeEventListener("touchend", onEnd);
      w.removeEventListener("touchcancel", onEnd);
    };
  });

  return { zoom, zoomRef, zoomAt, reset };
}
