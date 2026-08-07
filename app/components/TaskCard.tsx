"use client";

import { useEffect, useState } from "react";
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_ORDER } from "../types/kanban";
import { STALE_THRESHOLD_MS } from "@/lib/constants";
import { TASK_CATEGORIES } from "@/lib/validation/task";
import {
  Trash2,
  Edit2,
  X,
  Save,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Tag,
  Loader2,
  Flag,
  AlertTriangle,
} from "lucide-react";

// カテゴリに応じた美しいバッジ用のカラースタイルを取得する関数
const getCategoryStyles = (category: string) => {
  switch (category) {
    case "仕事":
      return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30";
    case "勉強":
      return "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30";
    case "家事":
      return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30";
    case "趣味":
      return "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30";
    default:
      return "bg-slate-50 text-slate-650 dark:bg-slate-900 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/80";
  }
};

// 優先度に応じたバッジ用のカラースタイルを取得する関数
const getPriorityStyles = (priority: string) => {
  switch (priority) {
    case "高":
      return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200/50 dark:border-red-900/30";
    case "中":
      return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30";
    default:
      return "bg-slate-50 text-slate-650 dark:bg-slate-900 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/80";
  }
};

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * かんばんボードの最小構成要素である「タスクカード」を、完全にカプセル化（独立）するためです。
 * 1つのカードは、自分自身が「編集モードに入っているか」「編集中にどんな文字を入力したか」といった
 * カード固有のミクロな情報（ローカルな状態）を持つ必要があります。
 * これを親コンポーネントでまとめて管理すると、1つのカードを編集するだけでボード上の他のカードまで
 * 無駄に影響を受けてしまうなど、コードが非常に複雑になります。
 * カード自身に知性（State）を持たせることで、自己完結する優れたコンポーネントに仕上がります。
 *
 * ==========================================
 * 【何を担当するか】
 * ==========================================
 * 以下のUI描画とミクロなインタラクションを担当します：
 * 1. 通常状態のタスクタイトル、作成日時のフォーマット表示。
 * 2. ダブルクリックまたは編集アイコンクリックによる「インライン編集モード」の制御。
 * 3. 編集中のバリデーション（空の場合は自動削除など）と、保存/キャンセル処理。
 * 4. スマートフォン等で便利な「クイックレーン移動ボタン（矢印）」の表示とイベント発火。
 * 5. HTML5ドラッグ開始（`onDragStart`）とドラッグ終了（`onDragEnd`）のイベント設定。
 *
 * ==========================================
 * 【Propsの意味】
 * ==========================================
 * 親コンポーネントからこのカードを描画するために必要なデータと、ボード全体のデータを操作する関数を受け取ります。
 * - `task` (Task):
 *     このカードに表示するタスクのオブジェクト（id, title, status, createdAt）。
 * - `deleteTask` ((id: string) => void):
 *     カードを削除するときに親のタスクリストからこのタスクを除外するための関数。
 * - `updateTaskStatus` ((id: string, status: TaskStatus) => void):
 *     クイック移動矢印ボタンを押した際、ステータス（レーン）を変更する関数。
 * - `editTaskTitle` ((id: string, title: string) => void):
 *     編集が完了し、「保存」を押したときに親のタスクのタイトルを確定させる関数。
 * - `onDragStart` ((e: React.DragEvent, id: string) => void):
 *     ユーザーがこのカードのドラッグを始めた時に親に通知するイベントハンドラ。
 * - `onDragEnd` ((e: React.DragEvent, id: string) => void):
 *     ユーザーがドラッグを終了した時に親に通知するイベントハンドラ。
 *
 * ==========================================
 * 【State（内部状態）の役割】
 * ==========================================
 * このコンポーネントは、カード独自の動きを管理するために2つのStateを持っています。
 * - `isEditing` (boolean):
 *     このカードが現在「編集モード」になっているかどうか。真（true）なら入力ボックスを表示し、偽（false）ならタイトルテキストを表示します。
 * - `editingTitle` (string):
 *     編集テキストエリアに入力されている一時的なテキスト。保存ボタンを押すまでは親のデータには反映されず、このカードのState内に留まります。
 */

interface TaskCardProps {
  task: Task;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTaskCategory: (id: string, category: string | null) => void;
  editTaskTitle: (id: string, title: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent, id: string) => void;
}

