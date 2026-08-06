import { z } from "zod";
import { TASK_PRIORITIES } from "./task";

// Gemini に渡す前の入力検証。上限文字数を設けて、無制限な入力によるプロンプト膨張・コスト増を防ぐ。
export const classifyRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(200, "Task title is too long."),
});

export const CLASSIFY_CATEGORIES = ["仕事", "勉強", "家事", "趣味", "その他"] as const;

// Geminiの responseSchema で型は強制しているが、モデルが指示から逸脱した値を返す可能性は
// ゼロではない。ここで再検証してから初めてキャッシュ・クライアントへの返却を行うことで、
// 不正な値がキャッシュに24時間居座って全ユーザーに配信される事態を防ぐ。
export const classifyResponseSchema = z.object({
  category: z.enum(CLASSIFY_CATEGORIES),
  priority: z.enum(TASK_PRIORITIES),
});
