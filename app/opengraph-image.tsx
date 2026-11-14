import { ImageResponse } from "next/og";

export const alt = "Kanban Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f6f3ee";
const INK = "#171513";
const SIGNAL = "#b4512f";
const MUTED = "#6b665e";

// 日本語フォントを同梱していないため、画像内の文字は英語のみにしている。
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: PAPER,
          color: INK,
        }}
      >
        <div style={{ fontSize: 28, color: SIGNAL, fontWeight: 700 }}>AI-assisted task board</div>
        <div style={{ fontSize: 96, fontWeight: 800, marginTop: 16 }}>Kanban Dashboard</div>
        <div style={{ fontSize: 34, color: MUTED, marginTop: 24 }}>
          Auto-categorize tasks with Gemini. Detect duplicates.
        </div>
      </div>
    ),
    size,
  );
}
