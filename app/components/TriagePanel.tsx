"use client";

import { Copy, Loader2, Merge, X } from "lucide-react";
import { Task } from "../types/kanban";
import { TriageSuggestion } from "../hooks/useTriage";

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * 「GitHubで人生を管理する」動画で紹介されている運用手法の1つ、
 * 「溜まったタスクの中から重複・統合できそうなものをAIに整理させる（トリアージ）」を
 * 再現するUIです。定期実行や自動マージは行わず、ボタンを押した時だけAIに判断させ、
 * 提案された組み合わせは1件ずつ「統合する」か「無視する」かをユーザー自身が選びます。
 *
 * ==========================================
 * 【Propsの意味】
 * ==========================================
 * - `tasks` (Task[]): 提案に含まれるタスクIDからタイトルを逆引きするために使う。
 * - `suggestions` / `isRunning` / `error` / `hasRun`: useTriageフックの状態そのもの。
 * - `onRun`: 「重複をチェック」ボタン押下時にAI呼び出しを実行する関数。
 * - `onDismiss`: ある提案を「無視」して一覧から消す関数。
 * - `onMerge`: ある提案を実際に統合（1件を残して残りを削除）する関数。
 */

interface TriagePanelProps {
  tasks: Task[];
  suggestions: TriageSuggestion[];
  isRunning: boolean;
  error: string | null;
  hasRun: boolean;
  onRun: () => void;
  onDismiss: (index: number) => void;
  onMerge: (index: number) => void;
}

export default function TriagePanel({
  tasks,
  suggestions,
  isRunning,
  error,
  hasRun,
  onRun,
  onDismiss,
  onMerge,
}: TriagePanelProps) {
  const titleFor = (taskId: string) =>
    tasks.find((task) => task.id === taskId)?.title ?? "（削除済み）";

  return (
    <section className="panel-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              重複タスクのチェック
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              AIが未完了タスクの中から重複・統合できそうな組み合わせを提案します（実行するとGemini
              APIを1回呼び出します）
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className="btn-action-secondary flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {isRunning ? "確認中..." : "重複をチェック"}
        </button>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {hasRun && !isRunning && suggestions.length === 0 && !error && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          重複・統合できそうなタスクは見つかりませんでした。
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.taskIds.join("-")}-${index}`}
              className="rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 flex flex-col gap-2"
            >
              <ul className="text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
                {suggestion.taskIds.map((taskId) => (
                  <li key={taskId} className="break-all">
                    {titleFor(taskId)}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {suggestion.reason}
              </p>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                統合後のタイトル案: 「{suggestion.suggestedTitle}」
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => onDismiss(index)}
                  className="p-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  無視する
                </button>
                <button
                  type="button"
                  onClick={() => onMerge(index)}
                  className="p-1.5 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                >
                  <Merge className="w-3.5 h-3.5" />
                  統合する
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
