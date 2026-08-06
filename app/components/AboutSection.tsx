import { Sparkles, GitMerge, Hourglass, Copy } from "lucide-react";

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * 以前は「/」が説明専用のランディングページで、ログイン後に別の「/app」で
 * 実際のボードを触る、という2段構成でした。今はルートを統合し、未ログインでも
 * すぐボードが使える構成にしたため、アプリの説明はボードの下に補足として
 * 残す形にしています（先にボードを触ってもらい、興味があれば読んでもらう）。
 */
const FEATURES = [
  {
    icon: Sparkles,
    title: "AIによる自動分類",
    desc: "タスクを追加すると、Gemini AIがカテゴリと優先度（高・中・低）を自動推定します。",
  },
  {
    icon: Hourglass,
    title: "停滞タスク検知",
    desc: "3日以上ステータスが変わっていないタスクを自動で警告表示します。",
  },
  {
    icon: Copy,
    title: "重複タスクの検出",
    desc: "AIが未完了タスクの中から重複・統合できそうな組み合わせを提案します。",
  },
];

export default function AboutSection() {
  return (
    <section className="panel-card p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          このアプリについて
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Gemini APIを使ったAI分類つきのかんばんボードです。未着手 → 進行中 →
          保留 → 完了の4レーンをドラッグ＆ドロップやボタンで移動でき、タスク管理を
          助ける機能をいくつか備えています。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30 p-3 flex flex-col gap-1.5"
          >
            <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {desc}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-600 flex items-center gap-1.5">
        <GitMerge className="w-3 h-3" />
        ゲストのデータはこの端末のセッションが有効な間だけ保持されます（24時間で自動削除）。
      </p>
    </section>
  );
}
