// route.test.ts はPrismaを全面モックしているため、「未完了タスクだけを、正しいユーザーに
// 絞って、正しい順序で」実DBから取得できているかは検証できない。ここではPrismaは実クライアント
// のまま、Gemini呼び出しのみモックして、タスク選定とID解決を実DBに対して検証する。
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskStatus } from "@prisma/client";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: authMock }));

const generateContentMock = vi.fn();
vi.mock("@google/generative-ai", async () => {
  const actual = await vi.importActual<typeof import("@google/generative-ai")>(
    "@google/generative-ai"
  );
  class GoogleGenerativeAIMock {
    getGenerativeModel() {
      return { generateContent: generateContentMock };
    }
  }
  return { ...actual, GoogleGenerativeAI: GoogleGenerativeAIMock };
});

const { prisma } = await import("@/lib/prisma");
const { POST } = await import("./route");

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `duplicates-integration-${randomUUID()}@example.com` },
  });
  const other = await prisma.user.create({
    data: { email: `duplicates-integration-other-${randomUUID()}@example.com` },
  });
  userId = user.id;
  otherUserId = other.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-key";
  authMock.mockResolvedValue({ user: { id: userId, isGuest: false } });
});

afterEach(async () => {
  await prisma.task.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
});

describe("POST /api/duplicates (real DB)", () => {
  it("excludes DONE tasks and other users' tasks, and resolves suggestion numbers to real task ids", async () => {
    const dup1 = await prisma.task.create({ data: { userId, title: "牛乳を買う" } });
    const dup2 = await prisma.task.create({ data: { userId, title: "牛乳買ってくる" } });
    await prisma.task.create({
      data: { userId, title: "完了済みタスク", status: TaskStatus.DONE },
    });
    await prisma.task.create({ data: { userId: otherUserId, title: "他ユーザーのタスク" } });

    generateContentMock.mockImplementation(async () => ({
      response: {
        text: () =>
          JSON.stringify({
            groups: [
              {
                // モックはタスクの並び順(createdAt降順)に依存させず、内容で判定させる。
                taskNumbers: [1, 2],
                reason: "同じ内容の買い物タスク",
                suggestedTitle: "牛乳を買う",
              },
            ],
          }),
      },
    }));

    const response = await POST();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.suggestions).toHaveLength(1);
    const idsInPrompt = new Set([dup1.id, dup2.id]);
    expect(new Set(body.suggestions[0].taskIds)).toEqual(idsInPrompt);

    // Geminiに渡されたプロンプトに完了済み・他ユーザーのタスクが含まれていないことも確認する。
    const promptArg = generateContentMock.mock.calls[0][0];
    expect(promptArg).toContain("牛乳を買う");
    expect(promptArg).not.toContain("完了済みタスク");
    expect(promptArg).not.toContain("他ユーザーのタスク");
  });

  it("returns an empty suggestion list without calling Gemini when fewer than 2 open tasks exist", async () => {
    await prisma.task.create({ data: { userId, title: "唯一のタスク" } });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toEqual([]);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("consumes a guest's AI usage count and blocks at the limit", async () => {
    const guest = await prisma.user.create({
      data: {
        email: `duplicates-integration-guest-${randomUUID()}@demo.local`,
        guestExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        aiUsageCount: 20,
      },
    });
    authMock.mockResolvedValue({ user: { id: guest.id, isGuest: true } });
    await prisma.task.create({ data: { userId: guest.id, title: "タスクA" } });
    await prisma.task.create({ data: { userId: guest.id, title: "タスクB" } });

    try {
      const response = await POST();
      expect(response.status).toBe(429);
      expect(generateContentMock).not.toHaveBeenCalled();
    } finally {
      await prisma.task.deleteMany({ where: { userId: guest.id } });
      await prisma.user.delete({ where: { id: guest.id } });
    }
  });
});
