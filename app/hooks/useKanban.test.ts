import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useKanban } from "./useKanban";
import { IN_PROGRESS_WIP_LIMIT } from "@/lib/constants";

function makeTask(id: string, status: string) {
  return {
    id,
    title: `task-${id}`,
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

beforeEach(() => {
  localStorage.clear();
  window.matchMedia =
    window.matchMedia ??
    ((): MediaQueryList =>
      ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }) as unknown as MediaQueryList);
});

describe("useKanban WIP limit", () => {
  it("blocks moving a task into IN_PROGRESS once the limit is reached, without patching the server", async () => {
    const inProgressTasks = Array.from({ length: IN_PROGRESS_WIP_LIMIT }, (_, i) =>
      makeTask(`ip-${i}`, "IN_PROGRESS")
    );
    const todoTask = makeTask("todo-1", "TODO");
    const allTasks = [...inProgressTasks, todoTask];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tasks: allTasks, nextCursor: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useKanban());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.wipWarning).toBeNull();

    act(() => {
      result.current.updateTaskStatus("todo-1", "IN_PROGRESS");
    });

    await waitFor(() => expect(result.current.wipWarning).not.toBeNull());

    const patchCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);

    vi.unstubAllGlobals();
  });

  it("allows moving a task into IN_PROGRESS when under the limit", async () => {
    const todoTask = makeTask("todo-1", "TODO");
    const allTasks = [todoTask];

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            task: { ...todoTask, status: "IN_PROGRESS" },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ tasks: allTasks, nextCursor: null }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useKanban());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateTaskStatus("todo-1", "IN_PROGRESS");
    });

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(
        true
      )
    );
    expect(result.current.wipWarning).toBeNull();

    vi.unstubAllGlobals();
  });
});
