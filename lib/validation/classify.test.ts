import { describe, expect, it } from "vitest";
import { classifyRequestSchema } from "./classify";

describe("classifyRequestSchema", () => {
  it("accepts a trimmed non-empty title", () => {
    const result = classifyRequestSchema.safeParse({ title: "  資料作成  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("資料作成");
    }
  });

  it("rejects a missing title", () => {
    const result = classifyRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters (prevents unbounded prompt input)", () => {
    const result = classifyRequestSchema.safeParse({ title: "あ".repeat(201) });
    expect(result.success).toBe(false);
  });
});
