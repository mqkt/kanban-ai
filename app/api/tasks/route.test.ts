import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskStatus } from "@prisma/client";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: authMock }));

// $transaction に渡す tx は、外側の prisma クライアントとは別オブジェクトにしている。
// 同一オブジェクトだと、PATCHハンドラが誤って tx ではなく外側の prisma を直接使うように
// 実装が壊れても、このテストのモック呼び出し検証が同じ関数を指してしまい退行を検知できない。
const txMock = {
  task: {
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
};

const prismaMock = {
  task: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) =>
    callback(txMock)
  ),
};
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { GET, POST, PATCH, DELETE } = await import("./route");

const baseTask = {
  id: "task-1",
  title: "既存タスク",
  status: TaskStatus.TODO,
  category: null,
  priority: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "user-1" } });
  prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock));
});

describe("GET /api/tasks", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/tasks"));
    expect(response.status).toBe(401);
  });

  it("paginates with a value-based (keyset) cursor and reports nextCursor when more rows exist", async () => {
    const extraTask = { ...baseTask, id: "task-2" };
    prismaMock.task.findMany.mockResolvedValue([baseTask, extraTask]);

    const response = await GET(
      new Request("http://localhost/api/tasks?limit=1")
    );
    const body = await response.json();

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 2 })
    );
    expect(body.tasks).toHaveLength(1);
    // task-1 の createdAt(2026-01-01T00:00:00.000Z = 1767225600000) + id をエンコードした値。
    expect(body.nextCursor).toBe(`${baseTask.createdAt.getTime()}_task-1`);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("filters by value comparison (createdAt/id), not by requiring the cursor row to still exist", async () => {
    prismaMock.task.findMany.mockResolvedValue([]);

    const cursor = `${new Date("2026-01-02T00:00:00.000Z").getTime()}_deleted-task-id`;
    await GET(new Request(`http://localhost/api/tasks?cursor=${cursor}`));

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          OR: [
            { createdAt: { lt: new Date("2026-01-02T00:00:00.000Z") } },
            {
              createdAt: new Date("2026-01-02T00:00:00.000Z"),
              id: { lt: "deleted-task-id" },
            },
          ],
        },
      })
    );
  });
});

describe("POST /api/tasks", () => {
  it("returns 400 for an empty title", async () => {
    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "  " }),
      })
    );
    expect(response.status).toBe(400);
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it("creates a task with the authenticated user's id", async () => {
    prismaMock.task.create.mockResolvedValue(baseTask);

    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "新しいタスク" }),
      })
    );

    expect(response.status).toBe(201);
    expect(prismaMock.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", title: "新しいタスク" }),
      })
    );
  });
});

describe("PATCH /api/tasks", () => {
  it("scopes the update to the authenticated user and returns 404 when no row matches, using the transaction client", async () => {
    txMock.task.updateMany.mockResolvedValue({ count: 0 });

    const response = await PATCH(
      new Request("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: "task-1", status: "DONE" }),
      })
    );

    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: "task-1", userId: "user-1" },
      data: { status: "DONE" },
    });
    expect(prismaMock.task.updateMany).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
    expect(txMock.task.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("re-fetches inside the same transaction after a successful update", async () => {
    txMock.task.updateMany.mockResolvedValue({ count: 1 });
    txMock.task.findUniqueOrThrow.mockResolvedValue({
      ...baseTask,
      status: TaskStatus.DONE,
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: "task-1", status: "DONE" }),
      })
    );

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.task.status).toBe("DONE");
  });

  it("rejects moving a task to IN_PROGRESS once the WIP limit is reached, without updating it", async () => {
    txMock.task.findFirst.mockResolvedValue({ status: TaskStatus.TODO });
    txMock.task.count.mockResolvedValue(5); // IN_PROGRESS_WIP_LIMIT

    const response = await PATCH(
      new Request("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: "task-1", status: "IN_PROGRESS" }),
      })
    );

    expect(txMock.task.count).toHaveBeenCalledWith({
      where: { userId: "user-1", status: TaskStatus.IN_PROGRESS },
    });
    expect(txMock.task.updateMany).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
  });

  it("allows moving a task to IN_PROGRESS when under the WIP limit", async () => {
    txMock.task.findFirst.mockResolvedValue({ status: TaskStatus.TODO });
    txMock.task.count.mockResolvedValue(4);
    txMock.task.updateMany.mockResolvedValue({ count: 1 });
    txMock.task.findUniqueOrThrow.mockResolvedValue({
      ...baseTask,
      status: TaskStatus.IN_PROGRESS,
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: "task-1", status: "IN_PROGRESS" }),
      })
    );

    expect(response.status).toBe(200);
  });

  it("does not re-check the WIP limit when a task already IN_PROGRESS is patched with another field", async () => {
    txMock.task.findFirst.mockResolvedValue({ status: TaskStatus.IN_PROGRESS });
    txMock.task.updateMany.mockResolvedValue({ count: 1 });
    txMock.task.findUniqueOrThrow.mockResolvedValue({
      ...baseTask,
      status: TaskStatus.IN_PROGRESS,
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: "task-1", status: "IN_PROGRESS" }),
      })
    );

    expect(txMock.task.count).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

describe("DELETE /api/tasks", () => {
  it("deletes only completed tasks belonging to the user", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/tasks", {
        method: "DELETE",
        body: JSON.stringify({ completed: true }),
      })
    );

    expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: TaskStatus.DONE },
    });
    expect(response.status).toBe(200);
  });

  it("deletes a single task scoped to the authenticated user", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/tasks", {
        method: "DELETE",
        body: JSON.stringify({ id: "task-1" }),
      })
    );

    expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
      where: { id: "task-1", userId: "user-1" },
    });
    expect(response.status).toBe(200);
  });
});
