import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Cloud Run のヘルスチェック / 監視外形監視から叩かれる想定。
// DB疎通まで確認することで、「プロセスは生きているがDBに繋がらない」状態も検知できる。
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("Health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
