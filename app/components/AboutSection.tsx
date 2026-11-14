import Link from "next/link";

export default function AboutSection() {
  return (
    <footer className="mx-auto mt-8 w-full max-w-[var(--container)] px-[var(--gutter)] pb-8 text-[13px] text-muted">
      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t border-rule pt-4">
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-ink">
            プライバシーポリシー
          </Link>
        </nav>
      </div>
    </footer>
  );
}
