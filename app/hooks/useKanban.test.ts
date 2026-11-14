import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useKanban } from "./useKanban";

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

describe("useKanban", () => {
  it("follows nextCursor across multiple pages and combines the results", async () => {
    const pageOneTasks = [makeTask("a", "TODO")];
    const pageTwoTasks = [makeTask("b", "TODO")];

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const isFirstPage = !url.includes("cursor=");
      return Promise.resolve({
        ok: true,
        json: async () =>
          isFirstPage
            ? { tasks: pageOneTasks, nextCursor: "some-cursor" }
            : { tasks: pageTwoTasks, nextCursor: null },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useKanban());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tasks.map((t) => t.id)).toEqual(["a", "b"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it("sends a PATCH with the new status when moving a task", async () => {
    const todoTask = makeTask("todo-1", "TODO");

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ task: { ...todoTask, status: "IN_PROGRESS" } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ tasks: [todoTask], nextCursor: null }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateTaskStatus("todo-1", "IN_PROGRESS");
    });

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
        id: "todo-1",
        status: "IN_PROGRESS",
      });
    });

    vi.unstubAllGlobals();
  });

  it("sends category:null (not omitted) when clearing a task's category", async () => {
    const todoTask = makeTask("todo-1", "TODO");

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ task: { ...todoTask, category: undefined } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ tasks: [{ ...todoTask, category: "仕事" }], nextCursor: null }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateTaskCategory("todo-1", null);
    });

    // 楽観的更新: サーバー応答を待たずにローカル表示から即座にカテゴリが消える
    await waitFor(() =>
      expect(result.current.tasks.find((t) => t.id === "todo-1")?.category).toBeUndefined()
    );

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      // "category" キー自体が省略されるとサーバー側で「変更なし」と解釈されてしまうため、
      // 明示的に null を送ってクリアの意図を伝える必要がある。
      expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
        id: "todo-1",
        category: null,
      });
    });

    vi.unstubAllGlobals();
  });

  describe("undoable delete", () => {
    const setup = async () => {
      const task = makeTask("del-1", "TODO");
      const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ tasks: [task], nextCursor: null }) });
      });
      vi.stubGlobal("fetch", fetchMock);
      const hook = renderHook(() => useKanban());
      await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
      return { hook, fetchMock };
    };
    const deleteCalls = (fetchMock: ReturnType<typeof vi.fn>) =>
      fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "DELETE");

    it("hides the task at once but sends no DELETE until the grace period ends", async () => {
      const { hook, fetchMock } = await setup();
      vi.useFakeTimers();

      act(() => hook.result.current.deleteTask("del-1"));

      expect(hook.result.current.tasks).toHaveLength(0);
      expect(hook.result.current.pendingDelete?.id).toBe("del-1");
      expect(deleteCalls(fetchMock)).toHaveLength(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(deleteCalls(fetchMock)).toHaveLength(1);
      expect(hook.result.current.pendingDelete).toBeNull();

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it("restores the task and never sends DELETE when undone in time", async () => {
      const { hook, fetchMock } = await setup();
      vi.useFakeTimers();

      act(() => hook.result.current.deleteTask("del-1"));
      act(() => hook.result.current.undoDelete());

      expect(hook.result.current.tasks.map((t) => t.id)).toEqual(["del-1"]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(deleteCalls(fetchMock)).toHaveLength(0);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });
});
