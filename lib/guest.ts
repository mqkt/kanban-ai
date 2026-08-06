// ポートフォリオ用ゲストアカウントの共通設定。
// ゲストは訪問者ごとに使い捨てユーザーを発行して隔離し、期限切れで自動削除する。
export const GUEST_EMAIL_DOMAIN = "demo.local";

// ゲストアカウントの有効期間（この時間を過ぎたらクリーンアップ対象）。
export const GUEST_TTL_MS = 24 * 60 * 60 * 1000; // 24時間

// 1ゲストあたりのAI分類の利用上限（Geminiの課金・悪用対策）。
export const GUEST_AI_LIMIT = 20;

export function isGuestEmail(email?: string | null) {
  return Boolean(email && email.endsWith(`@${GUEST_EMAIL_DOMAIN}`));
}
