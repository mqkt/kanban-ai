"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Check, Sun, Moon } from "lucide-react";

// タスクの型定義
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export default function TodoApp() {
  // タスク一覧リストの状態
  const [todos, setTodos] = useState<Todo[]>([]);
  // 入力フォームの状態
  const [inputValue, setInputValue] = useState("");
  // ダークモードの状態
  const [isDarkMode, setIsDarkMode] = useState(false);
  // ハイドレーションエラー対策（クライアントサイドでのマウントが完了したか）
  const [isMounted, setIsMounted] = useState(false);

  // コンポーネントの初回マウント時にlocalStorageからデータを読み込む
  useEffect(() => {
    setIsMounted(true);
    try {
      // タスクの読み込み
      const savedTodos = localStorage.getItem("todos_data");
      if (savedTodos) {
        setTodos(JSON.parse(savedTodos));
      }

      // テーマの読み込み
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        // 保存された設定がある場合はそれを優先
        setIsDarkMode(savedTheme === "dark");
      } else {
        // 保存された設定がない場合はOSのテーマ設定を確認
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark);
      }
    } catch (error) {
      console.error("localStorageからのデータ読み込みに失敗しました", error);
    }
  }, []);

  // todosの状態が変化したときにlocalStorageに保存する
  useEffect(() => {
    // 初回マウント前は上書きを防ぐためスキップ
    if (isMounted) {
      localStorage.setItem("todos_data", JSON.stringify(todos));
    }
  }, [todos, isMounted]);

  // テーマの状態が変化したときにlocalStorageに保存し、HTML要素にクラスを付与する
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

  // 新規タスクの追加
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedText = inputValue.trim();
    // 空文字の場合は何もしない（バリデーション）
    if (!trimmedText) return;

    const newTodo: Todo = {
      // 一意なIDの生成（モダンブラウザ対応）
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      text: trimmedText,
      completed: false,
      createdAt: Date.now(),
    };

    // リストの先頭に追加
    setTodos((prev) => [newTodo, ...prev]);
    // 入力フォームをリセット
    setInputValue("");
  };

  // タスクの完了/未完了の切り替え
  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // タスクの削除
  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  // テーマの切り替え
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // ハイドレーションの不整合を防ぐため、マウントされるまで何も表示しない
  if (!isMounted) return null;

  return (
    // 全体のレイアウト設定: 画面中央に配置、背景色指定
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans transition-colors duration-300">
      {/* カード型コンテナ */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-colors duration-300">

        {/* ヘッダー */}
        <div className="bg-blue-600 dark:bg-blue-800 px-6 py-8 text-white text-center relative">
          <h1 className="text-3xl font-extrabold tracking-tight">ToDoリスト</h1>
          <p className="text-blue-200 dark:text-blue-300 mt-2 text-sm font-medium">人生を整理しよう</p>

          {/* ダークモード切り替えボタン */}
          <button
            onClick={toggleDarkMode}
            className="absolute top-4 right-4 p-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/50 transition-colors"
            aria-label="テーマを切り替える"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="p-6">
          {/* タスク入力フォーム */}
          <form onSubmit={handleAddTodo} className="flex gap-3 mb-8">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="新しいタスクを入力..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-transparent focus:bg-white dark:focus:bg-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-xl px-4 py-3 outline-none transition-all duration-300 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl flex items-center justify-center transition-colors duration-300 shadow-sm hover:shadow-md active:scale-95"
              aria-label="タスクを追加"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </form>

          {/* タスク一覧リスト */}
          <div className="flex flex-col gap-3">
            {todos.length === 0 ? (
              // タスクが0件の場合のプレースホルダー
              <div className="text-center py-10">
                <p className="text-slate-500 dark:text-slate-400 font-medium">すべてのタスクが完了しました 🎉</p>
              </div>
            ) : (
              // 登録されたタスクのリスト出力
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-sm ${todo.completed
                      ? "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-80"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/20"
                    }`}
                >
                  <div className="flex items-center gap-4 overflow-hidden flex-1">
                    {/* チェックボックスボタン */}
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${todo.completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-slate-300 dark:border-slate-600 text-transparent hover:border-blue-500 dark:hover:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none"
                        }`}
                      aria-label={todo.completed ? "未完了に戻す" : "完了にする"}
                    >
                      <Check size={14} strokeWidth={3.5} className={todo.completed ? "opacity-100 scale-100" : "opacity-0 scale-50 transition-transform"} />
                    </button>

                    {/* タスクテキスト */}
                    <span
                      className={`truncate text-base transition-all duration-300 ${todo.completed ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-700 dark:text-slate-200 font-medium"
                        }`}
                    >
                      {todo.text}
                    </span>
                  </div>

                  {/* 削除ボタン（ホバー時に色が強調される） */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="flex-shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all duration-300 opacity-60 group-hover:opacity-100 outline-none focus:ring-2 focus:ring-red-500/20"
                    aria-label="タスクを削除"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
