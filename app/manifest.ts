import type { MetadataRoute } from "next";

// ホーム画面に追加したときの名前・アイコン・色。色はアイコンと同じ墨と紙の2色に揃える。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kanban Dashboard",
    short_name: "Kanban",
    description: "カテゴリはAIが付け、重複もAIが探すタスクボード。",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#f4f1ea",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
