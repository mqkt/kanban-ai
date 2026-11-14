import type { Metadata } from "next";
import { Syne, Onest, JetBrains_Mono, Zen_Kaku_Gothic_New } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: "700", display: "swap" });
const onest = Onest({ variable: "--font-onest", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const jbmono = JetBrains_Mono({ variable: "--font-jbmono", subsets: ["latin"], weight: "500", display: "swap" });
const jp = Zen_Kaku_Gothic_New({ variable: "--font-jp", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: "Kanban Dashboard",
  description: "カテゴリはAIが付け、重複もAIが探すタスクボード。",
  openGraph: {
    title: "Kanban Dashboard",
    description: "カテゴリはAIが付け、重複もAIが探すタスクボード。",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${syne.variable} ${onest.variable} ${jbmono.variable} ${jp.variable}`}
    >
      <head>
        {/* ページ描画前にダークモードを適用してフラッシュを防ぐ */}
        {/* ブラウザはXSS対策でnonce属性をDOM上から読めなくする（getAttributeが空文字を返す）ため、
            SSRの実値とハイドレーション時の見た目上の値が食い違い、Reactが誤検知の警告を出す。実害はない。 */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
