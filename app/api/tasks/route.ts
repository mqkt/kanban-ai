import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskStatus, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createTaskSchema,
  deleteTaskSchema,
  updateTaskSchema,
} from "@/lib/validation/task";
import { IN_PROGRESS_WIP_LIMIT } from "@/lib/constants";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

const taskSelect = {
  id: true,
  title: true,
  status: true,
  category: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
};

function serializeTask(task: {
  id: string;
  title: string;
  status: TaskStatus;
  category: string | null;
  priority: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    category: task.category ?? undefined,
    priority: task.priority ?? undefined,
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
  };
}

async function getUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid request.";
}

// cursorはPrisma組み込みの `cursor` オプション（対象行が実在している必要がある）ではなく、
// createdAt+id の値そのものをエンコードしたkeyset方式にしている。
// 対象行が2ページ目取得までの間に削除されても（例: 完了タスクの一括削除）、
// 値ベースの比較なので壊れずページングを継続できる。
function encodeCursor(task: { createdAt: Date; id: string }): string {
  return `${task.createdAt.getTime()}_${task.id}`;
}

function decodeCursor(raw: string | null): { createdAt: Date; id: string } | null {
  if (!raw) return null;
  const separatorIndex = raw.lastIndexOf("_");
  if (separatorIndex <= 0) return null;

  const millis = Number(raw.slice(0, separatorIndex));
  const id = raw.slice(separatorIndex + 1);
  if (!id || !Number.isFinite(millis)) return null;

  return { createdAt: new Date(millis), id };
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const cursor = decodeCursor(searchParams.get("cursor"));

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: taskSelect,
    take: limit + 1,
  });

  const hasMore = tasks.length > limit;
  const page = hasMore ? tasks.slice(0, limit) : tasks;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last) : null;

  // ユーザー固有データのため、CDN/ブラウザどちらにもキャッシュさせない。
  return NextResponse.json(
    { tasks: page.map(serializeTask), nextCursor },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }

  const { title, status, category, priority } = parsed.data;
  const task = await prisma.task.create({
    data: {
      userId,
      title,
      status: status ?? TaskStatus.TODO,
      category: category ?? undefined,
      priority: priority ?? undefined,
    },
    select: taskSelect,
  });

  return NextResponse.json({ task: serializeTask(task) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }

  const { id, ...fields } = parsed.data;
  const data: Prisma.TaskUpdateManyMutationInput = {};
  if ("title" in fields) data.title = fields.title;
  if ("status" in fields) data.status = fields.status;
  if ("category" in fields) data.category = fields.category;
  if ("priority" in fields) data.priority = fields.priority;

  // updateMany による所有権チェックと再取得を1トランザクションにまとめ、
  // 両クエリの間に別リクエストが割り込む TOCTOU ギャップを閉じる。
  // IN_PROGRESSへの遷移時はWIP制限もここで強制する（クライアント側の制限は
  // UXのための早期ブロックに過ぎず、複数タブや直接APIを叩く経路をこちらで塞ぐ）。
  const result = await prisma.$transaction(async (tx) => {
    if (data.status === TaskStatus.IN_PROGRESS) {
      const current = await tx.task.findFirst({
        where: { id, userId },
        select: { status: true },
      });

      if (!current) {
        return { kind: "not_found" as const };
      }

      if (current.status !== TaskStatus.IN_PROGRESS) {
        const inProgressCount = await tx.task.count({
          where: { userId, status: TaskStatus.IN_PROGRESS },
        });
        if (inProgressCount >= IN_PROGRESS_WIP_LIMIT) {
          return { kind: "wip_limit" as const };
        }
      }
    }

    const updateResult = await tx.task.updateMany({
      where: { id, userId },
      data,
    });

    if (updateResult.count === 0) {
      return { kind: "not_found" as const };
    }

    const task = await tx.task.findUniqueOrThrow({
      where: { id },
      select: taskSelect,
    });
    return { kind: "ok" as const, task };
  });

  if (result.kind === "wip_limit") {
    return NextResponse.json(
      { error: `進行中レーンは同時に${IN_PROGRESS_WIP_LIMIT}件までです。` },
      { status: 409 }
    );
  }

  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ task: serializeTask(result.task) });
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = deleteTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }

  if ("completed" in parsed.data) {
    await prisma.task.deleteMany({
      where: { userId, status: TaskStatus.DONE },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.task.deleteMany({
    where: { id: parsed.data.id, userId },
  });

  return NextResponse.json({ ok: true });
}
