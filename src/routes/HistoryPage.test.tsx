// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HistoryPage from "./HistoryPage";
import { initUser } from "@/lib/store/user";

describe("HistoryPage", () => {
  it("shows a skeleton, not the empty state, until the user store is ready", async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Loading")).toBeTruthy();
    expect(screen.queryByText("No reading history yet")).toBeNull();
    await act(() => initUser());
    expect(await screen.findByText("No reading history yet")).toBeTruthy();
    expect(screen.queryByLabelText("Loading")).toBeNull();
  });
});
