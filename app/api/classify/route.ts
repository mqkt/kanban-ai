import { NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { title } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // レスポンスの厳格なJSONスキーマ定義
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          enum: ["仕事", "勉強", "家事", "趣味", "その他"],
          description: "タスクの自動カテゴリ。仕事、勉強、家事、趣味、その他のいずれか。"
        },
        duration: {
          type: SchemaType.INTEGER,
          description: "タスクを完了するのに必要な想定所要時間（分単位の数値）。"
        }
      },
      required: ["category", "duration"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const prompt = `タスクのタイトルを「仕事、勉強、家事、趣味、その他」のいずれかに分類し、完了に必要な想定所要時間（分単位）を推定してください。

タスク: "${title}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // JSON文字列をオブジェクトにパース
    const data = JSON.parse(responseText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
