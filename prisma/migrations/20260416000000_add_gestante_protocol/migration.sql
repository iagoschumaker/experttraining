-- AlterEnum: Adicionar fases gestantes ao TrainingPhase
ALTER TYPE "TrainingPhase" ADD VALUE IF NOT EXISTS 'GESTANTE_T1';
ALTER TYPE "TrainingPhase" ADD VALUE IF NOT EXISTS 'GESTANTE_T2';
ALTER TYPE "TrainingPhase" ADD VALUE IF NOT EXISTS 'GESTANTE_T3_A';
ALTER TYPE "TrainingPhase" ADD VALUE IF NOT EXISTS 'GESTANTE_T3_B';

-- AlterEnum: Adicionar GESTANTE ao ClientObjective
ALTER TYPE "ClientObjective" ADD VALUE IF NOT EXISTS 'GESTANTE';

-- AlterTable: Campos de gestação no Client
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "gestational_week" INTEGER;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3);
