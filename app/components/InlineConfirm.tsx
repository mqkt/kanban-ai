"use client";

// ブラウザ標準のconfirmの代わりに、その場に出す確認。既定のフォーカスは「やめる」（誤操作を避ける）。
export default function InlineConfirm({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={message}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
    >
      <span className="break-all">{message}</span>
      <button
        type="button"
        onClick={onConfirm}
        className="key min-h-10 border-error text-error hover:bg-error hover:text-paper"
      >
        {confirmLabel}
      </button>
      <button type="button" onClick={onCancel} className="key min-h-10" autoFocus>
        やめる
      </button>
    </div>
  );
}
