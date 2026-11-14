import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskCard from "./TaskCard";

const task = {
  id: "t1",
  title: "資料を読む",
  status: "IN_PROGRESS" as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  category: "仕事",
};

function setup(overrides: Partial<React.ComponentProps<typeof TaskCard>> = {}) {
  const props = {
    task,
    deleteTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    updateTaskCategory: vi.fn(),
    editTaskTitle: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    ...overrides,
  };
  render(<TaskCard {...props} />);
  return props;
}

describe("TaskCard actions", () => {
  it("shows no action links on the card, only the menu button", () => {
    setup();
    expect(screen.getByRole("button", { name: "操作" })).toBeInTheDocument();
    for (const label of ["完了にする", "編集", "削除", "上へ", "下へ", "保留へ"]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
  });

  it("puts the most natural next step first in the menu, then the other lanes, edit, reorder and delete", async () => {
    const user = userEvent.setup();
    setup(); // 進行中のカード: 先頭は「完了にする」
    await user.click(screen.getByRole("button", { name: "操作" }));
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "完了にする",
      "未着手へ",
      "保留へ",
      "編集",
      "上へ",
      "下へ",
      "削除",
    ]);
  });

  it("leads with a different step depending on the lane", async () => {
    const user = userEvent.setup();
    setup({ task: { ...task, status: "TODO" as const } });
    await user.click(screen.getByRole("button", { name: "操作" }));
    expect(screen.getAllByRole("menuitem")[0]).toHaveTextContent("進行中へ");
  });

  it("completes a card straight from in-progress, skipping the pending lane", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: "操作" }));
    await user.click(screen.getByRole("menuitem", { name: "完了にする" }));
    expect(props.updateTaskStatus).toHaveBeenCalledWith("t1", "DONE");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("has no preferred step on a done card, and lists every other lane", async () => {
    const user = userEvent.setup();
    setup({ task: { ...task, status: "DONE" as const } });
    await user.click(screen.getByRole("button", { name: "操作" }));
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "未着手へ",
      "進行中へ",
      "保留へ",
      "編集",
      "上へ",
      "下へ",
      "削除",
    ]);
  });

  it("omits up or down when the card cannot move that way", async () => {
    const user = userEvent.setup();
    setup({ onMoveUp: undefined });
    await user.click(screen.getByRole("button", { name: "操作" }));
    const labels = screen.getAllByRole("menuitem").map((i) => i.textContent);
    expect(labels).not.toContain("上へ");
    expect(labels).toContain("下へ");
  });

  it("runs the chosen item: another lane, then delete", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: "操作" }));
    await user.click(screen.getByRole("menuitem", { name: "保留へ" }));
    expect(props.updateTaskStatus).toHaveBeenCalledWith("t1", "PENDING");

    await user.click(screen.getByRole("button", { name: "操作" }));
    await user.click(screen.getByRole("menuitem", { name: "削除" }));
    expect(props.deleteTask).toHaveBeenCalledWith("t1");
  });

  it("opens the title editor from the menu", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "操作" }));
    await user.click(screen.getByRole("menuitem", { name: "編集" }));
    expect(screen.getByPlaceholderText("タイトル")).toHaveValue("資料を読む");
  });

  it("closes the menu with Escape", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "操作" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
