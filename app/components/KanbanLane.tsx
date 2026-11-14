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
  onDrop: (e: React.DragEvent, laneId: TaskStatus) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, newStatus: TaskStatus) => void;
  updateTaskCategory: (id: string, category: string | null) => void;
  editTaskTitle: (id: string, newTitle: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent, id: string) => void;
  onClearCompleted?: () => void;
}

// 完了は終わった仕事なので、既定では畳んで件数だけ見せる。ドラッグ中は開く。
export default function KanbanLane({
  lane,
  tasks,
  isDraggedOver,
  onDragOver,
  onDragLeave,
  onDrop,
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
  const open = !collapsible || !collapsed || isDraggedOver || tasks.length === 0;

  return (
    <section
      className={`min-w-0 transition-colors duration-[var(--dur-short)] ${isDraggedOver ? "bg-accent-soft" : ""}`}
      onDragOver={(e) => onDragOver(e, lane.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, lane.id)}
    >
      <h2
        className={`flex max-w-none items-baseline gap-3 border-t-2 border-ink pt-2 transition-colors duration-[var(--dur-short)] ${
          isDraggedOver ? "bg-accent-soft" : ""
        }`}
      >
        <span className="font-display text-2xl font-bold leading-none">{lane.title}</span>
        <span className="num text-sm font-normal text-muted">{tasks.length}件</span>
        {collapsible && tasks.length > 0 && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="key ml-auto min-h-9 px-3 text-sm font-normal"
            aria-expanded={open}
          >
            {open ? "閉じる" : "開く"}
          </button>
        )}
      </h2>

      {collapsible && open && tasks.length > 0 && onClearCompleted && (
        <div className="mt-2">
          {confirmingClear ? (
            <InlineConfirm
              message="完了をすべて削除しますか？"
              confirmLabel="削除する"
              onConfirm={() => {
                onClearCompleted();
                setConfirmingClear(false);
              }}
              onCancel={() => setConfirmingClear(false)}
            />
          ) : (
            <button type="button" onClick={() => setConfirmingClear(true)} className="link-quiet text-sm text-error">
              完了をすべて削除
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {tasks.length === 0 ? (
            <p className="border border-rule px-3 py-6 text-sm text-muted">{lane.title}のタスクはありません</p>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                deleteTask={deleteTask}
                updateTaskStatus={updateTaskStatus}
                updateTaskCategory={updateTaskCategory}
                editTaskTitle={editTaskTitle}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
