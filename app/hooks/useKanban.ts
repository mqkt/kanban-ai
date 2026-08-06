"use client";

import { useCallback, useEffect, useState } from "react";
import { Task, TaskStatus } from "../types/kanban";

type TaskPatch = Partial<
  Pick<Task, "title" | "status" | "category" | "priority">
>;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data as T;
}

export function useKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverLane, setDraggedOverLane] = useState<TaskStatus | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // GET /api/tasks はcursorページネーション化されているため、
      // 現状の「3レーン全件表示」UXを保つために全ページを結合して取得する。
      const allTasks: Task[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      while (hasMore) {
        const params: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
        const page: { tasks: Task[]; nextCursor: string | null } = await requestJson(
          `/api/tasks${params}`
        );
        allTasks.push(...page.tasks);
        cursor = page.nextCursor;
        hasMore = cursor !== null;
      }
      setTasks(allTasks);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "タスクの読み込みに失敗しました";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
    } else {
      setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }

    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!isMounted) return;

    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode, isMounted]);

  const patchTask = async (id: string, patch: TaskPatch) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...patch } : task))
    );

    try {
      const data = await requestJson<{ task: Task }>("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id, ...patch }),
      });
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, ...data.task } : task))
      );
    } catch (error) {
      console.error("Task update failed:", error);
      await loadTasks();
    }
  };

  const addTask = async (title: string) => {
    const trimmedTitle = title.trim();

    let data: { task: Task };
    try {
      data = await requestJson<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: trimmedTitle, status: "TODO" }),
      });
    } catch (error) {
      console.error("Task creation failed:", error);
      setLoadError(
        error instanceof Error ? error.message : "タスクの追加に失敗しました"
      );
      // 入力値をTaskForm側に残したまま再送信できるよう、呼び出し元へエラーを伝播する。
      throw error;
    }

    const taskId = data.task.id;
    setTasks((prev) => [{ ...data.task, isClassifying: true }, ...prev]);

    try {
      const classifyData = await requestJson<{
        category?: string;
        priority?: Task["priority"];
      }>("/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: trimmedTitle }),
      });

      await patchTask(taskId, {
        category: classifyData.category,
        priority: classifyData.priority,
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, isClassifying: false } : task
        )
      );
    } catch (error) {
      console.error("Task classification failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "AI分類に失敗しました";
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, isClassifying: false, error: errorMessage }
            : task
        )
      );
    }
  };

  const deleteTask = async (id: string) => {
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((task) => task.id !== id));

    try {
      await requestJson<{ ok: boolean }>("/api/tasks", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("Task deletion failed:", error);
      setTasks(previousTasks);
    }
  };

  const updateTaskStatus = (id: string, newStatus: TaskStatus) => {
    void patchTask(id, { status: newStatus });
  };

  const editTaskTitle = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      void deleteTask(id);
      return;
    }
    void patchTask(id, { title: trimmed });
  };

  // トリアージ機能（重複タスクの検出）が提案したグループを実際に統合する。
  // 新しいAPIは作らず、既存の PATCH（タイトル変更）と DELETE（残りを削除）を組み合わせるだけに
  // している。誤マージ時の影響範囲を小さくするため、常に「1件を残して残りを消す」形に統一。
  const mergeTasks = async (keepId: string, mergeIds: string[], newTitle: string) => {
    try {
      await requestJson<{ task: Task }>("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: keepId, title: newTitle }),
      });
      await Promise.all(
        mergeIds.map((id) =>
          requestJson<{ ok: boolean }>("/api/tasks", {
            method: "DELETE",
            body: JSON.stringify({ id }),
          })
        )
      );
    } catch (error) {
      console.error("Task merge failed:", error);
      setLoadError(
        error instanceof Error ? error.message : "タスクの統合に失敗しました"
      );
    } finally {
      await loadTasks();
    }
  };

  const clearCompletedTasks = async () => {
    if (!window.confirm("完了したすべてのタスクを削除しますか？")) return;

    const previousTasks = tasks;
    setTasks((prev) => prev.filter((task) => task.status !== "DONE"));

    try {
      await requestJson<{ ok: boolean }>("/api/tasks", {
        method: "DELETE",
        body: JSON.stringify({ completed: true }),
      });
    } catch (error) {
      console.error("Completed task cleanup failed:", error);
      setTasks(previousTasks);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData("text/plain", id);

    setTimeout(() => {
      const element = document.getElementById(`card-${id}`);
      if (element) element.style.opacity = "0.4";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(null);
    setDraggedOverLane(null);
    const element = document.getElementById(`card-${id}`);
    if (element) element.style.opacity = "1";
  };

  const handleDragOverLane = (e: React.DragEvent, laneId: TaskStatus) => {
    e.preventDefault();
    if (draggedOverLane !== laneId) {
      setDraggedOverLane(laneId);
    }
  };

  const handleDragLeaveLane = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDraggedOverLane(null);
    }
  };

  const handleDropLane = (e: React.DragEvent, laneId: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) {
      updateTaskStatus(taskId, laneId);
    }
    setDraggedTaskId(null);
    setDraggedOverLane(null);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return {
    tasks,
    isDarkMode,
    isMounted,
    isLoading,
    loadError,
    draggedOverLane,
    addTask,
    deleteTask,
    updateTaskStatus,
    editTaskTitle,
    mergeTasks,
    clearCompletedTasks,
    toggleDarkMode,
    dragHandlers: {
      handleDragStart,
      handleDragEnd,
      handleDragOverLane,
      handleDragLeaveLane,
      handleDropLane,
    },
  };
}
