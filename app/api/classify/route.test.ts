import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: authMock }));

const prismaMock = {
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
const { __resetClassifyCacheForTests } = await import("@/lib/classifyCache");

beforeEach(() => {
  vi.clearAllMocks();
  __resetClassifyCacheForTests();
  process.env.GEMINI_API_KEY = "test-key";
  generateContentMock.mockResolvedValue({
    response: { text: () => JSON.stringify({ category: "仕事", priority: "中" }) },
  });
});

describe("POST /api/classify", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: "タスク" }),
      })
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for an empty title without calling Gemini", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", isGuest: false } });
    const response = await POST(
      new Request("http://localhost/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      })
    );
    expect(response.status).toBe(400);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a title over 200 characters through the route (not just the schema in isolation)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", isGuest: false } });
    const response = await POST(
      new Request("http://localhost/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: "あ".repeat(201) }),
      })
    );
    expect(response.status).toBe(400);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("blocks a guest that already reached the AI usage limit, atomically via updateMany", async () => {
    authMock.mockResolvedValue({ user: { id: "guest-1", isGuest: true } });
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(
      new Request("http://localhost/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: "タスク" }),
      })
    );

    expect(response.status).toBe(429);
    expect(generateContentMock).not.toHaveBeenCalled();
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "guest-1", aiUsageCount: { lt: 20 } },
      data: { aiUsageCount: { increment: 1 } },
    });
  });

  it("increments guest usage only when a Gemini call actually happens (cache miss)", async () => {
    authMock.mockResolvedValue({ user: { id: "guest-1", isGuest: true } });
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    const response = await POST(
      new Request("http://localhost/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: "タスク" }),
      })
    );

    expect(response.status).toBe(200);
    expect(prismaMock.user.updateMany).toHaveBeenCalledTimes(1);
  });

  it("returns 502 and does not cache a Gemini response that fails schema validation", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", isGuest: false } });
    generateContentMock.mockResolvedValue({
      response: { text: () => JSON.stringify({ category: "宇宙", priority: "最高" }) },
    });

    const response = await POST(
      new Request("http://localhost/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: "不正なタスク" }),
      })
    );

    expect(response.status).toBe(502);

    // 不正な結果はキャッシュされていないはず — 次のリクエストも再度Geminiを呼ぶ。
    generateContentMock.mockResolvedValue({
      response: { text: () => JSON.stringify({ category: "仕事", priority: "中" }) },
    });
    const second = await POST(
      new Request("http://localhost/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: "不正なタスク" }),
      })
    );
    expect(second.status).toBe(200);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("does not leak internal error details to the client on unexpected failure", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", isGuest: false } });
    generateContentMock.mockRejectedValue(
      new Error("connection refused to internal-db-host:5432")
    );

    const response = await POST(
      new Request("http://localhost/api/classify", {
        method: "POST",
        body: JSON.stringify({ title: "タスク" }),
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).not.toMatch(/internal-db-host/);
  });

  it("serves a repeated title from cache without calling Gemini again", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", isGuest: false } });

    const makeRequest = () =>
      POST(
        new Request("http://localhost/api/classify", {
          method: "POST",
          body: JSON.stringify({ title: "  資料作成  " }),
        })
      );

    const first = await makeRequest();
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(generateContentMock).toHaveBeenCalledTimes(1);

    const second = await makeRequest();
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(generateContentMock).toHaveBeenCalledTimes(1);

    expect(secondBody).toEqual(firstBody);
  });
});
