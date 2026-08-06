// クライアント（app/hooks/useKanban.ts, app/components/TaskCard.tsx）と
// サーバー（app/api/tasks/route.ts）の両方で使う定数。値がずれるとクライアントの
// 警告表示とサーバーの実際の強制ルールが食い違うため、1箇所に集約している。

// 進行中(IN_PROGRESS)レーンに同時に置けるタスク数の上限（WIP制限）。
export const IN_PROGRESS_WIP_LIMIT = 5;

// この期間ステータスが変わっていない未完了タスクを「停滞」とみなす。
export const STALE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
