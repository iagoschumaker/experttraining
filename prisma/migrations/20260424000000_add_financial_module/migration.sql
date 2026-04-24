-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FinancialEntryType" AS ENUM ('RECEITA', 'CUSTO', 'DESPESA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FinancialCategoryType" AS ENUM ('RECEITA', 'CUSTO', 'DESPESA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FinancialEntryStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'CHEQUE', 'TRANSFERENCIA', 'BOLETO', 'PARCELADO', 'OUTRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClientSubStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELED', 'PAUSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add modules column to studios (with default)
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "modules" TEXT[] DEFAULT ARRAY['TREINO']::TEXT[];

-- Update existing studios that don't have modules set
UPDATE "studios" SET "modules" = ARRAY['TREINO'] WHERE "modules" IS NULL OR array_length("modules", 1) IS NULL;

-- CreateTable: studio_units
CREATE TABLE IF NOT EXISTS "studio_units" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable: financial_categories
CREATE TABLE IF NOT EXISTS "financial_categories" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialCategoryType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: financial_entries
CREATE TABLE IF NOT EXISTS "financial_entries" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "category_id" TEXT NOT NULL,
    "client_id" TEXT,
    "type" "FinancialEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "due_date" DATE,
    "paid_at" TIMESTAMP(3),
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethod",
    "recurrence_id" TEXT,
    "installment" INTEGER,
    "total_installments" INTEGER,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: client_plans
CREATE TABLE IF NOT EXISTS "client_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "trial_days" INTEGER,
    "features" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: client_subscriptions
CREATE TABLE IF NOT EXISTS "client_subscriptions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "ClientSubStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "financial_categories_studio_id_idx" ON "financial_categories"("studio_id");
CREATE INDEX IF NOT EXISTS "financial_entries_studio_id_date_idx" ON "financial_entries"("studio_id", "date");
CREATE INDEX IF NOT EXISTS "financial_entries_studio_id_status_idx" ON "financial_entries"("studio_id", "status");
CREATE INDEX IF NOT EXISTS "financial_entries_studio_id_category_id_idx" ON "financial_entries"("studio_id", "category_id");
CREATE INDEX IF NOT EXISTS "financial_entries_client_id_idx" ON "financial_entries"("client_id");
CREATE INDEX IF NOT EXISTS "financial_entries_due_date_idx" ON "financial_entries"("due_date");
CREATE INDEX IF NOT EXISTS "client_subscriptions_client_id_idx" ON "client_subscriptions"("client_id");
CREATE INDEX IF NOT EXISTS "client_subscriptions_studio_id_idx" ON "client_subscriptions"("studio_id");
CREATE INDEX IF NOT EXISTS "client_subscriptions_status_idx" ON "client_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "client_subscriptions_end_date_idx" ON "client_subscriptions"("end_date");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "studio_units" ADD CONSTRAINT "studio_units_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "studio_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "client_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
