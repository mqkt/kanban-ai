import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: authMock }));

const prismaMock = {
  task: {
    findMany: vi.fn(),
  },
  user: {
    updateMany: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

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
  return {
    ...actual,
    GoogleGenerativeAI: GoogleGenerativeAIMock,
  };
});

const { POST } = await import("./route");

const threeTasks = [
  { id: "task-1", title: "週次レポートを作成する", category: "仕事" },
  { id: "task-2", title: "週次報告書をまとめる", category: "仕事" },
  { id: "task-3", title: "買い物に行く", category: "家事" },
];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-key";
  authMock.mockResolvedValue({ user: { id: "user-1", isGuest: false } });
});

describe("POST /api/triage", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns an empty suggestions list without calling Gemini when fewer than 2 tasks exist", async () => {
    prismaMock.task.findMany.mockResolvedValue([threeTasks[0]]);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toEqual([]);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("maps 1-based task numbers to real task ids and drops out-of-range numbers", async () => {
    prismaMock.task.findMany.mockResolvedValue(threeTasks);
    generateContentMock.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            groups: [
              {
                // 99 は範囲外なので除外され、残り2件(1,2)で成立するグループになる
                taskNumbers: [1, 2, 99],
                reason: "同じ週次報告のタスクに見える",
                suggestedTitle: "週次レポートを作成する",
              },
            ],
          }),
      },
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toEqual([
      {
        taskIds: ["task-1", "task-2"],
        reason: "同じ週次報告のタスクに見える",
        suggestedTitle: "週次レポートを作成する",
      },
    ]);
  });

  it("drops a group that collapses to fewer than 2 valid tasks after filtering", async () => {
    prismaMock.task.findMany.mockResolvedValue(threeTasks);
    generateContentMock.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            groups: [
              { taskNumbers: [1, 99], reason: "理由", suggestedTitle: "タイトル" },
            ],
          }),
      },
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toEqual([]);
  });

  it("blocks a guest that already reached the AI usage limit, without calling Gemini", async () => {
    authMock.mockResolvedValue({ user: { id: "guest-1", isGuest: true } });
    prismaMock.task.findMany.mockResolvedValue(threeTasks);
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST();

    expect(response.status).toBe(429);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("returns 502 when the Gemini response fails schema validation", async () => {
    prismaMock.task.findMany.mockResolvedValue(threeTasks);
    generateContentMock.mockResolvedValue({
      response: { text: () => JSON.stringify({ groups: [{ taskNumbers: [1] }] }) },
    });

    const response = await POST();
    expect(response.status).toBe(502);
  });

  it("does not leak internal error details to the client on unexpected failure", async () => {
    prismaMock.task.findMany.mockResolvedValue(threeTasks);
    generateContentMock.mockRejectedValue(
      new Error("connection refused to internal-db-host:5432")
    );

    const response = await POST();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).not.toMatch(/internal-db-host/);
  });
});
