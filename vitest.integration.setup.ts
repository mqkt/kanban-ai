// ユニットテスト用 vitest.setup.ts とは別ファイル。実DBに接続するため、
// 開発/本番DBを誤って対象にしないためのガードをここに集約する。
// vitestは.envを自動読み込みしないため、TEST_DATABASE_URL未指定時は
// docker-compose.ymlのtest-dbサービスに対応するデフォルト値にフォールバックする
// （DATABASE_URL自体へのフォールバックは行わない＝開発DBを暗黙に使うことはない）。
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://kanban_app:password@localhost:5433/kanban_test?schema=public";

if (!/test/i.test(testDatabaseUrl)) {
  throw new Error(
    `TEST_DATABASE_URL のDB名に "test" を含めてください（誤って本番/開発DBを指すのを防ぐガード）: ${testDatabaseUrl}`
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
