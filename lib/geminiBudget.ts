import { CLASSIFY_MODEL, DUPLICATE_MODEL } from "./constants";

// ユーザー単位の制限（ゲストのaiUsageCount等）だけでは、Gemini無料枠という
// 「アプリ全体で共有された1日あたりの資源」は守れない。ログイン済みユーザーには
// ユーザー単位の上限が無く、かつゲストは「ゲストで試す」を押し直すたびに新しい
// 使い捨てアカウント（＝新しいaiUsageCount）を得られるため、複数ユーザーが束になる、
// あるいは1人がproxy.tsの汎用レートリミット（1分60回）のペースで叩き続けるだけで
// 1日の無料枠（Lite系モデルで500 RPD）を数分〜十数分で使い切れてしまう。
// そこで、ユーザーに関わらず「モデルごとにアプリ全体で1日に呼べる回数」自体にも
// 上限を設ける。Cloud Runが複数インスタンスに増えるとインスタンスごとに別カウンタに
// なる（lib/rateLimit.tsと同じ限界）が、それでも「誰か1人が無制限に呼べる」状態より
// 安全側に倒せる。

type Counter = {
  count: number;
  windowStart: number;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

// 実際の無料枠（500 RPD）より低く設定し、日付境界のずれや他ユーザーの通常利用分の
// 余地を残している。
const DAILY_LIMITS: Record<string, number> = {
  [CLASSIFY_MODEL]: 450,
  [DUPLICATE_MODEL]: 450,
};

const counters = new Map<string, Counter>();

// 呼び出せるなら内部カウンタを消費してtrueを返す。上限に達していればfalse
// （消費しない）。未知のモデル名は対象外として通す（誤ブロックより安全側）。
export function reserveGeminiCall(model: string): boolean {
  const limit = DAILY_LIMITS[model];
  if (!limit) return true;

  const now = Date.now();
  const counter = counters.get(model);

  if (!counter || now - counter.windowStart >= WINDOW_MS) {
    counters.set(model, { count: 1, windowStart: now });
    return true;
  }

  if (counter.count >= limit) {
    return false;
  }

  counter.count += 1;
  return true;
}
