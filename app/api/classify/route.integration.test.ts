// ユニットテスト(route.test.ts)はPrismaをモックしているため、ゲストAI利用上限の
// 「上限未満なら加算」を1つのupdateManyで行うTOCTOU対策（同時リクエストでも上限を
// 超えて呼び出せないこと）は検証できない。ここでは実DBに対して並行リクエストを発行し、
// 実際に上限を超えないことを確認する。Gemini呼び出しはコスト・非決定性のためモックのまま。
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GUEST_AI_LIMIT } from "@/lib/guest";

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
const { __resetClassifyCacheForTests } = await import("@/lib/classifyCache");

let guestId: string;
let regularUserId: string;

beforeAll(async () => {
  const guest = await prisma.user.create({
    data: {
      email: `classify-integration-guest-${randomUUID()}@demo.local`,
      guestExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const regular = await prisma.user.create({
    data: { email: `classify-integration-regular-${randomUUID()}@example.com` },
  });
  guestId = guest.id;
  regularUserId = regular.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [guestId, regularUserId] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  vi.clearAllMocks();
  __resetClassifyCacheForTests();
  process.env.GEMINI_API_KEY = "test-key";
  await prisma.user.update({ where: { id: guestId }, data: { aiUsageCount: 0 } });
});

function classifyRequest(title: string) {
  return new Request("http://localhost/api/classify", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

describe("POST /api/classify — guest usage limit (real DB)", () => {
  it("never lets concurrent requests push aiUsageCount past GUEST_AI_LIMIT", async () => {
    authMock.mockResolvedValue({ user: { id: guestId, isGuest: true } });
    await prisma.user.update({
      where: { id: guestId },
      data: { aiUsageCount: GUEST_AI_LIMIT - 3 },
    });
    // 異なるタイトル(=別キャッシュキー)で同時に10件送り、毎回Geminiが呼ばれる状況を作る。
    // モックされたPrismaでは「同時アクセス時にupdateManyの条件が正しく効くか」は検証できない。
    generateContentMock.mockImplementation(async () => ({
      response: { text: () => JSON.stringify({ category: "仕事" }) },
    }));

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) => classifyRequest(`並行タスク${i}-${randomUUID()}`)).map(
        (req) => POST(req)
      )
    );

    const succeeded = responses.filter((r) => r.status === 200).length;
    const limited = responses.filter((r) => r.status === 429).length;

    expect(succeeded).toBe(3);
    expect(limited).toBe(7);

    const finalUser = await prisma.user.findUniqueOrThrow({ where: { id: guestId } });
    expect(finalUser.aiUsageCount).toBe(GUEST_AI_LIMIT);
    expect(generateContentMock).toHaveBeenCalledTimes(3);
  });

  it("returns 429 without calling Gemini once the guest is already at the limit", async () => {
    authMock.mockResolvedValue({ user: { id: guestId, isGuest: true } });
    await prisma.user.update({
      where: { id: guestId },
      data: { aiUsageCount: GUEST_AI_LIMIT },
    });

    const response = await POST(classifyRequest(`上限到達後-${randomUUID()}`));

    expect(response.status).toBe(429);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("does not touch aiUsageCount for a non-guest user", async () => {
    authMock.mockResolvedValue({ user: { id: regularUserId, isGuest: false } });
    generateContentMock.mockResolvedValue({
      response: { text: () => JSON.stringify({ category: "その他" }) },
    });

    const response = await POST(classifyRequest(`通常ユーザー-${randomUUID()}`));

    expect(response.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: regularUserId } });
    expect(user.aiUsageCount).toBe(0);
  });
});
