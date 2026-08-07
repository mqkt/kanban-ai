import { NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GUEST_AI_LIMIT } from "@/lib/guest";
import {
  classifyRequestSchema,
  classifyResponseSchema,
} from "@/lib/validation/classify";
import { TASK_CATEGORIES } from "@/lib/validation/task";
import { logger } from "@/lib/logger";
import {
  getCachedClassification,
  normalizeClassifyKey,
  setCachedClassification,
} from "@/lib/classifyCache";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = classifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }
    const { title } = parsed.data;

    // 分類結果はユーザーに依存しない（同じタイトルなら誰が入力しても同じ結果になるべき）ため、
    // 正規化したタイトルをキーにキャッシュし、同一タスク名への重複Gemini呼び出しを避ける。
    const cacheKey = normalizeClassifyKey(title);
    let data = getCachedClassification(cacheKey);

    if (!data) {
      // ゲストはAI分類の回数を制限する（Geminiの課金・悪用対策）。
      // 「上限未満か確認してから加算」を1つのupdateManyで行うことで、同時に複数リクエストが
      // 来ても（読み取り→加算の間に割り込まれる）TOCTOUで上限を超えて呼び出せないようにする。
      // キャッシュヒット時は課金が発生しないため、ここ（cache miss後）でのみ加算する。
      if (session.user.isGuest) {
        const reserved = await prisma.user.updateMany({
          where: { id: session.user.id, aiUsageCount: { lt: GUEST_AI_LIMIT } },
          data: { aiUsageCount: { increment: 1 } },
        });
        if (reserved.count === 0) {
          return NextResponse.json(
            { error: "ゲストでのAI自動分類は上限に達しました。" },
            { status: 429 }
          );
        }
      }

      const genAI = new GoogleGenerativeAI(apiKey);

      // レスポンスの厳格なJSONスキーマ定義
      const responseSchema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          category: {
            type: SchemaType.STRING,
            enum: [...TASK_CATEGORIES],
            description: "タスクの自動カテゴリ。仕事、勉強、家事、趣味、その他のいずれか。"
          },
          priority: {
            type: SchemaType.STRING,
            enum: ["高", "中", "低"],
            description: "タスクの緊急度・重要度から見た優先度。高、中、低のいずれか。"
          }
        },
        required: ["category", "priority"]
      };

      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const prompt = `タスクのタイトルを「${TASK_CATEGORIES.join("、")}」のいずれかに分類し、優先度（高・中・低のいずれか）を推定してください。

タスク: "${title}"`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // GeminiのresponseSchemaは強制力ではなく指示なので、モデルが逸脱した値を返す可能性がある。
      // ここで再検証してから初めてキャッシュ・返却する（不正な値を24時間キャッシュに残さない）。
      const validated = classifyResponseSchema.safeParse(JSON.parse(responseText));
      if (!validated.success) {
        logger.error("Gemini returned a response that failed schema validation", {
          issues: validated.error.issues,
        });
        return NextResponse.json(
          { error: "AI分類の結果が不正な形式でした。もう一度お試しください。" },
          { status: 502 }
        );
      }

      data = validated.data;
      setCachedClassification(cacheKey, data);
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Gemini API Error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "タスクの自動分類に失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 }
    );
  }
}
