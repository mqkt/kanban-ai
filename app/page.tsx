import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/app");

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: "100dvh",
        background: "#000",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      }}
    >
      {/* ── Nav ── */}
      <nav
        style={{
          background: "rgba(22, 22, 23, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          height: "44px",
          flexShrink: 0,
        }}
        className="flex items-center"
      >
        <div className="mx-auto flex w-full max-w-[1024px] items-center justify-between px-6">
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#f5f5f7" }}>
            Kanban Dashboard
          </span>
          <Link
            href="/login"
            style={{ fontSize: "12px", color: "rgba(245,245,247,0.5)" }}
            className="transition-colors hover:text-white"
          >
            ログイン
          </Link>
        </div>
      </nav>

      {/* ── Main: hero + steps, all in one screen ── */}
      <main
        className="flex flex-1 flex-col items-center justify-center gap-12 px-6 text-center"
        style={{ paddingTop: "24px", paddingBottom: "24px", minHeight: 0 }}
      >
        {/* Hero copy */}
        <div className="flex flex-col items-center gap-4">
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#2997ff", letterSpacing: "-0.2px" }}>
            AI分類つきかんばんボード
          </p>

          <h1
            style={{
              fontSize: "clamp(36px, 5.5vw, 72px)",
              fontWeight: 600,
              lineHeight: 1.07,
              letterSpacing: "-0.28px",
              color: "#f5f5f7",
            }}
          >
            タスクを整理。
            <br />
            <span style={{ color: "#2997ff" }}>AIが補助。</span>
          </h1>

          <p
            style={{
              fontSize: "17px",
              fontWeight: 400,
              lineHeight: 1.47,
              letterSpacing: "-0.374px",
              color: "#6e6e73",
              maxWidth: "440px",
            }}
          >
            タスクを追加するだけで、Gemini AIがカテゴリと優先度を自動推定。
            ドラッグ＆ドロップやボタンでスマートに管理できます。
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <form
              action={async () => {
                "use server";
                await signIn("guest", { redirectTo: "/app" });
              }}
            >
              <button type="submit" className="apple-btn-primary">
                ゲストで試す
              </button>
            </form>

            <Link
              href="/login"
              style={{
                background: "transparent",
                color: "#2997ff",
                borderRadius: "980px",
                padding: "11px 21px",
                fontSize: "17px",
                fontWeight: 400,
                letterSpacing: "-0.374px",
                border: "1px solid rgba(41,151,255,0.4)",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              アカウントでログイン
            </Link>
          </div>
        </div>

        {/* ── 3-step row at bottom ── */}
        <div style={{ width: "100%", maxWidth: "1024px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1px",
              borderRadius: "20px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            {[
              { num: "01", title: "ゲストで試す", desc: "ボタン1つで即スタート。メールも不要。" },
              { num: "02", title: "タスクを追加", desc: "AIがカテゴリと優先度を自動推定。" },
              { num: "03", title: "動かして整理", desc: "未着手 → 進行中 → 保留 → 完了。ドラッグでもボタンでもOK。" },
            ].map((item) => (
              <div
                key={item.num}
                style={{
                  background: "#1d1d1f",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#2997ff", letterSpacing: "-0.12px" }}>
                  {item.num}
                </span>
                <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f5f5f7", lineHeight: 1.3 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "13px", fontWeight: 400, lineHeight: 1.4, color: "#6e6e73" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
