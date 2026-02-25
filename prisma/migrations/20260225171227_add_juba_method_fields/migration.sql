-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'RECOMP', 'PERFORMANCE', 'HEALTH');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "computed_json" JSONB,
ADD COLUMN     "performance_json" JSONB;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "body_fat" DECIMAL(5,2),
ADD COLUMN     "goal_type" "GoalType",
ADD COLUMN     "goal_weight" DECIMAL(5,2);

-- CreateIndex
CREATE INDEX "assessments_client_id_created_at_idx" ON "assessments"("client_id", "created_at");
