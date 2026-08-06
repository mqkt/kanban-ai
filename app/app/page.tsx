"use client";

import { useKanban } from "../hooks/useKanban";
import { useTriage } from "../hooks/useTriage";
import { LaneConfig } from "../types/kanban";
import { IN_PROGRESS_WIP_LIMIT } from "@/lib/constants";
import { Clock, Layers, CheckCircle, Hourglass } from "lucide-react";
import BoardHeader from "../components/BoardHeader";
import TaskForm from "../components/TaskForm";
import KanbanLane from "../components/KanbanLane";
import TriagePanel from "../components/TriagePanel";

export default function KanbanAppPage() {
  const {
    tasks,
    isDarkMode,
    isMounted,
    isLoading,
    loadError,
    wipWarning,
    draggedOverLane,
    addTask,
    deleteTask,
    updateTaskStatus,
    editTaskTitle,
    mergeTasks,
    clearCompletedTasks,
    toggleDarkMode,
    dragHandlers,
  } = useKanban();

  const triage = useTriage();

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
      wipLimit: IN_PROGRESS_WIP_LIMIT,
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
        />

        {loadError && (
          <div className="panel-card border-red-200/70 dark:border-red-900/40 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
            {loadError}
          </div>
        )}

        {wipWarning && (
          <div className="panel-card border-amber-200/70 dark:border-amber-900/40 px-4 py-3 text-sm font-semibold text-amber-600 dark:text-amber-400">
            {wipWarning}
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

        {isLoading ? (
          <main className="panel-card p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            タスクを読み込んでいます...
          </main>
        ) : (
          <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {lanes.map((lane) => {
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
        )}
      </div>
    </div>
  );
}
