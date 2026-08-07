import { z } from "zod";
import { TaskStatus } from "@prisma/client";

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "タイトルは必須です")
  .max(200, "タイトルは200文字以内で入力してください");

export const taskStatusSchema = z.nativeEnum(TaskStatus);

// AI自動分類・手動編集の両方で使う固定の選択肢。自由入力にすると「仕事」「Work」のような
// 表記ゆれで同じ意味のカテゴリが増殖し、絞り込み・色分けが機能しなくなるため閉じた集合にしている。
export const TASK_CATEGORIES = ["仕事", "勉強", "家事", "趣味", "その他"] as const;

export const taskCategorySchema = z.enum(TASK_CATEGORIES).nullable();

export const TASK_PRIORITIES = ["高", "中", "低"] as const;

export const taskPrioritySchema = z.enum(TASK_PRIORITIES).nullable();

// クライアント側フォーム（タイトルのみ入力）と、React Hook Form の zodResolver で共有する。
export const taskFormSchema = z.object({
  title: taskTitleSchema,
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  status: taskStatusSchema.optional(),
  category: taskCategorySchema.optional(),
  priority: taskPrioritySchema.optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, "タスクIDは必須です"),
  title: taskTitleSchema.optional(),
  status: taskStatusSchema.optional(),
  category: taskCategorySchema.optional(),
  priority: taskPrioritySchema.optional(),
});

export const deleteTaskSchema = z.union([
  z.object({ completed: z.literal(true) }),
  z.object({ id: z.string().min(1, "タスクIDは必須です") }),
]);
