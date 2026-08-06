// プロセス内メモリでの固定ウィンドウ・レートリミット。
// Cloud Run はインスタンスが複数に増える可能性があり、その場合インスタンスごとに
// 別カウンタになるため「合計で見ると設定値の何倍かまで許容してしまう」という限界がある。
// Redis等の外部ストアを使えば解決できるが、このアプリの規模では追加のインフラ・運用コストに
// 見合わないと判断し、まずは単純なインメモリ実装で悪用の大部分（単一クライアントからの連打）を
// 防ぐことを優先した。
type Bucket = {
  count: number;
  windowStart: number;
};

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;
const MAX_TRACKED_KEYS = 10_000;

const buckets = new Map<string, Bucket>();

// Mapは挿入順を保持するため、上限超過時は「最も古く追加されたキー」から間引く（FIFO）。
// キー数に応じたO(1)の追い出しのみで済み、フラッド中に全件をスキャンするような
// 高コストな処理を避けられる（キー種別が単一クライアントからの大量偽装アクセスで
// 急増しても、メモリ使用量はMAX_TRACKED_KEYSで頭打ちになる）。
function evictOldestIfOverCapacity() {
  while (buckets.size > MAX_TRACKED_KEYS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey === undefined) break;
    buckets.delete(oldestKey);
  }
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    evictOldestIfOverCapacity();
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}
