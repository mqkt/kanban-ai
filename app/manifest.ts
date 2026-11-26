import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/themeColor";

// ホーム画面に追加したときの名前・アイコン・色。色はアイコンと同じ墨と紙の2色に揃える。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kanban Dashboard",
    short_name: "Kanban",
    description: "カテゴリはAIが付け、重複もAIが探すタスクボード。",
    start_url: "/",
    display: "standalone",
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.light,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
