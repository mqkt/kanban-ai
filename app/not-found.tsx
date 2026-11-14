import Link from "next/link";
import SiteBar from "./components/SiteBar";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteBar />
      <div className="mx-auto w-full max-w-[var(--container)] px-[var(--gutter)] pt-16 pb-24">
        <p aria-hidden="true" className="font-display text-[8rem] leading-none sm:text-[12rem]">
          404
        </p>
        <h1 className="jp-text mt-6 text-4xl">ページが見つかりません</h1>
        <Link href="/" className="key mt-8 no-underline">
          ボードに戻る
        </Link>
      </div>
    </main>
  );
}
