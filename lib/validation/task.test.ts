import { describe, expect, it } from "vitest";
import {
  createTaskSchema,
  deleteTaskSchema,
  taskFormSchema,
  updateTaskSchema,
} from "./task";

describe("taskFormSchema", () => {
  it("accepts a trimmed non-empty title", () => {
    const result = taskFormSchema.safeParse({ title: "  レポート作成  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("レポート作成");
    }
  });

  it("rejects an empty title", () => {
    const result = taskFormSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    const result = taskFormSchema.safeParse({ title: "あ".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("createTaskSchema", () => {
  it("allows omitting optional fields", () => {
    const result = createTaskSchema.safeParse({ title: "タスク" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status", () => {
    const result = createTaskSchema.safeParse({ title: "タスク", status: "ARCHIVED" });
    expect(result.success).toBe(false);
  });

  it("accepts the PENDING status", () => {
    const result = createTaskSchema.safeParse({ title: "タスク", status: "PENDING" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid priority", () => {
    const result = createTaskSchema.safeParse({ title: "タスク", priority: "高" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid priority", () => {
    const result = createTaskSchema.safeParse({ title: "タスク", priority: "緊急" });
    expect(result.success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("requires an id", () => {
    const result = updateTaskSchema.safeParse({ title: "更新後" });
    expect(result.success).toBe(false);
  });

  it("only includes fields that were provided (partial update semantics)", () => {
    const result = updateTaskSchema.safeParse({ id: "task-1", status: "DONE" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("title" in result.data).toBe(false);
      expect(result.data.status).toBe("DONE");
    }
  });

  it("allows explicitly clearing category with null", () => {
    const result = updateTaskSchema.safeParse({ id: "task-1", category: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBeNull();
    }
  });
});

describe("deleteTaskSchema", () => {
  it("accepts a completed:true payload", () => {
    const result = deleteTaskSchema.safeParse({ completed: true });
    expect(result.success).toBe(true);
  });

  it("accepts an id payload", () => {
    const result = deleteTaskSchema.safeParse({ id: "task-1" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty payload", () => {
    const result = deleteTaskSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
