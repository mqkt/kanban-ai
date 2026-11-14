"use client";

import { useEffect, useState } from "react";
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_ORDER } from "../types/kanban";
import { STALE_THRESHOLD_MS } from "@/lib/constants";
import { TASK_CATEGORIES } from "@/lib/validation/task";
import CategoryMenu from "./CategoryMenu";

interface TaskCardProps {
  task: Task;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTaskCategory: (id: string, category: string | null) => void;
  editTaskTitle: (id: string, title: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent, id: string) => void;
  // 同じ列の中で1つ上・下へ動かす（キーボードでも使える並べ替え）。動かせない向きは渡さない。
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// 進行中は「何日目か」、保留は「何日待ちか」、未着手は積んでから何日か。
const ageLabel = (status: TaskStatus, days: number) => {
  if (status === "DONE") return null;
  if (status === "PENDING") return `${days}日待ち`;
  if (status === "IN_PROGRESS") return `${days + 1}日目`;
  return `${days}日経過`;
};

// 列の中に積むカード。上の帯にカテゴリ・経過日数・日時、下に本文と操作。
// アクセント色は「停滞中」の印にだけ使う。
export default function TaskCard({
  task,
  deleteTask,
  updateTaskStatus,
  updateTaskCategory,
  editTaskTitle,
  onDragStart,
  onDragEnd,
  onMoveUp,
  onMoveDown,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditingTitle(task.title);
  };
  const handleSaveEdit = () => {
    editTaskTitle(task.id, editingTitle);
    setIsEditing(false);
  };
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTitle("");
  };

  // Date.now() はレンダー中に直接呼べないため、遅延初期化 + 1時間ごとの更新にする。
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const isStale =
    task.status !== "DONE" &&
    task.updatedAt !== undefined &&
    now - task.updatedAt > STALE_THRESHOLD_MS;

  const days = task.updatedAt !== undefined ? Math.max(0, Math.floor((now - task.updatedAt) / DAY_MS)) : 0;
  const age = task.updatedAt !== undefined ? ageLabel(task.status, days) : null;

  const currentStatusIndex = TASK_STATUS_ORDER.indexOf(task.status);
  const previousStatus = currentStatusIndex > 0 ? TASK_STATUS_ORDER[currentStatusIndex - 1] : null;
  const nextStatus =
    currentStatusIndex !== -1 && currentStatusIndex < TASK_STATUS_ORDER.length - 1
      ? TASK_STATUS_ORDER[currentStatusIndex + 1]
      : null;

  const categoryControl = task.error ? (
    <span
      className="font-medium text-error"
    >
      分類に失敗
    </span>
  ) : task.isClassifying ? (
    <span>分類中…</span>
  ) : (
    <CategoryMenu
      value={task.category ?? null}
      options={TASK_CATEGORIES}
      onChange={(next) => updateTaskCategory(task.id, next)}
    />
  );

  const staleTag = isStale && (
    <span
      className="bg-accent px-2 py-0.5 font-medium text-accent-ink"
    >
      停滞中
    </span>
  );

  const act = "link-quiet";
  const actions = (
    <>
      <button onClick={handleStartEdit} className={act}>
        編集
      </button>
      <button onClick={() => deleteTask(task.id)} className={`${act} hover:!text-error`}>
        削除
      </button>
      {onMoveUp && (
        <button onClick={onMoveUp} className={act}>
          上へ
        </button>
      )}
      {onMoveDown && (
        <button onClick={onMoveDown} className={act}>
          下へ
        </button>
      )}
      {previousStatus && (
        <button
          onClick={() => updateTaskStatus(task.id, previousStatus)}
          className={act}
        >
          {TASK_STATUS_LABELS[previousStatus]}へ
        </button>
      )}
      {nextStatus && (
        <button
          onClick={() => updateTaskStatus(task.id, nextStatus)}
          className={act}
        >
          {TASK_STATUS_LABELS[nextStatus]}へ
        </button>
      )}
    </>
  );

  const editor = (
    <div className="flex flex-col gap-2 p-4">
      <textarea
        value={editingTitle}
        onChange={(e) => setEditingTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
          } else if (e.key === "Escape") {
            handleCancelEdit();
          }
        }}
        className="min-h-16 w-full resize-none border border-ink bg-plate p-2 text-base outline-none focus:ring-2 focus:ring-focus"
        autoFocus
        placeholder="タイトル"
      />
      <div className="flex gap-2 text-sm">
        <button type="button" onClick={handleSaveEdit} className="key-primary min-h-10">
          保存
        </button>
        <button type="button" onClick={handleCancelEdit} className="key">
          キャンセル
        </button>
      </div>
    </div>
  );

  const titleClass = `block select-none break-all font-medium leading-snug ${
    task.status === "DONE" ? "text-muted line-through" : ""
  }`;

  return (
    <div
      id={`card-${task.id}`}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={(e) => onDragEnd(e, task.id)}
      className={`group cursor-grab border-2 border-ink bg-plate transition-shadow duration-[var(--dur-micro)] hover:shadow-card-hover active:cursor-grabbing ${
        task.status === "IN_PROGRESS" ? "shadow-card-hover" : "shadow-card"
      }`}
    >
      {isEditing ? (
        editor
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule px-4 py-2 text-xs text-muted">
            {categoryControl}
            {staleTag}
            {age && <span className="num">{age}</span>}
            <span className="num ml-auto">{formatDate(task.createdAt)}</span>
          </div>
          <div className="px-4 pt-4 pb-3">
            <span onDoubleClick={handleStartEdit} className={`${titleClass} text-base`}>
              {task.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-4 text-sm">
            {actions}
          </div>
        </>
      )}
    </div>
  );
}
