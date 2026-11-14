"use client";

// 削除の直後に画面の下へ出す「元に戻す」バー。猶予が過ぎると削除が確定し、バーは消える。
export default function UndoBar({ title, onUndo }: { title: string; onUndo: () => void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-[var(--z-toast)] mx-auto flex w-[min(32rem,calc(100%-2rem))] items-center justify-between gap-4 border-2 border-ink bg-plate px-4 py-2 text-sm shadow-card"
    >
      <span className="min-w-0 truncate">「{title}」を削除しました</span>
      <button type="button" onClick={onUndo} className="key min-h-10 shrink-0">
        元に戻す
      </button>
    </div>
  );
}
