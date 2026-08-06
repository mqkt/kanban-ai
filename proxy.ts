import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isRateLimited } from "@/lib/rateLimit";

const protectedPrefixes = ["/app", "/api/tasks", "/api/classify", "/api/triage"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/login", request.url);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/app/:path*", "/api/tasks/:path*", "/api/classify", "/api/triage"],
};
