-- CreateEnum: TrainingPhase
CREATE TYPE "TrainingPhase" AS ENUM ('CONDICIONAMENTO_1', 'CONDICIONAMENTO_2', 'HIPERTROFIA', 'FORCA', 'POTENCIA', 'RESISTENCIA', 'METABOLICO', 'HIPERTROFIA_2', 'FORCA_2', 'RESISTENCIA_2', 'METABOLICO_2');

-- CreateEnum: ClientObjective
CREATE TYPE "ClientObjective" AS ENUM ('EMAGRECIMENTO', 'HIPERTROFIA_OBJ', 'PERFORMANCE', 'REABILITACAO');

-- AlterTable: clients - add objective and currentPhase
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "objective" "ClientObjective";
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "current_phase" "TrainingPhase";

-- AlterTable: assessments - add selectedPhase and objective
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "selected_phase" "TrainingPhase";
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "objective" "ClientObjective";

-- AlterTable: workouts - add phase and assessmentId
ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "phase" "TrainingPhase";
ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "assessment_id" TEXT;
ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "template_json" JSONB;
ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "target_weeks" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "sessions_per_week" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "sessions_completed" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey: workouts -> assessments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workouts_assessment_id_fkey'
  ) THEN
    ALTER TABLE "workouts" ADD CONSTRAINT "workouts_assessment_id_fkey"
      FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
