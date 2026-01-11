-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('INDIVIDUAL', 'GROUP');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('STARTED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "body_metrics_json" JSONB;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "arm" DECIMAL(5,2),
ADD COLUMN     "calf" DECIMAL(5,2),
ADD COLUMN     "chest" DECIMAL(5,2),
ADD COLUMN     "hip" DECIMAL(5,2),
ADD COLUMN     "thigh" DECIMAL(5,2),
ADD COLUMN     "waist" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "type" "LessonType" NOT NULL DEFAULT 'INDIVIDUAL',
    "photo_url" TEXT,
    "photo_key" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,
    "notes" TEXT,
    "status" "LessonStatus" NOT NULL DEFAULT 'STARTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_clients" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lessons_studio_id_idx" ON "lessons"("studio_id");

-- CreateIndex
CREATE INDEX "lessons_trainer_id_idx" ON "lessons"("trainer_id");

-- CreateIndex
CREATE INDEX "lessons_started_at_idx" ON "lessons"("started_at");

-- CreateIndex
CREATE INDEX "lessons_status_idx" ON "lessons"("status");

-- CreateIndex
CREATE INDEX "lesson_clients_lesson_id_idx" ON "lesson_clients"("lesson_id");

-- CreateIndex
CREATE INDEX "lesson_clients_client_id_idx" ON "lesson_clients"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_clients_lesson_id_client_id_key" ON "lesson_clients"("lesson_id", "client_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_clients" ADD CONSTRAINT "lesson_clients_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_clients" ADD CONSTRAINT "lesson_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
