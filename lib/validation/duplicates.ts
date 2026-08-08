import { z } from "zod";

// Geminiに「重複・統合できそうなタスクの組」を判断させた結果のスキーマ。
// タスクの実IDではなく、プロンプトに振った1始まりの番号で参照させている
// （実IDを直接返させると、モデルが存在しないIDを捏造するリスクがあるため。
// 番号なら範囲チェックだけで安全に実IDへマッピングできる）。
export const triageResponseSchema = z.object({
  groups: z.array(
    z.object({
      taskNumbers: z.array(z.number().int()).min(2, "グループには2件以上のタスクが必要です"),
      reason: z.string().min(1).max(500),
      suggestedTitle: z.string().min(1).max(200),
    })
  ),
});
