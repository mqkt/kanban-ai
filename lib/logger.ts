// Cloud Run は標準出力に書いたJSON行をCloud Loggingが自動的に構造化フィールドとして
// 取り込む（severity/message等）。専用ロギングライブラリ（pino等）を導入しなくても
// この程度のJSON整形で十分に検索・フィルタ可能なログが得られるため、依存を増やさずに
// このラッパーのみで対応する。
type LogLevel = "INFO" | "WARN" | "ERROR";

type LogMeta = Record<string, unknown>;

function write(level: LogLevel, message: string, meta?: LogMeta) {
  const line = {
    severity: level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const output = JSON.stringify(line);
  if (level === "ERROR") {
    console.error(output);
  } else if (level === "WARN") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("INFO", message, meta),
  warn: (message: string, meta?: LogMeta) => write("WARN", message, meta),
  error: (message: string, meta?: LogMeta) => write("ERROR", message, meta),
};
