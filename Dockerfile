FROM node:20-alpine AS base

# deps ステージ: 依存関係のインストール
FROM base AS deps
# AlpineでNext.jsを実行する際に必要となる互換ライブラリのインストール
RUN apk add --no-cache libc6-compat
WORKDIR /app

# package.json と package-lock.json をコピーして npm ci を実行
COPY package.json package-lock.json* ./
RUN npm ci

# builder ステージ: アプリケーションのビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js のテレメトリ送信を無効にする（オプション）
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# runner ステージ: 本番環境用の軽量実行イメージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# セキュリティ強化のため、ルート以外のユーザーを作成して実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 静的アセットのコピー
COPY --from=builder /app/public ./public

# プリレンダリングキャッシュ用のディレクトリ作成と権限設定
RUN mkdir .next
RUN chown nextjs:nodejs .next

# スタンドアロンビルド成果物と静的ファイルのコピー（権限付き）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# next.js の standalone 出力によって生成された server.js を実行
CMD ["node", "server.js"]
