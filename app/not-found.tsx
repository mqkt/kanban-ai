import Link from "next/link";
import SiteBar from "./components/SiteBar";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteBar />
      <div className="mx-auto max-w-sm px-5 pt-24">
        <h1 className="text-3xl">ページが見つかりません</h1>
        <Link href="/" className="key mt-8 no-underline">
          ボードに戻る
        </Link>
      </div>
    </main>
  );
}
