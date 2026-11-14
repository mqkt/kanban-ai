"use client";

import SiteBar from "./components/SiteBar";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteBar />
      <div className="mx-auto max-w-sm px-5 pt-24">
        <h1 className="text-3xl">エラーが起きました</h1>
        <p className="mt-2 text-sm text-muted">もう一度試してください。</p>
        <button type="button" onClick={reset} className="key mt-8">
          もう一度試す
        </button>
      </div>
    </main>
  );
}
