"use client";

import { useState } from "react";
import { LaneConfig, Task, TaskStatus } from "../types/kanban";
import TaskCard from "./TaskCard";
import InlineConfirm from "./InlineConfirm";

interface KanbanLaneProps {
  lane: LaneConfig;
  tasks: Task[];
  isDraggedOver: boolean;
  onDragOver: (e: React.DragEvent, laneId: TaskStatus) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, laneId: TaskStatus, beforeId?: string | null) => void;
  onPlace: (taskId: string, laneId: TaskStatus, beforeId: string | null) => void;
  // ドラッグ中のカードとその高さ。元の場所では畳み、入る場所に同じ高さの空き枠を出す。
  dragging: { id: string; height: number } | null;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, newStatus: TaskStatus) => void;
  updateTaskCategory: (id: string, category: string | null) => void;
  editTaskTitle: (id: string, newTitle: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent, id: string) => void;
  onClearCompleted?: () => void;
}

// ポインターが列の外へ出たか。relatedTarget（移った先）があればそれで、無いブラウザでは座標で判定する。
function isLeavingLane(e: React.DragEvent): boolean {
  const related = e.relatedTarget as Node | null;
  if (related) return !e.currentTarget.contains(related);
  const rect = e.currentTarget.getBoundingClientRect();
  return e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom;
}

// 完了は終わった仕事なので、既定では畳んで件数だけ見せる。ドラッグ中は開く。
export default function KanbanLane({
  lane,
  tasks,
  isDraggedOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onPlace,
  dragging,
  deleteTask,
  updateTaskStatus,
  updateTaskCategory,
  editTaskTitle,
  onDragStart,
  onDragEnd,
  onClearCompleted,
}: KanbanLaneProps) {
  const collapsible = lane.id === "DONE";
  const [collapsed, setCollapsed] = useState(true);
  const [confirmingClear, setConfirmingClear] = useState(false);
  // ドラッグ中の挿入位置。string = そのカードの手前、null = 末尾、undefined = 表示なし。
  const [insertBefore, setInsertBefore] = useState<string | null | undefined>(undefined);

  // 入る場所の空き枠。ドラッグ中のカードと同じ高さの点線の枠。
  const slot = dragging ? (
    <div
      aria-hidden="true"
      // 完了の台帳は細い行なので枠も細く。作業中の列は、動かすカードの高さ（最低でも少し高く）にそろえる。
      style={{ height: collapsible ? 40 : Math.max(dragging.height, 120) }}
      className="border-2 border-dashed border-ink bg-accent-soft"
    />
  ) : (
    <div aria-hidden="true" className="h-1 bg-ink" />
  );

  // ポインターの高さから、どのカードの手前に入れるかを決める。
  const beforeIdAt = (e: React.DragEvent): string | null => {
    const cards = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[id^="card-"]'));
    for (const card of cards) {
      // 畳まれた元のカードは、挿入位置の判定に使わない。
      if (dragging && card.id === `card-${dragging.id}`) continue;
      const rect = card.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) return card.id.replace(/^card-/, "");
    }
    return null;
  };
  const open = !collapsible || !collapsed || isDraggedOver || tasks.length === 0;

  return (
    <section
      id={`lane-${lane.id}`}
      className="min-w-0"
      onDragOver={(e) => {
        onDragOver(e, lane.id);
        if (tasks.length > 0) setInsertBefore(beforeIdAt(e));
      }}
      onDragLeave={(e) => {
        // 列の中で子要素の間を移っただけの dragleave は無視する。ここで枠を消すと、
        // 次の dragover で出し直すまでの間、下のカードが枠の高さ分ずれて、画面が揺れる。
        if (!isLeavingLane(e)) return;
        onDragLeave(e);
        setInsertBefore(undefined);
      }}
      onDrop={(e) => {
        const before = tasks.length > 0 ? beforeIdAt(e) : undefined;
        setInsertBefore(undefined);
        onDrop(e, lane.id, before);
      }}
    >
      <h2
        className="flex max-w-none items-baseline gap-3 border-t-2 border-ink pt-2"
      >
        <span className="font-display text-2xl font-bold leading-none">{lane.title}</span>
        <span className="num text-sm font-normal text-muted">{tasks.length}件</span>
        {collapsible && tasks.length > 0 && (
          <span className="ml-auto flex items-center gap-4 self-center">
            {open && onClearCompleted && !confirmingClear && (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="link-quiet text-sm font-normal text-error"
              >
                完了をすべて削除
              </button>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="key min-h-9 px-3 text-sm font-normal"
              aria-expanded={open}
            >
              {open ? "閉じる" : "開く"}
            </button>
          </span>
        )}
      </h2>

      {collapsible && open && tasks.length > 0 && onClearCompleted && confirmingClear && (
        <div className="mt-2">
          <InlineConfirm
            message="完了をすべて削除しますか？"
            confirmLabel="削除する"
            onConfirm={() => {
              onClearCompleted();
              setConfirmingClear(false);
            }}
            onCancel={() => setConfirmingClear(false)}
          />
        </div>
      )}

      {open && (
        <div className={collapsible ? "mt-2 flex flex-col" : "mt-3 flex flex-col gap-3"}>
          {tasks.length === 0 ? (
            isDraggedOver && dragging ? (
              slot
            ) : (
            <p className={collapsible ? "border-b border-rule py-2 text-sm text-muted" : "border border-ink/30 px-3 py-6 text-sm text-muted"}>{lane.title}のタスクはありません</p>
            )
          ) : (
            <>
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  // ドラッグ中の元のカードは、残像を残さず、高さごと畳む。
                  className={`flex flex-col ${collapsible ? "" : "gap-3"} ${
                    dragging?.id === task.id ? `pointer-events-none h-0 overflow-hidden opacity-0 ${collapsible ? "" : "-mb-3"}` : ""
                  }`}
                >
                  {isDraggedOver && insertBefore === task.id && slot}
                  <TaskCard
                    task={task}
                    deleteTask={deleteTask}
                    updateTaskStatus={updateTaskStatus}
                    updateTaskCategory={updateTaskCategory}
                    editTaskTitle={editTaskTitle}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    compact={collapsible}
                    onMoveUp={index > 0 ? () => onPlace(task.id, lane.id, tasks[index - 1].id) : undefined}
                    onMoveDown={
                      index < tasks.length - 1
                        ? () => onPlace(task.id, lane.id, tasks[index + 2]?.id ?? null)
                        : undefined
                    }
                  />
                </div>
              ))}
              {isDraggedOver && insertBefore === null && slot}
            </>
          )}
        </div>
      )}
    </section>
  );
}
