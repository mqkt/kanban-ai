import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getTokenMock = vi.fn();
vi.mock("next-auth/jwt", () => ({ getToken: getTokenMock }));

const isRateLimitedMock = vi.fn();
vi.mock("@/lib/rateLimit", () => ({ isRateLimited: isRateLimitedMock }));

const { proxy } = await import("./proxy");

function makeRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(url), { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  getTokenMock.mockResolvedValue(null);
  isRateLimitedMock.mockReturnValue(false);
});

describe("proxy (middleware)", () => {
  it("redirects the legacy /app route to /", async () => {
    const response = await proxy(makeRequest("https://example.com/app"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/");
  });

  it("redirects /app/* subpaths to / as well", async () => {
    const response = await proxy(makeRequest("https://example.com/app/board"));
    expect(response.headers.get("location")).toBe("https://example.com/");
  });

  it("lets unprotected paths through without checking auth", async () => {
    const response = await proxy(makeRequest("https://example.com/"));
    expect(getTokenMock).not.toHaveBeenCalled();
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'self'"
    );
  });

  it("returns 401 JSON for a protected API path with no session", async () => {
    getTokenMock.mockResolvedValue(null);
    const response = await proxy(
      makeRequest("https://example.com/api/tasks")
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("lets a protected API path through when a valid session token exists", async () => {
    getTokenMock.mockResolvedValue({ sub: "user-1" });
    const response = await proxy(
      makeRequest("https://example.com/api/tasks")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toBeTruthy();
  });

  it("returns 429 before checking auth when the client is rate limited", async () => {
    isRateLimitedMock.mockReturnValue(true);
    const response = await proxy(
      makeRequest("https://example.com/api/classify")
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Too many requests." });
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("uses the rightmost X-Forwarded-For value (the one GFE appends) as the rate-limit key", async () => {
    await proxy(
      makeRequest("https://example.com/api/duplicates", {
        "x-forwarded-for": "attacker-spoofed-ip, real-gfe-ip",
      })
    );
    expect(isRateLimitedMock).toHaveBeenCalledWith(
      "real-gfe-ip:/api/duplicates"
    );
  });

  // Cloud Run terminates TLS at the front end (GFE) and forwards plain HTTP to
  // the container. getToken()'s default heuristic infers "secure" purely from
  // req.url starting with "https://", which disagreed with how the session
  // cookie was actually issued and caused every /api/tasks call to 401 in
  // production (see proxy.ts's secureCookie comment). Pin this down so a
  // future "simplify getToken()'s options" edit can't reintroduce it silently.
  it("passes secureCookie:true to getToken() when the request is https", async () => {
    await proxy(makeRequest("https://example.com/api/tasks"));
    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: true })
    );
  });

  it("passes secureCookie:false to getToken() when the request is http (local dev)", async () => {
    await proxy(makeRequest("http://localhost:3000/api/tasks"));
    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: false })
    );
  });
});
