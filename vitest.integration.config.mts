import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.integration.setup.ts"],
    include: ["**/*.integration.test.ts"],
    exclude: ["node_modules", ".next"],
    // 同一の結合テストDBを複数ファイルが共有するため、テーブルの奪い合いを避けて直列実行する。
    fileParallelism: false,
  },
});
