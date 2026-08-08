import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isRateLimited } from "@/lib/rateLimit";

const protectedPrefixes = ["/api/tasks", "/api/classify", "/api/duplicates"];

// nonceベースのCSPを配布する。'unsafe-inline'を使わずインラインscript/styleを許可するため、
// リクエストごとに乱数のnonceを発行し、layout.tsx側のインラインscriptタグに埋め込んで照合する。
function buildCspHeader(nonce: string) {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.googleusercontent.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ページ描画に進む（= layout.tsxがnonceを読んでインラインscriptに埋め込む）レスポンスにのみ、
// x-nonceをリクエストヘッダー経由で伝搬する。redirect/json応答はHTMLを描画しないため対象外。
function next(request: NextRequest, nonce: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCspHeader(nonce));
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
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
    return next(request, nonce);
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

  // getToken() はデフォルトで req.url の先頭 "https://" を見て、Secure Cookie
  // （__Secure- プレフィックス付き）を探すかどうかを自動判定する。Cloud Run は
  // GFE で TLS終端した後コンテナへは平文で転送するため、リクエストによっては
  // この自動判定がずれて401を誤って返すことがある。nextUrl（Forwardedヘッダー
  // 込みで構築される）のプロトコルを明示的に渡して確実に一致させる。
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  if (token) {
    return next(request, nonce);
  }

  // protectedPrefixes は現在すべて /api/ 配下なので、常にJSONで401を返す
  // （ページ遷移としてログイン画面へリダイレクトする必要はない）。
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
