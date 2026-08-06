// ユニットテスト(route.test.ts)はPrismaを全面モックしているため、
// 「発行しようとしたクエリの形」は検証できても、実際にPostgres上で意図通りの行が
// 読み書きされるかは検証できない。ここではPrismaをモックせず、実DB(TEST_DATABASE_URL)に
// 対して他ユーザーのタスクへのアクセス制御・トランザクション・keysetページネーションを検証する。
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskStatus } from "@prisma/client";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: authMock }));

const { prisma } = await import("@/lib/prisma");
const { GET, POST, PATCH, DELETE } = await import("./route");

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `route-integration-${randomUUID()}@example.com` },
  });
  const otherUser = await prisma.user.create({
    data: { email: `route-integration-other-${randomUUID()}@example.com` },
  });
  userId = user.id;
  otherUserId = otherUser.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  authMock.mockResolvedValue({ user: { id: userId } });
});

afterEach(async () => {
  await prisma.task.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
});

describe("POST → GET /api/tasks (real DB)", () => {
  it("persists a task scoped to the authenticated user and returns it in the list", async () => {
    const createResponse = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "結合テストで作成したタスク" }),
      })
    );
    expect(createResponse.status).toBe(201);

    const listResponse = await GET(new Request("http://localhost/api/tasks"));
    const body = await listResponse.json();

    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].title).toBe("結合テストで作成したタスク");

    const row = await prisma.task.findUniqueOrThrow({
      where: { id: body.tasks[0].id },
    });
    expect(row.userId).toBe(userId);
  });
});

describe("PATCH /api/tasks (real DB)", () => {
  it("does not update or leak another user's task, and leaves it unchanged", async () => {
    const othersTask = await prisma.task.create({
      data: { userId: otherUserId, title: "他ユーザーのタスク" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: othersTask.id, status: "DONE" }),
      })
    );

    expect(response.status).toBe(404);

    const unchanged = await prisma.task.findUniqueOrThrow({
      where: { id: othersTask.id },
    });
    expect(unchanged.status).toBe(TaskStatus.TODO);
  });

  it("updates the row and the transaction's re-fetch reflects the same write", async () => {
    const task = await prisma.task.create({
      data: { userId, title: "更新対象タスク" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: task.id, status: "DONE" }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.task.status).toBe("DONE");

    const row = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(row.status).toBe(TaskStatus.DONE);
  });
});

describe("GET /api/tasks pagination (real DB)", () => {
  it("keeps paging correctly by value even after the cursor row is deleted between pages", async () => {
    // createdAtの昇順が壊れないよう、明示的に異なる値を与えて3件作成する。
    const base = new Date("2026-01-01T00:00:00.000Z");
    const tasks = await Promise.all(
      [0, 1, 2].map((i) =>
        prisma.task.create({
          data: {
            userId,
            title: `task-${i}`,
            createdAt: new Date(base.getTime() + i * 1000),
          },
        })
      )
    );
    // 作成順: task-0(最古) → task-1 → task-2(最新)。GETはcreatedAt降順なので task-2, task-1, task-0 の順。
    const [, middleTask] = tasks;

    const firstPage = await GET(new Request("http://localhost/api/tasks?limit=1"));
    const firstBody = await firstPage.json();
    expect(firstBody.tasks[0].title).toBe("task-2");
    expect(firstBody.nextCursor).not.toBeNull();

    // 2ページ目に進む前に、cursor行(task-1)そのものを削除する。
    // Prisma組み込みcursorオプション(行の実在が前提)ならここで壊れるはずの操作。
    await prisma.task.delete({ where: { id: middleTask.id } });

    const secondPage = await GET(
      new Request(`http://localhost/api/tasks?limit=1&cursor=${firstBody.nextCursor}`)
    );
    const secondBody = await secondPage.json();

    expect(secondBody.tasks).toHaveLength(1);
    expect(secondBody.tasks[0].title).toBe("task-0");
  });
});

describe("DELETE /api/tasks (real DB)", () => {
  it("bulk-deletes only this user's completed tasks, leaving others' and other statuses intact", async () => {
    const mine = await prisma.task.create({
      data: { userId, title: "自分の完了タスク", status: TaskStatus.DONE },
    });
    const mineTodo = await prisma.task.create({
      data: { userId, title: "自分の未完了タスク", status: TaskStatus.TODO },
    });
    const othersDone = await prisma.task.create({
      data: { userId: otherUserId, title: "他ユーザーの完了タスク", status: TaskStatus.DONE },
    });

    const response = await DELETE(
      new Request("http://localhost/api/tasks", {
        method: "DELETE",
        body: JSON.stringify({ completed: true }),
      })
    );
    expect(response.status).toBe(200);

    const remainingIds = (
      await prisma.task.findMany({ where: { id: { in: [mine.id, mineTodo.id, othersDone.id] } } })
    ).map((t) => t.id);

    expect(remainingIds).not.toContain(mine.id);
    expect(remainingIds).toContain(mineTodo.id);
    expect(remainingIds).toContain(othersDone.id);
  });
});
