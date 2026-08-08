import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { reserveGeminiCall } from "./geminiBudget";
import { CLASSIFY_MODEL, DUPLICATE_MODEL } from "./constants";

describe("reserveGeminiCall", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls under the daily limit", () => {
    for (let i = 0; i < 450; i++) {
      expect(reserveGeminiCall(CLASSIFY_MODEL)).toBe(true);
    }
  });

  it("blocks calls once the daily limit is exhausted", () => {
    for (let i = 0; i < 450; i++) {
      reserveGeminiCall(CLASSIFY_MODEL);
    }
    expect(reserveGeminiCall(CLASSIFY_MODEL)).toBe(false);
  });

  it("resets once the 24-hour window elapses", () => {
    for (let i = 0; i < 450; i++) {
      reserveGeminiCall(CLASSIFY_MODEL);
    }
    expect(reserveGeminiCall(CLASSIFY_MODEL)).toBe(false);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    expect(reserveGeminiCall(CLASSIFY_MODEL)).toBe(true);
  });

  it("tracks classify and duplicate-check models independently, since they're separate free-tier quotas", () => {
    for (let i = 0; i < 450; i++) {
      reserveGeminiCall(CLASSIFY_MODEL);
    }
    expect(reserveGeminiCall(CLASSIFY_MODEL)).toBe(false);
    expect(reserveGeminiCall(DUPLICATE_MODEL)).toBe(true);
  });

  it("does not block an unrecognized model name", () => {
    expect(reserveGeminiCall("some-future-model")).toBe(true);
  });
});
