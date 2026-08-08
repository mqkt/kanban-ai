"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Sun, Moon, Trash2, ListChecks, LogOut, LogIn } from "lucide-react";

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * かんばんボード全体の「看板（タイトル）」や「グローバルな操作ボタン（ダークモード切り替えや一括削除）」を
 * 1つの独立したUI部品（コンポーネント）として管理するためです。
 * 画面の最上部にあるこの領域を他のUIと分けることで、ヘッダーにデザイン修正を入れたい場合に
 * このファイルだけを触れば良くなり、コードの整理整頓が保たれます。
 *
 * ==========================================
 * 【何を担当するか】
 * ==========================================
 * 以下のUI表示とイベントトリガーを担当します：
 * 1. アプリケーションタイトルの表示。
 * 2. 完了タスクが1つ以上ある場合に表示される「完了タスクをクリア」ボタンの描画。
 * 3. 現在のテーマ（ライト/ダーク）に応じたテーマ切り替えボタンの描画。
 *
 * ==========================================
 * 【Propsの意味】
 * ==========================================
 * 親コンポーネント（page.tsx）やフックからデータと処理の指示を受け取ります。
 * - `isDarkMode` (boolean):
 *     現在ダークモードがONかOFFか。これに応じて太陽/月アイコンを切り替えます。
 * - `toggleDarkMode` (() => void):
 *     テーマ切り替えボタンをクリックしたときに呼び出される関数。
 * - `hasCompletedTasks` (boolean):
 *     現在「完了（DONE）」レーンにタスクが存在しているかどうか。存在する時のみ「完了クリア」ボタンを表示します。
 * - `clearCompletedTasks` (() => void):
 *     「完了タスクをクリア」ボタンをクリックしたときに呼び出される一括削除関数。
 * - `isGuest` (boolean):
 *     ゲストセッションかどうか。trueの場合のみ、Google/メールで正式アカウントに
 *     切り替えるための「ログイン」リンクを表示する（自動開始したゲストが
 *     いつでも本登録に移行できるようにするため）。
 *
 * ==========================================
 * 【State（内部状態）の役割】
 * ==========================================
 * ※ このコンポーネントは表示専用の「木構造の末端（プレゼンテーショナルコンポーネント）」であるため、
 * 　 自身で管理するStateを持ちません。すべて親から渡されたPropsだけで動作します。
 */

interface BoardHeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  hasCompletedTasks: boolean;
  clearCompletedTasks: () => void;
  isGuest: boolean;
  userName: string | null;
  userImage: string | null;
}

export default function BoardHeader({
  isDarkMode,
  toggleDarkMode,
  hasCompletedTasks,
  clearCompletedTasks,
  isGuest,
  userName,
  userImage,
}: BoardHeaderProps) {
  return (
    <header className="panel-card px-6 py-6 sm:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* タイトルとサブテキストエリア */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
          <ListChecks className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Kanban Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            タスクのカテゴリをAIが自動判定し、重複タスクの検出もできます。
          </p>
        </div>
      </div>

      {/* 右側のボタンアクションエリア */}
      <div className="flex items-center gap-3 self-end sm:self-center">
        {/* 今どのアカウントでログイン中か常に見えるようにする。ゲストは名前を持たないため
            固定ラベルにし、正式ユーザーはアバター（無ければ頭文字）+ 名前かメールを表示する。 */}
        {isGuest ? (
          <span className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
            ゲスト利用中
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {userImage ? (
              <img
                src={userImage}
                alt=""
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {(userName ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="max-w-[9rem] truncate">{userName ?? "アカウント"}</span>
          </span>
        )}

        {/* 完了タスクが存在する場合のみ、クリアボタンを表示する */}
        {hasCompletedTasks && (
          <button
            onClick={clearCompletedTasks}
            className="btn-action-danger"
          >
            <Trash2 className="w-3.5 h-3.5" />
            完了タスクをクリア
          </button>
        )}

        {/* ゲストの間だけ、正式アカウントへの切り替え導線を表示する */}
        {isGuest && (
          <Link
            href="/login"
            className="btn-action-secondary flex items-center gap-1.5 px-3 text-xs font-semibold"
          >
            <LogIn className="w-4 h-4" />
            ログイン
          </Link>
        )}

        {/* ダークモード切り替えボタン */}
        <button
          onClick={toggleDarkMode}
          className="btn-action-secondary"
          aria-label="テーマを切り替える"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>

        {/* ゲストには「ログアウトすべき永続アカウント」がそもそも存在しない。
            signOutしてもセッションが消えるだけで、`/`への遷移時にAutoGuestStartが
            即座に新しい使い捨てゲストを発行し直すため、実質「今のタスクを黙って
            捨てて別アカウントに切り替わる」ボタンになってしまう。「ログイン」と
            対称に、正式ユーザー（!isGuest）の時だけ表示する。 */}
        {!isGuest && (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="btn-action-secondary"
            aria-label="ログアウト"
            title="ログアウト"
          >
            <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        )}
      </div>
    </header>
  );
}
