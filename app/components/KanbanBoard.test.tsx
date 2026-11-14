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

    await user.click(screen.getByRole("button", { name: /解除/ }));

    expect(screen.getByText("仕事のタスク")).toBeInTheDocument();
    expect(screen.getByText("趣味のタスク")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("filters cards by a title search, ignoring spaces and case", async () => {
    const tasks = [
      makeTask("a", "Weekly Report", "仕事"),
      makeTask("b", "買い物に行く", "家事"),
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
    await waitFor(() => expect(screen.getByText("Weekly Report")).toBeInTheDocument());

    await user.type(screen.getByRole("searchbox", { name: "タスクを検索" }), "weekly  report");

    expect(screen.getByText("Weekly Report")).toBeInTheDocument();
    expect(screen.queryByText("買い物に行く")).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("shows a busy skeleton while the tasks are loading", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    const { container } = render(<KanbanBoard isGuest={false} userName="テストユーザー" userImage={null} />);

    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("shows the error message in an alert when loading the tasks fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "サーバーに接続できません" }),
      })
    );

    render(<KanbanBoard isGuest={false} userName="テストユーザー" userImage={null} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("サーバーに接続できません");

    vi.unstubAllGlobals();
  });
});
