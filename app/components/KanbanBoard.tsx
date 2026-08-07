"use client";

import { useMemo, useState } from "react";
import { useKanban } from "../hooks/useKanban";
import { useTriage } from "../hooks/useTriage";
import { LaneConfig } from "../types/kanban";
import { Clock, Layers, CheckCircle, Hourglass, Filter, X } from "lucide-react";
import BoardHeader from "./BoardHeader";
import TaskForm from "./TaskForm";
import KanbanLane from "./KanbanLane";
import TriagePanel from "./TriagePanel";
import AboutSection from "./AboutSection";

interface KanbanBoardProps {
  isGuest: boolean;
}

export default function KanbanBoard({ isGuest }: KanbanBoardProps) {
  const {
    tasks,
    isDarkMode,
    isMounted,
    isLoading,
    loadError,
    draggedOverLane,
    addTask,
    deleteTask,
    updateTaskStatus,
    updateTaskCategory,
    editTaskTitle,
    mergeTasks,
    clearCompletedTasks,
    toggleDarkMode,
    dragHandlers,
  } = useKanban();

  const triage = useTriage();

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // 実際にタスクで使われているカテゴリだけをフィルタ候補として出す
  // （固定5択を常に出すと、使っていないカテゴリまで表示されて絞り込みの意味が薄れるため）。
  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set(tasks.map((task) => task.category).filter((c): c is string => Boolean(c)))
      ).sort(),
    [tasks]
  );

  const handleMergeSuggestion = async (index: number) => {
    const suggestion = triage.suggestions[index];
    if (!suggestion) return;
    const [keepId, ...mergeIds] = suggestion.taskIds;
    triage.dismissSuggestion(index);
    await mergeTasks(keepId, mergeIds, suggestion.suggestedTitle);
  };

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
      id: "PENDING",
      title: "保留",
      accentClass: "bg-purple-600 dark:bg-purple-500",
      icon: <Hourglass className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
    },
    {
      id: "DONE",
      title: "完了",
      accentClass: "bg-emerald-600 dark:bg-emerald-500",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    },
  ];

  if (!isMounted) return null;

  return (
    <div className="app-bg min-h-screen w-full p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8">
        <BoardHeader
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          hasCompletedTasks={tasks.some((t) => t.status === "DONE")}
          clearCompletedTasks={clearCompletedTasks}
          isGuest={isGuest}
        />

        {loadError && (
          <div className="panel-card border-red-200/70 dark:border-red-900/40 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
            {loadError}
          </div>
        )}

        <TaskForm onSubmit={addTask} isLoading={isLoading} />

        {!isLoading && (
          <TriagePanel
            tasks={tasks}
            suggestions={triage.suggestions}
            isRunning={triage.isRunning}
            error={triage.error}
            hasRun={triage.hasRun}
            onRun={triage.runTriage}
            onDismiss={triage.dismissSuggestion}
            onMerge={handleMergeSuggestion}
          />
        )}

        {!isLoading && availableCategories.length > 0 && (
          <div className="panel-card px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              カテゴリで絞り込み
            </span>
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() =>
                  setCategoryFilter((prev) => (prev === category ? null : category))
                }
                className={`text-xs font-bold px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  categoryFilter === category
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                {category}
              </button>
            ))}
            {categoryFilter && (
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
                クリア
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <main className="panel-card p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            タスクを読み込んでいます...
          </main>
        ) : (
          <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {lanes.map((lane) => {
              const laneTasks = tasks.filter(
                (task) =>
                  task.status === lane.id &&
                  (!categoryFilter || task.category === categoryFilter)
              );

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
                  updateTaskCategory={updateTaskCategory}
                  editTaskTitle={editTaskTitle}
                  onDragStart={dragHandlers.handleDragStart}
                  onDragEnd={dragHandlers.handleDragEnd}
                />
              );
            })}
          </main>
        )}

        <AboutSection />
      </div>
    </div>
  );
}
