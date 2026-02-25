-- AlterTable: Add bilateral body measurements to clients table
ALTER TABLE "clients" ADD COLUMN "arm_right" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN "arm_left" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN "forearm_right" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN "forearm_left" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN "thigh_right" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN "thigh_left" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN "calf_right" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN "calf_left" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN "abdomen" DECIMAL(5, 2);
