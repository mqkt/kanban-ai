import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isRateLimited } from "./rateLimit";

describe("isRateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the per-window limit", () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 60; i++) {
      expect(isRateLimited(key)).toBe(false);
    }
  });

  it("blocks requests once the per-window limit is exceeded", () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 60; i++) {
      isRateLimited(key);
    }
    expect(isRateLimited(key)).toBe(true);
  });

  it("resets once the window elapses", () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 60; i++) {
      isRateLimited(key);
    }
    expect(isRateLimited(key)).toBe(true);

    vi.advanceTimersByTime(61 * 1000);

    expect(isRateLimited(key)).toBe(false);
  });

  it("tracks distinct keys independently", () => {
    const keyA = `test-key-a-${Math.random()}`;
    const keyB = `test-key-b-${Math.random()}`;
    for (let i = 0; i < 60; i++) {
      isRateLimited(keyA);
    }
    expect(isRateLimited(keyA)).toBe(true);
    expect(isRateLimited(keyB)).toBe(false);
  });
});
