"use client";

import { LaneConfig, Task, TaskStatus } from "../types/kanban";
import { HelpCircle } from "lucide-react";
import TaskCard from "./TaskCard";

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * 「未着手」「進行中」「完了」の3つの列（レーン）は、役割やデザインが共通しています。
 * 同じUIの仕組み（ドラッグを受け入れる領域、タスクカードを並べる構造など）を何度も重複して書くと、
 * 後でデザインや仕様を変更するときに3箇所すべて修正せねばならず、バグの原因になります。
 * このファイルを1つの「金型（共通コンポーネント）」として定義することで、
 * 親コンポーネント（page.tsx）からは異なる設定（タイトルや色）を渡すだけで3つの異なるレーンを
 * 安全かつ簡単に量産できるようになります。
 *
 * ==========================================
 * 【何を担当するか】
 * ==========================================
 * 以下のUI表示とイベント制御を担当します：
 * 1. レーンヘッダー（アイコン、タイトル、そのレーンに含まれるタスク数バッジ）の表示。
 * 2. このレーンに割り振られたタスクカード（TaskCard）をリスト形式で並べる描画。
 * 3. タスクが0件のときに「ここにドロップしてください」という空のガイドメッセージを表示。
 * 4. レーン自体に対するドラッグオーバー（侵入）、ドラッグリーブ（離脱）、ドロップイベントの中継。
 * 
 * ==========================================
 * 【Propsの意味】
 * ==========================================
 * 親コンポーネントからこのレーン専用の設定やデータを受け取ります。
 * - `lane` (LaneConfig):
 *     レーンの表示用設定（ID、日本語タイトル、テーマカラー用のCSSクラス群、ヘッダーに置くLucideアイコンなど）。
 * - `tasks` (Task[]):
 *     このレーンのステータス（TODOなど）に完全に合致するタスクだけの配列。
 * - `isDraggedOver` (boolean):
 *     現在このレーンの上にカードがドラッグされた状態で浮かんでいるかどうか。true の場合、レーンの背景を光らせるデザインに変更します。
 * - `onDragOver` ((e: React.DragEvent, id: TaskStatus) => void):
 *     カードがこのレーンの上に重なっているときに呼び出す関数。ブラウザのデフォルトドロップ拒否挙動をキャンセルするために必要。
 * - `onDragLeave` ((e: React.DragEvent) => void):
 *     カードがこのレーンから外れたときに呼び出す関数。ハイライトを消すために必要。
 * - `onDrop` ((e: React.DragEvent, id: TaskStatus) => void):
 *     カードがこのレーン上に落とされたときに呼び出す関数。タスクのステータスが更新されます。
 * - タスク操作系（`deleteTask`, `updateTaskStatus`, `editTaskTitle`）およびカードドラッグイベント（`onDragStart`, `onDragEnd`）:
 *     これらはすべて、この下層にある個々の「タスクカード（TaskCard）」へそのまま流し込むためのPropsです（これを「Propsのバケツリレー」と呼びます）。
 *
 * ==========================================
 * 【State（内部状態）の役割】
 * ==========================================
 * ※ このコンポーネントも、受け取ったPropsを描画し、イベントを親に伝える役割に徹するため、内部Stateを持ちません。
 */

interface KanbanLaneProps {
  lane: LaneConfig;
  tasks: Task[];
  isDraggedOver: boolean;
  onDragOver: (e: React.DragEvent, laneId: TaskStatus) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, laneId: TaskStatus) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, newStatus: TaskStatus) => void;
  editTaskTitle: (id: string, newTitle: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent, id: string) => void;
}

export default function KanbanLane({
  lane,
  tasks,
  isDraggedOver,
  onDragOver,
  onDragLeave,
  onDrop,
  deleteTask,
  updateTaskStatus,
  editTaskTitle,
  onDragStart,
  onDragEnd,
}: KanbanLaneProps) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, lane.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, lane.id)}
      className={`lane-box ${
        isDraggedOver
          ? "ring-2 ring-blue-500/30 border-blue-500 bg-blue-50/10 dark:bg-blue-950/10 scale-[1.005]"
          : ""
      }`}
    >
      {/* レーンヘッダー */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-850/60 bg-white/20 dark:bg-slate-900/10">
        <div className="flex items-center gap-2.5">
          {lane.icon}
          <h2 className="font-extrabold text-sm sm:text-base tracking-wide uppercase text-slate-700 dark:text-slate-200">
            {lane.title}
          </h2>
        </div>
        {/* レーン内のタスク数カウンター */}
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm ${lane.accentClass}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* タスクリスト表示エリア */}
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto max-h-[650px]">
        {tasks.length === 0 ? (
          // タスクが0件のときに表示するメッセージ（条件分岐レンダリング）
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800/40 rounded-xl bg-white/20 dark:bg-slate-900/10">
            <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 text-center font-medium">
              ここにカードをドロップするか
              <br />
              タスクを追加してください
            </p>
          </div>
        ) : (
          // タスクカードのループ展開
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              deleteTask={deleteTask}
              updateTaskStatus={updateTaskStatus}
              editTaskTitle={editTaskTitle}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}
