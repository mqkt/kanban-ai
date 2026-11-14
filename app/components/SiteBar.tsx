import Link from "next/link";

// ボード以外の画面（ログイン・規約・404・エラー）で共通の上部バー。ボードのヘッダーと同じ罫線と幅。
export default function SiteBar() {
  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="mx-auto flex min-h-14 w-full max-w-[var(--container)] items-center px-[var(--gutter)]">
        <Link href="/" className="font-display text-xl font-bold leading-none no-underline">
          Kanban Dashboard
        </Link>
      </div>
    </header>
  );
}
