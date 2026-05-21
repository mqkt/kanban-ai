"use client";

import { useState, useEffect } from "react";
import { Task, TaskStatus } from "../types/kanban";

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * React開発において、「画面の見た目（UI）」と「データの動き（ロジック・状態管理）」を
 * 1つのファイルに混在させると、コードが長く複雑になり、何がどこで行われているか分からなくなります。
 * このフックは、かんばんボード全体の「頭脳（ロジック）」を切り出してカプセル化（独立）させるためのものです。
 * UIコンポーネント（page.tsxなど）は、このフックから必要なデータや操作関数を呼び出すだけでよくなり、
 * 見た目の制御に集中できます。
 *
 * ==========================================
 * 【何を担当するか】
 * ==========================================
 * 以下の「ロジック（仕組み）」すべてを一括管理します：
 * 1. タスクのデータ状態（CRUD：追加・削除・更新・取得）
 * 2. データの永続化（localStorageへの自動保存と、初回ロード時の古いTodoリストデータの自動移行）
 * 3. ドラッグ＆ドロップ操作によるステータスの更新ロジック
 * 4. アプリケーションのダークモード切り替え状態の管理
 *
 * ==========================================
 * 【Propsの意味】
 * ==========================================
 * ※ このファイルはカスタムフック（関数）なので、Propsは受け取りません。
 * 　 戻り値として、UIが必要とするすべての状態（State）と関数オブジェクトを返却します。
 *
 * ==========================================
 * 【State（内部状態）の役割】
 * ==========================================
 * - `tasks` (Task[]):
 *     ボード上に存在するすべてのタスクデータのリスト。これが更新されると画面が再描画されます。
 * - `inputValue` (string):
 *     新規タスクを入力するためのフォームテキスト。
 * - `isDarkMode` (boolean):
 *     ダークモードが有効かどうかを表す真偽値。
 * - `isMounted` (boolean):
 *     Reactがブラウザにマウント（初期表示）されたかを示すフラグ。ハイドレーション（サーバーとクライアントのHTML不整合）を防ぐために使用。
 * - `draggedTaskId` (string | null):
 *     現在ユーザーがドラッグを開始しているタスクのユニークID。
 * - `draggedOverLane` (TaskStatus | null):
 *     現在タスクがどのレーン（列）の上にドラッグされているか。レーンを点線で光らせるUIフィードバックに使用。
 */

export function useKanban() {
  // --- 状態（State）の定義 ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverLane, setDraggedOverLane] = useState<TaskStatus | null>(null);

  // --- データの初期読み込みと古いデータからの移行 ---
  useEffect(() => {
    setIsMounted(true);
    try {
      // 1. かんばんボード用の保存データがあるか確認
      const savedTasks = localStorage.getItem("kanban_tasks_data");
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      } else {
        // 2. なければ、旧Todoアプリのデータ（todos_data）があるか確認し、あれば自動移行
        const oldTodos = localStorage.getItem("todos_data");
        if (oldTodos) {
          const parsedOld = JSON.parse(oldTodos);
          const migratedTasks: Task[] = parsedOld.map((todo: any) => ({
            id: todo.id || crypto.randomUUID(),
            title: todo.text || todo.title || "無題のタスク",
            status: todo.completed ? "DONE" : "TODO",
            createdAt: todo.createdAt || Date.now(),
          }));
          setTasks(migratedTasks);
          localStorage.setItem("kanban_tasks_data", JSON.stringify(migratedTasks));
        } else {
          // 3. どちらもなければ初期のサンプルタスクをロード
          const defaultTasks: Task[] = [
            {
              id: "sample-1",
              title: "🚀 かんばんボードへようこそ！",
              status: "TODO",
              createdAt: Date.now() - 3600000 * 2,
            },
            {
              id: "sample-2",
              title: "💻 ドラッグ＆ドロップでカードを動かしてみよう",
              status: "IN_PROGRESS",
              createdAt: Date.now() - 3600000,
            },
            {
              id: "sample-3",
              title: "🎉 タスクを完了レーンに移動して達成感を味わおう",
              status: "DONE",
              createdAt: Date.now(),
            },
          ];
          setTasks(defaultTasks);
        }
      }

      // 4. テーマの読み込み
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark);
      }
    } catch (error) {
      console.error("localStorageからの初期データ読み込みに失敗しました", error);
    }
  }, []);

  // --- タスクの状態変更時の自動保存 ---
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("kanban_tasks_data", JSON.stringify(tasks));
    }
  }, [tasks, isMounted]);

  // --- テーマ変更時のクラス付与と自動保存 ---
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [isDarkMode, isMounted]);

  // --- 操作（Action）関数群 ---

  // 1. タスクの追加（初期ステータスは 'TODO'：未着手）
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = inputValue.trim();
    if (!trimmedTitle) return;

    const newTask: Task = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      title: trimmedTitle,
      status: "TODO", // 必ず「TODO」から始まります
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setInputValue("");
  };

  // 2. タスクの削除
  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  // 3. 特定タスクのステータス（レーン）更新（クイック移動ボタン等で使用）
  const updateTaskStatus = (id: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: newStatus } : task
      )
    );
  };

  // 4. タスクタイトルの編集保存（インライン編集完了時に使用）
  const editTaskTitle = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      deleteTask(id); // 空っぽに編集された場合は自動削除
      return;
    }
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, title: trimmed } : task
      )
    );
  };

  // 5. 完了した全タスクの一括削除
  const clearCompletedTasks = () => {
    if (window.confirm("完了したすべてのタスクを削除しますか？")) {
      setTasks((prev) => prev.filter((task) => task.status !== "DONE"));
    }
  };

  // --- ドラッグ＆ドロップ（Drag and Drop）イベント処理 ---

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData("text/plain", id);

    // ドラッグ中に背後の元のカードを半透明にする（Reactのライフサイクルの後に適用するためsetTimeoutを使用）
    setTimeout(() => {
      const element = document.getElementById(`card-${id}`);
      if (element) element.style.opacity = "0.4";
    }, 0);
  };

  // ドラッグ終了（どこかにドロップされた、またはキャンセルされたとき）
  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(null);
    setDraggedOverLane(null);
    const element = document.getElementById(`card-${id}`);
    if (element) element.style.opacity = "1";
  };

  // タスクがレーンの上に乗っているとき（ブラウザのデフォルトドロップ拒否挙動を無効化）
  const handleDragOverLane = (e: React.DragEvent, laneId: TaskStatus) => {
    e.preventDefault();
    if (draggedOverLane !== laneId) {
      setDraggedOverLane(laneId);
    }
  };

  // タスクがレーンの外に離れたとき
  const handleDragLeaveLane = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // 子要素でのチラつき防止のためにマウスの実際の位置を確認して離脱判定
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDraggedOverLane(null);
    }
  };

  // レーンにタスクがドロップされたとき
  const handleDropLane = (e: React.DragEvent, laneId: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) {
      updateTaskStatus(taskId, laneId);
    }
    setDraggedTaskId(null);
    setDraggedOverLane(null);
  };

  // テーマ切り替え
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // --- 外部（UIコンポーネント）へ公開するIF ---
  return {
    tasks,
    inputValue,
    setInputValue,
    isDarkMode,
    isMounted,
    draggedOverLane,
    handleAddTask,
    deleteTask,
    updateTaskStatus,
    editTaskTitle,
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
