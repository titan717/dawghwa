import { describe, expect, it } from "vitest";
import { barStep, clamp, HIDE_AFTER, SHOW_AFTER, SHOW_NEAR_TOP } from "./readerGestures";

describe("reader bar auto-hide", () => {
  const deep = SHOW_NEAR_TOP + 500;
  it("always shows near the top of the chapter", () => {
    expect(barStep(100, 40, 10)).toEqual({ acc: 0, hidden: false });
  });
  it("hides only after a sustained downward scroll", () => {
    let r = barStep(0, HIDE_AFTER - 4, deep);
    expect(r.hidden).toBeUndefined();
    r = barStep(r.acc, 8, deep);
    expect(r.hidden).toBe(true);
  });
  it("comes back on a small upward scroll, resetting the downward run", () => {
    const r = barStep(200, -(SHOW_AFTER + 1), deep);
    expect(r.hidden).toBe(false);
    expect(r.acc).toBeLessThan(0);
  });
  it("ignores tiny jitter", () => {
    expect(barStep(0, -2, deep).hidden).toBeUndefined();
    expect(barStep(0, 0, deep)).toEqual({ acc: 0 });
  });
  it("clamps", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(0.5, 1, 3)).toBe(1);
  });
});
