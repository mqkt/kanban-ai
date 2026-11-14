"use client";

import { Task } from "../types/kanban";
import { DuplicateSuggestion } from "../hooks/useDuplicates";
import InlineConfirm from "./InlineConfirm";

export function DuplicateButton({
  isRunning,
  onRun,
}: {
  isRunning: boolean;
  onRun: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRun()}
      disabled={isRunning}
      className="key"
    >
      {isRunning ? "探しています…" : "重複タスクをまとめる"}
    </button>
  );
}

export function DuplicateResults({
  tasks,
  suggestions,
  isRunning,
  error,
  hasRun,
  pendingOverwrite,
  onConfirmRerun,
  onCancelRerun,
  onDismiss,
  onMerge,
}: {
  tasks: Task[];
  suggestions: DuplicateSuggestion[];
  isRunning: boolean;
  error: string | null;
  hasRun: boolean;
  pendingOverwrite: boolean;
  onConfirmRerun: () => void;
  onCancelRerun: () => void;
  onDismiss: (index: number) => void;
  onMerge: (index: number) => void;
}) {
  const titleFor = (taskId: string) =>
    tasks.find((task) => task.id === taskId)?.title ?? "（削除済み）";

  const empty = hasRun && !isRunning && suggestions.length === 0 && !error;
  if (!error && !empty && suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {pendingOverwrite && (
        <InlineConfirm
          message={`未確認の提案が${suggestions.length}件あります。もう一度探すと上書きされます。`}
          confirmLabel="上書きして探す"
          onConfirm={onConfirmRerun}
          onCancel={onCancelRerun}
        />
      )}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {empty && <p className="text-sm text-muted">重複はありません。</p>}
      {suggestions.map((suggestion, index) => (
        <div key={`${suggestion.taskIds.join("-")}-${index}`} className="border-2 border-ink bg-plate p-4 shadow-card">
          <p className="text-sm text-muted">似たタスクが見つかりました</p>
          <ul className="mt-2 flex flex-col text-base font-medium">
            {suggestion.taskIds.map((taskId) => (
              <li key={taskId} className="break-all border-b border-rule py-2">
                {titleFor(taskId)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">{suggestion.reason}</p>

          <div className="mt-4 border-t-2 border-ink pt-3">
            <p className="text-sm text-muted">まとめると、{suggestion.taskIds.length}件が1件になります</p>
            <p className="mt-1 break-all text-lg font-medium">「{suggestion.suggestedTitle}」</p>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => onMerge(index)} className="key-primary min-h-10">
              まとめる
            </button>
            <button type="button" onClick={() => onDismiss(index)} className="key">
              無視
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
