import { z } from "zod";
import { TaskStatus } from "@prisma/client";

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "タイトルは必須です")
  .max(200, "タイトルは200文字以内で入力してください");

export const taskStatusSchema = z.nativeEnum(TaskStatus);

export const taskCategorySchema = z
  .string()
  .trim()
  .min(1, "カテゴリを入力してください")
  .max(50, "カテゴリは50文字以内で入力してください")
  .nullable();

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
