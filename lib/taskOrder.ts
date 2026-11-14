import type { TaskStatus } from "@prisma/client";

// 並び順の規則。
// - position が空のカードは、従来どおり作成日時の新しい順（キー = -createdAt）。
// - 並べ替えたカードの列は、0,1,2… の position を全員に振り直す。
//   新しく追加されたカード（position が空）は負のキーなので、常に先頭に来る。
type Orderable = {
  id: string;
  status: TaskStatus | string;
  createdAt: number;
  position?: number | null;
};

export const orderKey = (task: Pick<Orderable, "createdAt" | "position">) =>
  task.position ?? -task.createdAt;

export function sortForLane<T extends Orderable>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => orderKey(a) - orderKey(b) || a.id.localeCompare(b.id));
}

export type PositionPatch = { id: string; position: number; status?: string };

/**
 * taskId を laneId の beforeId の手前に置いたときの、保存すべき変更の一覧を返す。
 * beforeId が null なら末尾。変わらないカードは含めない。
 */
export function planReorder<T extends Orderable>(
  tasks: T[],
  taskId: string,
  laneId: string,
  beforeId: string | null
): PositionPatch[] {
  const moving = tasks.find((t) => t.id === taskId);
  if (!moving) return [];

  const laneAll = sortForLane(tasks.filter((t) => t.status === laneId));
  const laneWithout = laneAll.filter((t) => t.id !== taskId);

  let index: number;
  if (beforeId === taskId) {
    // 自分自身の手前に置く = 今の位置のまま。
    index = Math.max(0, laneAll.findIndex((t) => t.id === taskId));
    if (moving.status !== laneId) index = laneWithout.length;
  } else if (beforeId === null) {
    index = laneWithout.length;
  } else {
    const found = laneWithout.findIndex((t) => t.id === beforeId);
    index = found < 0 ? laneWithout.length : found;
  }

  const next = [...laneWithout.slice(0, index), moving, ...laneWithout.slice(index)];
  const patches: PositionPatch[] = [];
  next.forEach((task, i) => {
    const statusChanged = task.id === taskId && task.status !== laneId;
    if (task.position !== i || statusChanged) {
      patches.push(statusChanged ? { id: task.id, position: i, status: laneId } : { id: task.id, position: i });
    }
  });
  return patches;
}
