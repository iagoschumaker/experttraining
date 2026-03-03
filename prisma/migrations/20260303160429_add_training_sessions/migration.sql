
-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "students_json" JSONB NOT NULL,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_sessions_studio_id_idx" ON "training_sessions"("studio_id");

-- CreateIndex
CREATE INDEX "training_sessions_trainer_id_idx" ON "training_sessions"("trainer_id");

-- CreateIndex
CREATE INDEX "training_sessions_finalized_idx" ON "training_sessions"("finalized");

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
