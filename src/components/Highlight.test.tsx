// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Highlight } from "./TitleCard";

const marks = (text: string, query?: string) => {
  const { container } = render(<span><Highlight text={text} query={query} /></span>);
  return { html: container.textContent, marked: [...container.querySelectorAll("mark")].map((m) => m.textContent) };
};

describe("Highlight", () => {
  it("marks every query word, case-insensitively, without changing the text", () => {
    const r = marks("Solo Leveling: Ragnarok", "solo RAG");
    expect(r.html).toBe("Solo Leveling: Ragnarok");
    expect(r.marked).toEqual(["Solo", "Rag"]);
  });
  it("ignores one-letter words and regex characters", () => {
    expect(marks("A (Tale) of Two", "a (tale").marked).toEqual(["(Tale"]);
    expect(marks("Plain", "").marked).toEqual([]);
  });
});
