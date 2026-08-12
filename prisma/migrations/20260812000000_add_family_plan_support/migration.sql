-- AlterTable: add family plan columns to studio_plans
ALTER TABLE "studio_plans" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "studio_plans" ADD COLUMN IF NOT EXISTS "price_per_dependent" DECIMAL(10,2);
ALTER TABLE "studio_plans" ADD COLUMN IF NOT EXISTS "max_dependents" INTEGER;

-- AlterTable: add family_holder_id to client_mensalidades
ALTER TABLE "client_mensalidades" ADD COLUMN IF NOT EXISTS "family_holder_id" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'client_mensalidades_family_holder_id_fkey'
  ) THEN
    ALTER TABLE "client_mensalidades"
      ADD CONSTRAINT "client_mensalidades_family_holder_id_fkey"
      FOREIGN KEY ("family_holder_id") REFERENCES "client_mensalidades"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "client_mensalidades_family_holder_id_idx" ON "client_mensalidades"("family_holder_id");

-- CreateEnum type (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanType') THEN
    CREATE TYPE "PlanType" AS ENUM ('INDIVIDUAL', 'FAMILIA');
  END IF;
END $$;
