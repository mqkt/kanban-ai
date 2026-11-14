"use client";

import { useEffect, useState } from "react";
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_ORDER } from "../types/kanban";
import { STALE_THRESHOLD_MS } from "@/lib/constants";
import { TASK_CATEGORIES } from "@/lib/validation/task";
import CategoryMenu from "./CategoryMenu";
import ActionMenu, { ActionItem } from "./ActionMenu";

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
  // 完了の台帳用。プレートではなく、罫線で区切った1行として描く。
  compact?: boolean;
}

// 「いま一番自然な1手」。メニューの先頭に置く。完了のカードには決めない。
const PRIMARY_MOVE: Partial<Record<TaskStatus, TaskStatus>> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  PENDING: "IN_PROGRESS",
};

const moveLabel = (status: TaskStatus) =>
  status === "DONE" ? "完了にする" : `${TASK_STATUS_LABELS[status]}へ`;

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
  compact = false,
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

  // 操作はすべて「⋯」メニューに入れ、カードの上には出さない（常に6つ並ぶと多すぎるため）。
  // 並びは使う順: まず「いま一番自然な1手」、次に他の列、そのあと編集・並べ替え、最後に削除。
  // 列の移動と並べ替えは、マウスならドラッグでもできる（メニューはキーボード・タッチ用でもある）。
  const primaryStatus = PRIMARY_MOVE[task.status];
  const moveTargets = [
    ...(primaryStatus ? [primaryStatus] : []),
    ...TASK_STATUS_ORDER.filter((st) => st !== task.status && st !== primaryStatus),
  ];

  const menuItems: ActionItem[] = [
    ...moveTargets.map((st) => ({
      label: moveLabel(st),
      onSelect: () => updateTaskStatus(task.id, st),
      strong: st === primaryStatus,
    })),
    { label: "編集", onSelect: handleStartEdit },
    ...(onMoveUp ? [{ label: "上へ", onSelect: onMoveUp }] : []),
    ...(onMoveDown ? [{ label: "下へ", onSelect: onMoveDown }] : []),
    { label: "削除", onSelect: () => deleteTask(task.id), danger: true },
  ];

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

  const titleClass = `block select-none jp-text font-medium leading-snug ${
    task.status === "DONE" ? "text-muted line-through" : ""
  }`;

  return (
    <div
      id={`card-${task.id}`}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={(e) => onDragEnd(e, task.id)}
      className={
        compact
          ? "group cursor-grab border-b border-rule transition-colors duration-[var(--dur-micro)] hover:bg-accent-soft active:cursor-grabbing"
          : "group cursor-grab border-2 border-ink bg-plate transition-shadow duration-[var(--dur-micro)] hover:shadow-card-hover active:cursor-grabbing shadow-card"
      }
    >
      {isEditing ? (
        editor
      ) : compact ? (
        // 広い画面では、上の3列と同じ位置に項目をそろえる（タイトル / カテゴリ / 日時と「⋯」）。
        <div className="flex items-center gap-x-4 gap-y-1 py-1 pl-1 pr-1 lg:grid lg:grid-cols-3 lg:gap-x-[var(--gap-columns)]">
          <span onDoubleClick={handleStartEdit} className={`${titleClass} min-w-0 flex-1 text-sm lg:flex-none`}>
            {task.title}
          </span>
          <span className="shrink-0 text-xs text-muted">{categoryControl}</span>
          <span className="flex shrink-0 items-center gap-3 text-xs text-muted lg:justify-between">
            <span className="num hidden sm:inline">{formatDate(task.createdAt)}</span>
            <ActionMenu items={menuItems} />
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule px-4 py-2 text-xs text-muted">
            {categoryControl}
            {staleTag}
            {age && <span className="num">{age}</span>}
            <span className="num ml-auto">{formatDate(task.createdAt)}</span>
          </div>
          <div className="flex items-start gap-2 py-3 pl-4 pr-2">
            <span onDoubleClick={handleStartEdit} className={`${titleClass} min-w-0 flex-1 pt-1 text-base`}>
              {task.title}
            </span>
            <ActionMenu items={menuItems} />
          </div>
        </>
      )}
    </div>
  );
}
