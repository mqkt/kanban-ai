import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// タイミング攻撃対策として、文字列の長さが一致する場合のみ定数時間で比較する
// （長さそのものは秘密情報ではないため、長さ不一致を早期returnしても情報漏洩にはならない）。
function isValidBearerToken(authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// 期限切れのゲストユーザーを削除する。Task は onDelete: Cascade で一緒に消える。
// Cloud Scheduler / GitHub Actions の cron から定期的に叩く想定。
// CRON_SECRET による Bearer 認証で保護する（middleware の対象外パス）。
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!isValidBearerToken(authHeader, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.user.deleteMany({
    where: { guestExpiresAt: { lt: new Date() } },
  });

  return NextResponse.json({ deleted: result.count });
}
