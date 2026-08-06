import * as Sentry from "@sentry/nextjs";

// SENTRY_DSN が未設定の場合は何もしない（Sentryアカウント未発行でもビルド・デプロイが壊れないようにする）。
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
