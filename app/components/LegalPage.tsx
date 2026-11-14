import Link from "next/link";
import SiteBar from "./SiteBar";

// プライバシーポリシーのページ枠。
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteBar />
      <article className="mx-auto max-w-xl px-5 py-12">
        <Link href="/" className="link-quiet text-sm">
          戻る
        </Link>
        <h1 className="mt-8 text-3xl">{title}</h1>
        <p className="num mt-3 text-[13px] text-muted">最終更新 {updated}</p>
        <div className="mt-8 flex flex-col gap-6 border-t border-ink pt-6 text-[15px] leading-7 [&_h2]:mb-1 [&_h2]:text-lg [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </main>
  );
}
