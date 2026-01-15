/*
  Warnings:

  - Added the required column `lesson_date` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "day_index" INTEGER,
ADD COLUMN     "focus" TEXT,
ADD COLUMN     "lesson_date" DATE NOT NULL,
ADD COLUMN     "week_index" INTEGER,
ADD COLUMN     "workout_id" TEXT;

-- CreateIndex
CREATE INDEX "lessons_lesson_date_idx" ON "lessons"("lesson_date");

-- CreateIndex
CREATE INDEX "lessons_workout_id_idx" ON "lessons"("workout_id");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
