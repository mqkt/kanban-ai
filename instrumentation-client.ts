import * as Sentry from "@sentry/nextjs";

// クライアントに埋め込む値は NEXT_PUBLIC_ プレフィックス必須。DSN自体は機密情報ではない。
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
