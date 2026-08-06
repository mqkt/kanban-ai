-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "priority" TEXT;
