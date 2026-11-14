import { describe, expect, it } from "vitest";
import { planReorder, sortForLane } from "./taskOrder";

const t = (id: string, status: string, createdAt: number, position?: number | null) => ({
  id,
  status,
  createdAt,
  position,
});

describe("sortForLane", () => {
  it("puts newer cards first when no position is set", () => {
    const sorted = sortForLane([t("old", "TODO", 1000), t("new", "TODO", 3000), t("mid", "TODO", 2000)]);
    expect(sorted.map((x) => x.id)).toEqual(["new", "mid", "old"]);
  });

  it("keeps a card added after a reorder (no position) above the positioned ones", () => {
    const sorted = sortForLane([t("a", "TODO", 1000, 0), t("b", "TODO", 2000, 1), t("fresh", "TODO", 9000)]);
    expect(sorted.map((x) => x.id)).toEqual(["fresh", "a", "b"]);
  });
});

describe("planReorder", () => {
  const board = [t("a", "TODO", 3000), t("b", "TODO", 2000), t("c", "TODO", 1000), t("x", "DOING", 500)];

  it("numbers the whole lane from 0 when a card is first moved up", () => {
    // 表示順は a, b, c。c を a の手前へ。
    const patches = planReorder(board, "c", "TODO", "a");
    expect(patches).toEqual([
      { id: "c", position: 0 },
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("moves a card to the end when beforeId is null", () => {
    const patches = planReorder(board, "a", "TODO", null);
    expect(patches.map((p) => `${p.id}:${p.position}`)).toEqual(["b:0", "c:1", "a:2"]);
  });

  it("returns only the cards whose position actually changed", () => {
    const numbered = [t("a", "TODO", 3, 0), t("b", "TODO", 2, 1), t("c", "TODO", 1, 2)];
    expect(planReorder(numbered, "c", "TODO", "b")).toEqual([
      { id: "c", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("is a no-op when a card is dropped before itself", () => {
    const numbered = [t("a", "TODO", 3, 0), t("b", "TODO", 2, 1)];
    expect(planReorder(numbered, "b", "TODO", "b")).toEqual([]);
  });

  it("changes the status and places the card when it is dropped into another lane", () => {
    const patches = planReorder(board, "x", "TODO", "b");
    expect(patches).toContainEqual({ id: "x", position: 1, status: "TODO" });
    expect(patches.find((p) => p.id === "a")).toEqual({ id: "a", position: 0 });
  });

  it("ignores an unknown task", () => {
    expect(planReorder(board, "nope", "TODO", null)).toEqual([]);
  });
});
