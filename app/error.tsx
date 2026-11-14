"use client";

import SiteBar from "./components/SiteBar";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteBar />
      <div className="mx-auto w-full max-w-[var(--container)] px-[var(--gutter)] pt-16 pb-24">
        <h1 className="jp-text text-5xl">エラーが起きました</h1>
        <p className="mt-4 text-base text-muted">もう一度試してください。</p>
        <button type="button" onClick={reset} className="key mt-8">
          もう一度試す
        </button>
      </div>
    </main>
  );
}
