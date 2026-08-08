import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: {
    deleteMany: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { POST } = await import("./route");

function makeRequest(authorization?: string) {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request("https://example.com/api/admin/cleanup-guests", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-cron-secret";
});

describe("POST /api/admin/cleanup-guests", () => {
  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await POST(makeRequest("Bearer anything"));
    expect(response.status).toBe(500);
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
  });

  it("returns 401 when the token has the wrong length", async () => {
    const response = await POST(makeRequest("Bearer short"));
    expect(response.status).toBe(401);
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is the right length but wrong value", async () => {
    // "test-cron-secret" と同じ文字数の別文字列で、定数時間比較のtimingSafeEqual分岐を通す。
    const wrongSameLength = "x".repeat("test-cron-secret".length);
    const response = await POST(makeRequest(`Bearer ${wrongSameLength}`));
    expect(response.status).toBe(401);
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes expired guests and returns the deleted count when authorized", async () => {
    prismaMock.user.deleteMany.mockResolvedValue({ count: 3 });

    const response = await POST(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ deleted: 3 });
    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
      where: { guestExpiresAt: { lt: expect.any(Date) } },
    });
  });
});
