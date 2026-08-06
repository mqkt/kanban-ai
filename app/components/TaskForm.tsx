"use client";

import { Plus, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskFormSchema, type TaskFormValues } from "@/lib/validation/task";

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
 * フォームの状態管理・バリデーションは React Hook Form + Zod（zodResolver）に任せている。
 * サーバー側APIも同じ `taskFormSchema` 由来のスキーマで検証しており、フロント/サーバーで
 * 検証ルールの二重定義を避けている。
 *
 * ==========================================
 * 【何を担当するか】
 * ==========================================
 * 以下のUI表示とイベントトリガーを担当します：
 * 1. テキスト入力エリア（Input）の表示と、バリデーションエラーの表示。
 * 2. 入力がある時に常に押せる「タスクを追加」ボタンの表示。
 * 3. AIによる追加後自動分類を予告するアシストメッセージの表示。
 * 4. フォーム送信（Submit）のトリガーと、送信成功時のリセット。
 *
 * ==========================================
 * 【Propsの意味】
 * ==========================================
 * - `onSubmit` ((title: string) => Promise<void>):
 *     バリデーション済みのタイトルでタスク追加処理を実行する関数。
 *     失敗時は例外を投げてもらうことで、入力値を保持したまま再送信できるようにしている。
 * - `isLoading` (boolean):
 *     初期タスク読み込み中かどうか。true の間は送信ボタンを無効化する。
 */

interface TaskFormProps {
  onSubmit: (title: string) => Promise<void>;
  isLoading?: boolean;
}

export default function TaskForm({ onSubmit, isLoading = false }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: "" },
  });

  const onValid = async (values: TaskFormValues) => {
    try {
      await onSubmit(values.title);
      reset();
    } catch {
      // 失敗時は入力値を保持し、ユーザーが編集・再送信できるようにする。
    }
  };

  return (
    <section className="panel-card p-4">
      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3" noValidate>
        {/* メイン行：タイトル入力と追加ボタン */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* 入力テキストボックスコンテナ */}
          <div className="relative flex-1">
            <input
              type="text"
              {...register("title")}
              placeholder="新しいタスクを入力..."
              className="input-clean pl-11"
              aria-invalid={errors.title ? "true" : "false"}
            />
            {/* テキストボックス内の左側アイコン */}
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>

          {/* タスクを追加するボタン */}
          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="btn-action-primary min-w-[140px]"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span>タスクを追加</span>
          </button>
        </div>

        {errors.title && (
          <p className="px-1 text-xs font-semibold text-red-500 dark:text-red-400">
            {errors.title.message}
          </p>
        )}

        {/* AI自動分類の予告アシストメッセージ */}
        <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-blue-500/85 dark:text-blue-400/85 select-none">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
          <span>タスク追加後に、AIがカテゴリと優先度を自動的に推定します</span>
        </div>
      </form>
    </section>
  );
}