export default function TaskCard({
  task,
  deleteTask,
  updateTaskStatus,
  updateTaskCategory,
  editTaskTitle,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  // --- 内部状態（State） ---
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");

  // --- 編集の開始 ---
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditingTitle(task.title); // テキストエリアに現在のタイトルを初期値としてセット
  };

  // --- 編集の保存 ---
  const handleSaveEdit = () => {
    editTaskTitle(task.id, editingTitle);
    setIsEditing(false);
  };

  // --- 編集のキャンセル ---
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTitle("");
  };

  // --- ミリ秒タイムスタンプを人間が見やすい日時に変換するヘルパー関数 ---
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  // Date.now() はレンダー中に直接呼べない（純粋性ルール）ため、useStateの遅延初期化子として
  // マウント時に取得し、以降は1時間ごとにタイマーで更新する。マウント時の一度きりの取得だと、
  // タブを開きっぱなしにしたまま日をまたいでも停滞判定が更新されないため。
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 完了タスクは「停滞」ではないので対象外。updatedAtが無い（古いデータ）場合も対象外。
  const isStale =
    task.status !== "DONE" &&
    task.updatedAt !== undefined &&
    now - task.updatedAt > STALE_THRESHOLD_MS;

  const currentStatusIndex = TASK_STATUS_ORDER.indexOf(task.status);
  const previousStatus =
    currentStatusIndex > 0 ? TASK_STATUS_ORDER[currentStatusIndex - 1] : null;
  const nextStatus =
    currentStatusIndex !== -1 && currentStatusIndex < TASK_STATUS_ORDER.length - 1
      ? TASK_STATUS_ORDER[currentStatusIndex + 1]
      : null;

  return (
    <div
      id={`card-${task.id}`}
      draggable={!isEditing} // 編集中の時はドラッグできないように制御
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={(e) => onDragEnd(e, task.id)}
      className={`group task-card-clean ${
        isEditing ? "ring-2 ring-blue-500 border-transparent shadow-md" : ""
      }`}
    >
      {/* 編集モードか通常モードかでUI表示を切り替える（条件分岐レンダリング） */}
      {isEditing ? (
        <div className="flex flex-col gap-2">
          {/* 編集用入力フォーム */}
          <textarea
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // 改行を防ぐ
                handleSaveEdit();
              } else if (e.key === "Escape") {
                handleCancelEdit();
              }
            }}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-700 dark:text-slate-200 resize-none min-h-[60px]"
            autoFocus
            placeholder="タスクのタイトル..."
          />
          {/* 保存・キャンセルボタン */}
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="キャンセル"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
              title="保存 (Enter)"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          {/* タイトルテキスト表示 (ダブルクリックでも編集モードに入れます) */}
          <span
            onDoubleClick={handleStartEdit}
            className={`text-sm font-semibold tracking-wide leading-relaxed select-none break-all flex-1 text-slate-700 dark:text-slate-200 ${
              task.status === "DONE"
                ? "text-slate-450 dark:text-slate-550 line-through font-normal"
                : ""
            }`}
            title="ダブルクリックで編集"
          >
            {task.title}
          </span>

          {/* 右上の編集・削除クイックメニュー。マウス操作ではホバー時のみ表示して見た目をすっきりさせるが、
              タッチデバイス（hover状態を持たない）では常時表示にする。ホバー不可の判定には
              ビューポート幅ではなく `(hover: none)` メディア特性を使い、タッチ対応の大画面端末も
              正しく「常時表示」側に倒す。 */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200 flex-shrink-0">
            <button
              onClick={handleStartEdit}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="編集"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`「${task.title}」を削除しますか？`)) {
                  deleteTask(task.id);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
              title="削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* カテゴリ・優先度タグの表示 */}
      <div className="flex flex-wrap gap-1.5 items-center select-none pt-1">
        {task.error ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border bg-red-50/60 text-red-600 dark:bg-red-950/20 dark:text-red-400 border-red-200/50 dark:border-red-900/30"
            title={typeof task.error === "string" ? task.error : "AI分析に失敗しました"}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span>⚠️ AI分析エラー</span>
          </span>
        ) : task.isClassifying ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
            <span>🤖 AI分析中...</span>
          </span>
        ) : (
          <>
            {/* カテゴリはAIが自動分類するだけでなく、ここで手動でも変更できる。
                自由入力ではなくTASK_CATEGORIESの固定選択肢にすることで、絞り込み・色分けと
                整合させている（表記ゆれで同じ意味のカテゴリが増えるのを防ぐ）。 */}
            <span className={`inline-flex items-center gap-1 text-xs font-bold pl-2 pr-1 py-0.5 rounded-md border transition-colors ${getCategoryStyles(task.category ?? "")}`}>
              <Tag className="w-3 h-3" />
              <select
                value={task.category ?? ""}
                onChange={(e) => updateTaskCategory(task.id, e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none outline-none cursor-pointer appearance-none pr-0.5"
                title="カテゴリを変更"
                aria-label="カテゴリを変更"
              >
                <option value="">未分類</option>
                {TASK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </span>
            {task.priority && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border transition-colors ${getPriorityStyles(task.priority)}`}>
                <Flag className="w-3 h-3" />
                優先度: {task.priority}
              </span>
            )}
          </>
        )}
        {isStale && (
          <span
            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 border-sky-200/50 dark:border-sky-900/30"
            title="3日以上ステータスが変わっていません"
          >
            <AlertTriangle className="w-3 h-3" />
            停滞中
          </span>
        )}
      </div>

      {/* フッター領域: 日付とクイック移動ボタン */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-850/60 text-[10px] text-slate-400 dark:text-slate-500 select-none">
        
        {/* 作成日時表示 */}
        <span className="flex items-center gap-1 font-medium">
          <Calendar className="w-3 h-3 text-slate-450" />
          {formatDate(task.createdAt)}
        </span>

        {/* クイック移動ボタン（編集モード中は非表示） */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            {/* 左（前）のレーンへ移動できるボタン（先頭レーンでは非表示） */}
            {previousStatus && (
              <button
                onClick={() => updateTaskStatus(task.id, previousStatus)}
                className="p-1 flex items-center gap-0.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 transition-colors duration-250 cursor-pointer"
                title="左のレーンへ移動"
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="text-[9px] font-bold">
                  {TASK_STATUS_LABELS[previousStatus]}
                </span>
              </button>
            )}

            {/* 右（次）のレーンへ移動できるボタン（末尾レーンでは非表示） */}
            {nextStatus && (
              <button
                onClick={() => updateTaskStatus(task.id, nextStatus)}
                className="p-1 flex items-center gap-0.5 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 rounded hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 transition-colors duration-250 cursor-pointer"
                title="右のレーンへ移動"
              >
                <span className="text-[9px] font-bold">
                  {TASK_STATUS_LABELS[nextStatus]}
                </span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
