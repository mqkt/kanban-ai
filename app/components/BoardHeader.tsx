"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

interface BoardHeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isGuest: boolean;
  userName: string | null;
  userImage: string | null;
}

// アイコンはcurrentColorで描く（ボタンの文字色に追従する）。
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

// ヘッダーは3つだけ: 名前、アカウント（状態の説明とその操作を1組）、設定（テーマ）。
// 広い画面では1行、狭い画面では「名前と設定」「アカウント」の2行にする。
export default function BoardHeader({
  isDarkMode,
  toggleDarkMode,
  isGuest,
  userName,
  userImage,
}: BoardHeaderProps) {
  const accountLabel = isGuest ? (
    <span className="min-w-0 text-sm text-muted [word-break:auto-phrase]">ゲストのデータは24時間で消えます</span>
  ) : (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      {userImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={userImage} alt="" referrerPolicy="no-referrer" className="h-6 w-6 shrink-0 rounded-full" />
      )}
      <span className="max-w-[9rem] truncate">{userName ?? "アカウント"}</span>
    </span>
  );

  // ゲストには永続アカウントが無く、ログアウトは今のタスクを捨てて別のゲストに
  // 切り替わるだけになるため、正式ユーザーにのみ表示する。
  const accountControl = isGuest ? (
    <Link href="/login" className="key min-h-11 shrink-0 whitespace-nowrap no-underline sm:min-h-9">
      保存するにはログイン
    </Link>
  ) : (
    <button onClick={() => signOut({ callbackUrl: "/" })} className="key min-h-11 shrink-0 whitespace-nowrap sm:min-h-9" aria-label="ログアウト">
      ログアウト
    </button>
  );

  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="mx-auto flex w-full max-w-[var(--container)] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-[var(--gutter)] py-2 sm:min-h-14">
        <h1 className="order-1 max-w-none whitespace-nowrap text-xl leading-none">Kanban Dashboard</h1>

        <button
          onClick={toggleDarkMode}
          className="key order-2 min-h-11 min-w-11 px-0 sm:order-3 sm:min-h-9 sm:min-w-9"
          aria-label={isDarkMode ? "ライトに切り替える" : "ダークに切り替える"}
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>

        <div className="order-3 flex w-full items-center justify-between gap-4 sm:order-2 sm:ml-auto sm:w-auto">
          {accountLabel}
          {accountControl}
        </div>
      </div>
    </header>
  );
}
