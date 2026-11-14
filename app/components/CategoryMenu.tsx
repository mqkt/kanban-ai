"use client";

import { useEffect, useRef, useState } from "react";

// ブラウザ標準の<select>の代わり。開いたメニューもサイトの見た目で描く。
export default function CategoryMenu({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: readonly string[];
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  const items: { label: string; value: string | null }[] = [
    { label: "未分類", value: null },
    ...options.map((o) => ({ label: o, value: o })),
  ];

  const focusSibling = (el: HTMLElement | null, dir: 1 | -1) => {
    const list = el?.closest('[role="listbox"]');
    const buttons = list ? Array.from(list.querySelectorAll<HTMLElement>('[role="option"]')) : [];
    const i = buttons.indexOf(el as HTMLElement);
    buttons[(i + dir + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="カテゴリを変更"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-1 font-medium text-ink hover:text-muted [@media(hover:none)]:min-h-11"
      >
        {value ?? "未分類"}
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-[var(--z-dropdown)] mt-1 min-w-28 border-2 border-ink bg-plate text-sm shadow-card"
        >
          {items.map((item) => (
            <li key={item.label} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                autoFocus={item.value === value}
                onClick={() => choose(item.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    focusSibling(e.currentTarget, 1);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    focusSibling(e.currentTarget, -1);
                  }
                }}
                className={`flex min-h-9 w-full cursor-pointer items-center px-3 text-left hover:bg-accent-soft [@media(hover:none)]:min-h-11 ${
                  item.value === value ? "font-medium" : ""
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
