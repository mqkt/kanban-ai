"use client";

import { useEffect, useRef, useState } from "react";

export type ActionItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  // 「いま一番自然な1手」。他の項目より太く出す。
  strong?: boolean;
};

// カードの「⋯」メニュー。たまにしか使わない操作をここに畳み、カードの上には出さない。
// ブラウザ標準のメニューではなく、サイトの見た目で描く。
export default function ActionMenu({ items, label = "操作" }: { items: ActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // 画面の下端に収まらないときは、上向きに開く。開く瞬間に、項目数から高さを見積もって決める。
  const [up, setUp] = useState(false);

  const toggle = () => {
    if (!open) {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) {
        const touch = typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches;
        const menuHeight = items.length * (touch ? 44 : 36) + 8;
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        setUp(menuHeight > spaceBelow && spaceAbove > spaceBelow);
      }
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const focusSibling = (el: HTMLElement, dir: 1 | -1) => {
    const list = el.closest('[role="menu"]');
    const buttons = list ? Array.from(list.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
    const i = buttons.indexOf(el);
    buttons[(i + dir + buttons.length) % buttons.length]?.focus();
  };

  if (items.length === 0) return null;

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
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
        className="link-quiet !mx-0 inline-flex min-h-9 min-w-9 items-center justify-center px-0 [@media(hover:none)]:min-h-11 [@media(hover:none)]:min-w-11"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className={`absolute right-0 z-[var(--z-dropdown)] max-h-[70vh] min-w-32 overflow-y-auto border-2 border-ink bg-plate text-sm ${
            up ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {items.map((item) => (
            <li key={item.label} role="presentation">
              <button
                type="button"
                role="menuitem"
                autoFocus={item === items[0]}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
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
                  item.danger ? "border-t border-rule text-error" : ""
                } ${item.strong ? "font-medium" : ""}`}
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
