import type { classifyResponseSchema } from "./validation/classify";
import type { z } from "zod";

// Gemini分類結果のキャッシュ（同一タイトルへの重複課金・レイテンシを削減する）。
// ユーザーに依存しない結果（同じタスク名なら誰が入力しても同じカテゴリになるべき）
// なので、プロセス内メモリでのTTLキャッシュのみで十分と判断した。
// レートリミット（lib/rateLimit.ts）と同じ理由でインスタンス間では共有されないが、
// キャッシュミス時は単にGeminiを呼び直すだけなので正しさには影響しない。
// キャッシュに入る値は呼び出し側で classifyResponseSchema による検証済みであることが前提。
type ClassifyResult = z.infer<typeof classifyResponseSchema>;

type CacheEntry = {
  data: ClassifyResult;
  expiresAt: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

export function normalizeClassifyKey(title: string): string {
  return title.trim().toLowerCase();
}

export function getCachedClassification(key: string): ClassifyResult | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.data;
}

export function setCachedClassification(key: string, data: ClassifyResult) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// テストでのキャッシュ汚染を避けるためだけに公開している（本番コードからは呼ばない）。
export function __resetClassifyCacheForTests() {
  cache.clear();
}
