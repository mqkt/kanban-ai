"use client";

import { Plus, Sparkles } from "lucide-react";

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * タスクを入力し、ボードに追加するための「インプット領域」を1つのコンポーネントとして抽出するためです。
 * フォーム要素はユーザーによる文字入力のたびに再描画（レンダリング）が走ります。
 * これをメインページ全体と一緒くたにしておくと、文字を入力するたびにボード全体が再計算されてしまい、
 * パフォーマンス（軽快さ）に悪影響を及ぼす可能性があります。
 * フォームとして切り分けることで、影響範囲を限定し、コードもすっきりさせます。
 *
 * ==========================================
 * 【何を担当するか】
 * ==========================================
 * 以下のUI表示とイベントトリガーを担当します：
 * 1. テキスト入力エリア（Input）の表示と、入力テキストの同期。
 * 2. 入力がある時に常に押せる「タスクを追加」ボタンの表示。
 * 3. AIによる追加後自動分類を予告するアシストメッセージの表示。
 * 4. フォーム送信（Submit）のトリガー。
 *
 * ==========================================
 * 【Propsの意味】
 * ==========================================
 * - `inputValue` (string):
 *     現在テキストボックスに入力されているテキストの内容。
 * - `setInputValue` ((val: string) => void):
 *     ユーザーが文字を入力した際に呼び出し、親のStateに入力値を伝えるための関数。
 * - `onSubmit` ((e: React.FormEvent) => void):
 *     ユーザーが送信（Enter押下や追加ボタンクリック）した際に呼び出すタスク追加処理の実行関数。
 */

interface TaskFormProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function TaskForm({
  inputValue,
  setInputValue,
  onSubmit,
}: TaskFormProps) {
  return (
    <section className="panel-card p-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        
        {/* メイン行：タイトル入力と追加ボタン */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* 入力テキストボックスコンテナ */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="新しく取り組むべきタスクを入力してください..."
              className="input-clean pl-11"
            />
            {/* テキストボックス内の左側アイコン */}
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>

          {/* タスクを追加するボタン */}
          <button
            type="submit"
            disabled={!inputValue.trim()} // 入力が空の場合はボタンを無効化
            className="btn-action-primary min-w-[140px]"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span>タスクを追加</span>
          </button>
        </div>

        {/* AI自動分類の予告アシストメッセージ */}
        <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-blue-500/85 dark:text-blue-400/85 select-none">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
          <span>タスク追加後に、AIがカテゴリと所要時間を自動的に推定します</span>
        </div>
      </form>
    </section>
  );
}
