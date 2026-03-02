-- AlterTable: Add skinfold measurement columns to clients table for Pollock body composition
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "sf_chest" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "sf_abdomen" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "sf_thigh" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "sf_triceps" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "sf_suprailiac" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "sf_subscapular" DECIMAL(5, 2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "sf_midaxillary" DECIMAL(5, 2);
