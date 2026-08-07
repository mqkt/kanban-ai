import { NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GUEST_AI_LIMIT } from "@/lib/guest";
import { triageResponseSchema } from "@/lib/validation/triage";
import { logger } from "@/lib/logger";
import { reserveGeminiCall } from "@/lib/geminiBudget";
import { TRIAGE_MODEL } from "@/lib/constants";

export const runtime = "nodejs";

// 一度に渡すタスク数の上限。プロンプト膨張・コスト増を防ぐ。
const MAX_TASKS_FOR_TRIAGE = 100;

// オンデマンドで実行する「重複・統合候補の検出」。定期実行（cron等）による自動マージは
// 誤検出時のデータ損失リスクがあるため行わず、必ずユーザーが1件ずつ確認してから
// マージを実行する（実際のマージはこのAPIではなく既存の PATCH/DELETE /api/tasks を使う）。
export async function POST() {
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

    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id, status: { not: TaskStatus.DONE } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, category: true },
      take: MAX_TASKS_FOR_TRIAGE,
    });

    if (tasks.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // ゲストのAI利用回数を消費する（/api/classify と同じカウンター・同じ悪用対策）。
    if (session.user.isGuest) {
      const reserved = await prisma.user.updateMany({
        where: { id: session.user.id, aiUsageCount: { lt: GUEST_AI_LIMIT } },
        data: { aiUsageCount: { increment: 1 } },
      });
      if (reserved.count === 0) {
        return NextResponse.json(
          { error: "ゲストでのAI機能利用は上限に達しました。" },
          { status: 429 }
        );
      }
    }

    // ユーザー単位の制限とは別に、Gemini無料枠というアプリ全体で共有された
    // 1日あたりの資源自体も保護する（詳細はlib/geminiBudget.ts参照）。
    if (!reserveGeminiCall(TRIAGE_MODEL)) {
      return NextResponse.json(
        { error: "本日のAI機能の利用上限に達しました。しばらくしてから再度お試しください。" },
        { status: 429 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        groups: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              taskNumbers: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.INTEGER },
                description: "重複または統合できると判断したタスクの番号（2個以上）。",
              },
              reason: {
                type: SchemaType.STRING,
                description: "重複・統合可能と判断した理由（日本語で簡潔に）。",
              },
              suggestedTitle: {
                type: SchemaType.STRING,
                description: "統合後の1つのタスクとして提案するタイトル。",
              },
            },
            required: ["taskNumbers", "reason", "suggestedTitle"],
          },
        },
      },
      required: ["groups"],
    };

    const model = genAI.getGenerativeModel({
      model: TRIAGE_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const taskListText = tasks
      .map((task, index) => {
        const categorySuffix = task.category ? `（カテゴリ: ${task.category}）` : "";
        return `${index + 1}. ${task.title}${categorySuffix}`;
      })
      .join("\n");

    const prompt = `以下はTo Doリストのタスク一覧です。内容が重複している、または1つに統合できそうなタスクの組み合わせを見つけてください。
表現が違うだけで同じ作業を指しているものは重複とみなしてください。関連が薄いタスクは無理に組み合わせないでください。
該当する組み合わせが無ければ groups は空配列にしてください。

${taskListText}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const validated = triageResponseSchema.safeParse(JSON.parse(responseText));
    if (!validated.success) {
      logger.error("Triage response failed schema validation", {
        issues: validated.error.issues,
      });
      return NextResponse.json(
        { error: "AIの提案結果が不正な形式でした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    // 1始まりのタスク番号を実際のタスクIDへマッピングする。
    // 範囲外の番号・重複した番号は除外し、結果として1件しか残らなかったグループも捨てる。
    const suggestions = validated.data.groups
      .map((group) => {
        const uniqueNumbers = Array.from(new Set(group.taskNumbers));
        const taskIds = uniqueNumbers
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= tasks.length)
          .map((n) => tasks[n - 1].id);
        return {
          taskIds,
          reason: group.reason,
          suggestedTitle: group.suggestedTitle,
        };
      })
      .filter((group) => group.taskIds.length >= 2);

    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error("Triage API Error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "重複チェックに失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 }
    );
  }
}
