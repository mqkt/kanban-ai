"use client";

import { useEffect, useMemo, useState } from "react";
import { useKanban } from "../hooks/useKanban";
import { useDuplicates } from "../hooks/useDuplicates";
import { LaneConfig, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_ORDER } from "../types/kanban";
import BoardHeader from "./BoardHeader";
import TaskForm from "./TaskForm";
import KanbanLane from "./KanbanLane";
import { sortForLane } from "@/lib/taskOrder";
import { DuplicateButton, DuplicateResults } from "./DuplicatePanel";
import AboutSection from "./AboutSection";
import UndoBar from "./UndoBar";

interface KanbanBoardProps {
  isGuest: boolean;
  userName: string | null;
  userImage: string | null;
}

export default function KanbanBoard({ isGuest, userName, userImage }: KanbanBoardProps) {
  const {
    tasks,
    isDarkMode,
    isMounted,
    isLoading,
    loadError,
    draggedOverLane,
    dragging,
    addTask,
    deleteTask,
    undoDelete,
    pendingDelete,
    updateTaskStatus,
    placeTask,
    updateTaskCategory,
    editTaskTitle,
    mergeTasks,
    clearCompletedTasks,
    toggleDarkMode,
    dragHandlers,
  } = useKanban();

  const duplicates = useDuplicates();

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sameTitleNotice, setSameTitleNotice] = useState<string | null>(null);

  // 通知は数秒で消す。
  useEffect(() => {
    if (!sameTitleNotice) return;
    const timer = setTimeout(() => setSameTitleNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [sameTitleNotice]);

  // 追加の前に、同じタイトルが既にあれば知らせる（AIは呼ばない。追加自体は止めない）。
  const normalize = (text: string) => text.replace(/\s+/g, "").toLowerCase();
  const handleAdd = async (title: string) => {
    const same = tasks.some((t) => normalize(t.title) === normalize(title));
    setSameTitleNotice(same ? `「${title.trim()}」と同じタイトルのタスクがあります。` : null);
    await addTask(title);
  };

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
    const suggestion = duplicates.suggestions[index];
    if (!suggestion) return;
    const [keepId, ...mergeIds] = suggestion.taskIds;
    duplicates.dismissSuggestion(index);
    await mergeTasks(keepId, mergeIds, suggestion.suggestedTitle);
  };

  const lanes: LaneConfig[] = TASK_STATUS_ORDER.map((id) => ({
    id,
    title: TASK_STATUS_LABELS[id],
  }));

  if (!isMounted) return null;

  const visibleIn = (id: TaskStatus) =>
    tasks.filter(
      (task) =>
        task.status === id &&
        (!categoryFilter || task.category === categoryFilter) &&
        (!query.trim() || normalize(task.title).includes(normalize(query)))
    );

  const laneOf = (id: TaskStatus) => {
    const lane = lanes.find((l) => l.id === id)!;
    const laneTasks = sortForLane(visibleIn(id));
    return (
      <KanbanLane
        key={id}
        lane={lane}
        tasks={laneTasks}
        isDraggedOver={draggedOverLane === id}
        onDragOver={dragHandlers.handleDragOverLane}
        onDragLeave={dragHandlers.handleDragLeaveLane}
        onDrop={dragHandlers.handleDropLane}
        onPlace={placeTask}
        dragging={dragging}
        deleteTask={deleteTask}
        updateTaskStatus={updateTaskStatus}
        updateTaskCategory={updateTaskCategory}
        editTaskTitle={editTaskTitle}
        onDragStart={dragHandlers.handleDragStart}
        onDragEnd={dragHandlers.handleDragEnd}
        onClearCompleted={id === "DONE" ? clearCompletedTasks : undefined}
      />
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <BoardHeader
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        isGuest={isGuest}
        userName={userName}
        userImage={userImage}
      />

      <main className="mx-auto flex w-full max-w-[var(--container)] flex-1 flex-col gap-8 px-[var(--gutter)] py-6">
        {loadError && (
          <p role="alert" className="border-2 border-error bg-plate px-4 py-3 text-sm text-error">
            {loadError}
          </p>
        )}

        <section className="flex flex-col gap-3">
          <TaskForm onSubmit={handleAdd} isLoading={isLoading} />
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-sm text-muted">追加するとAIがカテゴリを付けます。</p>
            {!isLoading && <DuplicateButton isRunning={duplicates.isRunning} onRun={duplicates.runDuplicateCheck} />}
          </div>
          {sameTitleNotice && (
            <p role="status" className="text-sm">
              {sameTitleNotice}
            </p>
          )}

          {!isLoading && tasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-3 text-sm">
              {availableCategories.length > 0 && <span className="mr-1 text-muted">カテゴリ</span>}
              {availableCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={categoryFilter === category}
                  onClick={() => setCategoryFilter((prev) => (prev === category ? null : category))}
                  className={`min-h-8 cursor-pointer border px-3 font-medium transition-colors duration-[var(--dur-micro)] [@media(hover:none)]:min-h-11 ${
                    categoryFilter === category
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-ink bg-plate hover:bg-paper-2"
                  }`}
                >
                  {category}
                </button>
              ))}
              {categoryFilter && (
                <button type="button" onClick={() => setCategoryFilter(null)} className="link-quiet px-1">
                  解除
                </button>
              )}
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="検索"
                aria-label="タスクを検索"
                className="ml-auto min-h-9 w-full border border-ink bg-plate px-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-focus sm:w-56"
              />
            </div>
          )}

          {!isLoading && (
            <DuplicateResults
              tasks={tasks}
              suggestions={duplicates.suggestions}
              isRunning={duplicates.isRunning}
              error={duplicates.error}
              hasRun={duplicates.hasRun}
              pendingOverwrite={duplicates.pendingOverwrite}
              onConfirmRerun={duplicates.confirmRerun}
              onCancelRerun={duplicates.cancelRerun}
              onDismiss={duplicates.dismissSuggestion}
              onMerge={handleMergeSuggestion}
            />
          )}
        </section>

        {isLoading ? (
          <div aria-busy="true" className="grid gap-[var(--gap-columns)] md:grid-cols-2 xl:grid-cols-4">
            <p className="sr-only">読み込み中…</p>
            {lanes.map((lane) => (
              <div key={lane.id} aria-hidden="true" className="flex flex-col gap-3">
                <div className="h-6 w-24 animate-pulse rounded-pill bg-paper-3" />
                <div className="h-20 animate-pulse rounded-card bg-paper-3" />
                <div className="h-20 animate-pulse rounded-card bg-paper-3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 作業中の3列は広く使い、完了は下に、画面幅いっぱいの台帳として置く。 */}
            <div className="grid items-start gap-x-[var(--gap-columns)] gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              {laneOf("TODO")}
              {laneOf("IN_PROGRESS")}
              {laneOf("PENDING")}
            </div>
            {laneOf("DONE")}
          </>
        )}
      </main>

      {dragging && tasks.find((t) => t.id === dragging.id)?.status !== "DONE" && (
        // 完了は画面の下にあることが多いので、ドラッグ中だけ、画面の下に落とし先を出す。
        <div
          onDragOver={(e) => dragHandlers.handleDragOverLane(e, "DONE")}
          onDragLeave={dragHandlers.handleDragLeaveLane}
          onDrop={(e) => dragHandlers.handleDropLane(e, "DONE")}
          className={`fixed inset-x-0 bottom-0 z-[var(--z-toast)] border-t-2 border-ink px-[var(--gutter)] py-5 text-center text-sm font-medium ${
            draggedOverLane === "DONE" ? "bg-accent-soft" : "bg-plate"
          }`}
        >
          ここに落として完了にする
        </div>
      )}

      {pendingDelete && <UndoBar title={pendingDelete.title} onUndo={undoDelete} />}

      <AboutSection />
    </div>
  );
}
