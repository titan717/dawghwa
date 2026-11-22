// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TasteSignalView } from "./TasteSignal";

describe("TasteSignalView", () => {
  it("shows a label, the count and the reason, never a percentage", () => {
    const { container } = render(<TasteSignalView evidence={{ c: 0.75, m: 1, nEff: 7, interacted: 9, label: "strong" }} because="Solo Leveling" />);
    const text = container.textContent ?? "";
    expect(text).toContain("Taste signal: strong");
    expect(text).toContain("7 useful interactions");
    expect(text).toContain("Because you read Solo Leveling.");
    expect(text).toContain("Based on 7 of your reads and ratings on this device");
    expect(text).not.toMatch(/%|confidence|accura/i);
    expect(container.querySelector("p")?.getAttribute("title")).toMatch(/not a measure of accuracy/);
  });

  it("omits the reason when there is none", () => {
    const { container } = render(<TasteSignalView evidence={{ c: 0, m: 0, nEff: 0, interacted: 0, label: "early" }} />);
    expect(container.textContent).toContain("Taste signal: early");
    expect(container.textContent).not.toContain("Because");
  });
});
