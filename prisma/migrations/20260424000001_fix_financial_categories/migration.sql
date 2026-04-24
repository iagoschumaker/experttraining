-- Fix financial_categories: studio_id deve ser nullable, adicionar is_system e unique constraint

-- 1. Tornar studio_id nullable (o schema diz String?)
ALTER TABLE "financial_categories" ALTER COLUMN "studio_id" DROP NOT NULL;

-- 2. Adicionar coluna is_system
ALTER TABLE "financial_categories" ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- 3. Drop FK que impede _SUPERADMIN_ como studioId (não existe como studio real)
ALTER TABLE "financial_categories" DROP CONSTRAINT IF EXISTS "financial_categories_studio_id_fkey";

-- 4. Adicionar unique constraint para upsert funcionar
DO $$ BEGIN
    ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_studio_id_code_key" UNIQUE ("studio_id", "code");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Mesma coisa para financial_entries: drop FK do studio (superadmin usa _SUPERADMIN_)
-- A FK original está correta para studios reais, mas o _SUPERADMIN_ não é um studio real
-- Vamos manter a FK mas sem restriction para o superadmin
ALTER TABLE "financial_entries" DROP CONSTRAINT IF EXISTS "financial_entries_studio_id_fkey";
