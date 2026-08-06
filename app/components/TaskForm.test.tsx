import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskForm from "./TaskForm";

describe("TaskForm", () => {
  it("shows a validation error and does not call onSubmit for an empty title", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "タスクを追加" }));

    expect(await screen.findByText("タイトルは必須です")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the trimmed title and resets the input on success", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskForm onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    await user.type(input, "  資料作成  ");
    await user.click(screen.getByRole("button", { name: "タスクを追加" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("資料作成"));
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("keeps the input value when onSubmit rejects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("failed"));
    render(<TaskForm onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText("新しいタスクを入力...");
    await user.type(input, "資料作成");
    await user.click(screen.getByRole("button", { name: "タスクを追加" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(input).toHaveValue("資料作成");
  });
});
