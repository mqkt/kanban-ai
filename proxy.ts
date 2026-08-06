import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isRateLimited } from "@/lib/rateLimit";

const protectedPrefixes = ["/api/tasks", "/api/classify", "/api/triage"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 旧 /app ルートへの古いブックマーク・リンク向けの互換リダイレクト。
  // ボードは「/」に統合され、認証状態に応じた出し分けはページ側で行う。
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    // Cloud Run の前段（Google Front End）は、リクエストが実際に来た接続元IPを
    // X-Forwarded-For の末尾に追記する。先頭側の値はクライアントが自由に偽装できるため、
    // 信頼できるプロキシ（GFE）が付与した末尾の値だけを使う。
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",").pop()?.trim() || "unknown";
    if (isRateLimited(`${ip}:${pathname}`)) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 }
      );
    }
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  // protectedPrefixes は現在すべて /api/ 配下なので、常にJSONで401を返す
  // （ページ遷移としてログイン画面へリダイレクトする必要はない）。
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: ["/app/:path*", "/api/tasks/:path*", "/api/classify", "/api/triage"],
};
