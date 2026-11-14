"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskFormSchema, type TaskFormValues } from "@/lib/validation/task";

interface TaskFormProps {
  onSubmit: (title: string) => Promise<void>;
  isLoading?: boolean;
}

export default function TaskForm({ onSubmit, isLoading = false }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: "" },
  });

  const onValid = async (values: TaskFormValues) => {
    try {
      await onSubmit(values.title);
      reset();
    } catch {
      // 失敗時は入力値を保持し、ユーザーが編集・再送信できるようにする。
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <div className="flex gap-3">
        <input
          type="text"
          {...register("title")}
          placeholder="やることを入力"
          aria-label="やることを入力"
          className="min-h-[52px] min-w-0 flex-1 border border-ink bg-plate px-4 text-base text-ink outline-none transition-shadow duration-[var(--dur-micro)] placeholder:text-muted focus:ring-2 focus:ring-focus"
          aria-invalid={errors.title ? "true" : "false"}
        />
        <button type="submit" disabled={isLoading || isSubmitting} className="key-primary shrink-0">
          追加
        </button>
      </div>
      {errors.title && <p role="alert" className="mt-2 text-sm text-error">{errors.title.message}</p>}
    </form>
  );
}
