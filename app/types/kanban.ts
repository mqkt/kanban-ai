/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * アプリケーション全体で共有されるデータの「構造（ルール）」を1箇所に定義するためです。
 * 開発を進めると、複数のファイルで同じデータ（タスクのデータなど）を扱うことになります。
 * データの形式がファイルごとにバラバラだと、バグ（不具合）の原因になります。
 * TypeScriptの「型定義」を使うことで、エディタがコードの誤りを自動検知してくれるようになり、
 * 安全で堅牢な開発が可能になります。
 *
 * ==========================================
 * 【何を担当するか】
 * ==========================================
 * かんばんボードで使われる「タスクのステータス（レーン）」や「タスクのデータ構造」、
 * 各レーンの背景色やアイコンを制御する「設定情報の構造」などをTypeScriptの型として定義します。
 *
 * ==========================================
 * 【Propsの意味 & Stateの役割】
 * ==========================================
 * ※ このファイルはUIコンポーネントではないため、PropsやStateは持ちません。
 * 　 純粋な「設計図（型定義）」のみを担当します。
 */

// 1. タスクのステータスを表す型
//    TODO: 未着手, IN_PROGRESS: 進行中, PENDING: 保留（他者の返信待ちなど）, DONE: 完了
export type TaskStatus = "TODO" | "IN_PROGRESS" | "PENDING" | "DONE";

// レーンを左から右に並べる順序。クイック移動ボタン（前へ/次へ）や
// WIP制限のチェックなど、ステータスの前後関係が必要な箇所で共通利用する。
export const TASK_STATUS_ORDER: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "PENDING",
  "DONE",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  PENDING: "保留",
  DONE: "完了",
};

// タスクの優先度（Geminiによる自動推定）。
export type TaskPriority = "高" | "中" | "低";

// 2. 1つのタスクカードが持つデータの構造定義
export interface Task {
  id: string;        // タスクを一意に識別するためのユニークなID
  title: string;     // タスクのタイトル（表示名）
  status: TaskStatus;// タスクの現在の状態
  createdAt: number; // タスクが作成された日時（JSONやlocalStorageに安全に保存するため、タイムスタンプ数値で管理）
  updatedAt?: number; // タスクが最後に更新された日時（停滞タスク検知に使用）
  category?: string; // 自動分類されたカテゴリ
  priority?: TaskPriority; // 自動推定された優先度
  isClassifying?: boolean; // AIによる分類処理中を示すフラグ
  error?: string | boolean; // AIによる分類処理のエラー状態
}

// 3. かんばんボードの各レーン（列）の表示設定を管理する構造定義
export interface LaneConfig {
  id: TaskStatus;       // どのステータスに対応するレーンか
  title: string;        // レーンのタイトル（画面表示用）
  accentClass: string;  // タスク数バッジなどのアクセント背景色を指定するTailwindクラス
  icon: React.ReactNode;// レーンヘッダーに表示するLucideアイコンコンポーネント
  wipLimit?: number;     // このレーンに同時に置けるタスク数の上限（未指定なら無制限）
}
