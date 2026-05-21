"use client";

import { useState } from "react";
import { Task, TaskStatus } from "../types/kanban";
import { Trash2, Edit2, X, Save, ArrowLeft, ArrowRight, Calendar } from "lucide-react";

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
  editTaskTitle: (id: string, title: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent, id: string) => void;
}

export default function TaskCard({
  task,
  deleteTask,
  updateTaskStatus,
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

          {/* 右上の編集・削除クイックメニュー（マウスホバー時に表示が強調されます） */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 flex-shrink-0">
            <button
              onClick={handleStartEdit}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="編集"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
              title="削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
            {/* 左へ移動できるボタン（TODOステータス以外の時に表示） */}
            {task.status !== "TODO" && (
              <button
                onClick={() =>
                  updateTaskStatus(
                    task.id,
                    task.status === "DONE" ? "IN_PROGRESS" : "TODO"
                  )
                }
                className="p-1 flex items-center gap-0.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 transition-colors duration-250 cursor-pointer"
                title="左のレーンへ移動"
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="text-[9px] font-bold">
                  {task.status === "DONE" ? "進行中" : "未着手"}
                </span>
              </button>
            )}
            
            {/* 右へ移動できるボタン（DONEステータス以外の時に表示） */}
            {task.status !== "DONE" && (
              <button
                onClick={() =>
                  updateTaskStatus(
                    task.id,
                    task.status === "TODO" ? "IN_PROGRESS" : "DONE"
                  )
                }
                className="p-1 flex items-center gap-0.5 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 rounded hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 transition-colors duration-250 cursor-pointer"
                title="右のレーンへ移動"
              >
                <span className="text-[9px] font-bold">
                  {task.status === "TODO" ? "進行中" : "完了"}
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
