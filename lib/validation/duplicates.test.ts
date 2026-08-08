import { describe, expect, it } from "vitest";
import { duplicateResponseSchema } from "./duplicates";

describe("duplicateResponseSchema", () => {
  it("accepts an empty groups array", () => {
    const result = duplicateResponseSchema.safeParse({ groups: [] });
    expect(result.success).toBe(true);
  });

  it("accepts a well-formed group", () => {
    const result = duplicateResponseSchema.safeParse({
      groups: [
        {
          taskNumbers: [1, 3],
          reason: "どちらも同じ会議の議事録共有を指している",
          suggestedTitle: "キックオフMTGの議事録を共有する",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a group with fewer than 2 task numbers", () => {
    const result = duplicateResponseSchema.safeParse({
      groups: [{ taskNumbers: [1], reason: "理由", suggestedTitle: "タイトル" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing groups field", () => {
    const result = duplicateResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
