import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KanbanBoard from "./KanbanBoard";

beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((): MediaQueryList =>
      ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }) as unknown as MediaQueryList);
});

function makeTask(id: string, title: string, category: string) {
  return {
    id,
    title,
    status: "TODO",
    category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe("KanbanBoard category filter", () => {
  it("narrows the board to the selected category, and clears back to showing everything", async () => {
    const tasks = [
      makeTask("a", "仕事のタスク", "仕事"),
      makeTask("b", "趣味のタスク", "趣味"),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tasks, nextCursor: null }),
      })
    );

    const user = userEvent.setup();
    render(<KanbanBoard isGuest={false} userName="テストユーザー" userImage={null} />);

    await waitFor(() =>
      expect(screen.getByText("仕事のタスク")).toBeInTheDocument()
    );
    expect(screen.getByText("趣味のタスク")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "仕事" }));

    expect(screen.getByText("仕事のタスク")).toBeInTheDocument();
    expect(screen.queryByText("趣味のタスク")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /クリア/ }));

    expect(screen.getByText("仕事のタスク")).toBeInTheDocument();
    expect(screen.getByText("趣味のタスク")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
