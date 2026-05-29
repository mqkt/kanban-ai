"use client";

import { useKanban } from "./hooks/useKanban";
import { LaneConfig } from "./types/kanban";
import { Clock, Layers, CheckCircle } from "lucide-react";
import BoardHeader from "./components/BoardHeader";
import TaskForm from "./components/TaskForm";
import KanbanLane from "./components/KanbanLane";

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * Next.jsにおけるこの画面の「玄関口（メインページ）」としての役割を果たすためです。
 * 分割した各パーツ（ヘッダー、入力フォーム、各レーン）を、最終的にどのように画面に配置して
 * 組み立てるかという「レイアウトと結合」を指示します。
 *
 * ==========================================
 * 【何を担当するか】
 * ==========================================
 * 以下の統合処理を担当します：
 * 1. 状態管理カスタムフック（useKanban）を呼び出し、必要なデータと関数を取り出す。
 * 2. アプリ全体の最外殻レイアウト（背景のグラデーション、幅制限コンテナなど）の定義。
 * 3. `BoardHeader`, `TaskForm`, `KanbanLane` などのコンポーネントに必要なデータ（Props）を流し込みながら配置する。
 * 4. 各レーン（TODO/進行中/完了）の設定情報（アイコンや色）を定義し、ループでレーンを描画する。
 *
 * ==========================================
 * 【Propsの意味】
 * ==========================================
 * ※ このファイルはルートとなるページコンポーネント（Next.jsのエントリーポイント）であるため、
 * 　 外部から受け取るPropsはありません。
 *
 * ==========================================
 * 【State（内部状態）の役割】
 * ==========================================
 * ※ このコンポーネント自身の内部Stateは 0個 です。
 * 　 すべての状態管理（データ・テーマ・ドラッグ等）は、カスタムフック `useKanban` の中に隠蔽されています。
 * 　 これにより、画面の結合コードが驚くほどシンプルで読みやすくなっています。
 */

export default function KanbanPage() {
  // --- カスタムフックから「頭脳（ロジックと状態）」をすべて取り出す ---
  const {
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
    dragHandlers,
  } = useKanban();

  // --- 3つのレーン（列）の個別設定情報 ---
  const lanes: LaneConfig[] = [
    {
      id: "TODO",
      title: "未着手",
      accentClass: "bg-blue-600 dark:bg-blue-500",
      icon: <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    },
    {
      id: "IN_PROGRESS",
      title: "進行中",
      accentClass: "bg-amber-600 dark:bg-amber-500",
      icon: <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    },
    {
      id: "DONE",
      title: "完了",
      accentClass: "bg-emerald-600 dark:bg-emerald-500",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    },
  ];

  // ハイドレーションの不整合（サーバーとクライアントの初期表示のズレ）を防ぐためのガード。
  // Reactがブラウザにマウントされるまでは何もレンダリングせず、マウント後に画面を安全に描画します。
  if (!isMounted) return null;

  return (
    <div className="app-bg min-h-screen w-full p-4 sm:p-6 md:p-8 font-sans">
      
      {/* 画面中央に幅を制御したコンテンツを配置 */}
      <div className="max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8">
        
        {/* 1. ヘッダーパーツの配置 */}
        <BoardHeader
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          hasCompletedTasks={tasks.some((t) => t.status === "DONE")}
          clearCompletedTasks={clearCompletedTasks}
        />

        {/* 2. 新規タスク入力フォームパーツの配置 */}
        <TaskForm
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSubmit={handleAddTask}
        />

        {/* 3. かんばんボードグリッド（3列レーンの配置） */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {lanes.map((lane) => {
            // このレーンに対応するタスクのみをフィルタリング
            const laneTasks = tasks.filter((task) => task.status === lane.id);

            return (
              <KanbanLane
                key={lane.id}
                lane={lane}
                tasks={laneTasks}
                isDraggedOver={draggedOverLane === lane.id}
                onDragOver={dragHandlers.handleDragOverLane}
                onDragLeave={dragHandlers.handleDragLeaveLane}
                onDrop={dragHandlers.handleDropLane}
                deleteTask={deleteTask}
                updateTaskStatus={updateTaskStatus}
                editTaskTitle={editTaskTitle}
                onDragStart={dragHandlers.handleDragStart}
                onDragEnd={dragHandlers.handleDragEnd}
              />
            );
          })}
        </main>
        
      </div>
    </div>
  );
}
