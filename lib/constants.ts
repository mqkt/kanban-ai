// この期間ステータスが変わっていない未完了タスクを「停滞」とみなす。
export const STALE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

// classify/duplicatesで意図的に異なるモデルを使い、Gemini無料枠のレート制限枠を分離している
// （理由はREADME「Gemini APIキーをCloud Run/DBとは別プロジェクトに分離した理由」参照）。
// モデル名を1箇所にまとめ、実際にモデルを呼ぶ箇所と1日あたりの利用上限ガード
// （lib/geminiBudget.ts）の両方で同じ文字列を参照する。
export const CLASSIFY_MODEL = "gemini-3.5-flash-lite";
export const DUPLICATE_MODEL = "gemini-3.1-flash-lite";
