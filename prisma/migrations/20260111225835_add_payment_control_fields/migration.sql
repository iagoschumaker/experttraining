/*
  Warnings:

  - You are about to drop the column `max_clients` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `max_trainers` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `price_monthly` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `price_yearly` on the `plans` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `plans` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `price_per_trainer` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `plans` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('START', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StudioStatus" ADD VALUE 'GRACE_PERIOD';
ALTER TYPE "StudioStatus" ADD VALUE 'CANCELED';

-- AlterTable - STEP 1: Add new columns with defaults/nullable
ALTER TABLE "plans" 
ADD COLUMN     "billing_rules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "min_trainers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "price_per_trainer" DECIMAL(10,2),
ADD COLUMN     "recommended_max" INTEGER,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "tier" "PlanTier" NOT NULL DEFAULT 'START';

-- STEP 2: Update existing records with values based on their names
UPDATE "plans" SET 
  "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')),
  "price_per_trainer" = 150.00,
  "min_trainers" = 1,
  "recommended_max" = 4,
  "tier" = 'START'
WHERE LOWER("name") LIKE '%basic%' OR LOWER("name") LIKE '%start%' OR LOWER("name") LIKE '%basico%';

UPDATE "plans" SET 
  "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')),
  "price_per_trainer" = 140.00,
  "min_trainers" = 5,
  "recommended_max" = 9,
  "tier" = 'PRO'
WHERE LOWER("name") LIKE '%pro%';

UPDATE "plans" SET 
  "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')),
  "price_per_trainer" = 130.00,
  "min_trainers" = 10,
  "tier" = 'PREMIUM'
WHERE LOWER("name") LIKE '%premium%' OR LOWER("name") LIKE '%enterprise%';

-- STEP 3: Set default for any remaining records
UPDATE "plans" SET 
  "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')),
  "price_per_trainer" = 150.00
WHERE "slug" IS NULL OR "price_per_trainer" IS NULL;

-- STEP 4: Make columns NOT NULL
ALTER TABLE "plans" 
ALTER COLUMN "price_per_trainer" SET NOT NULL,
ALTER COLUMN "slug" SET NOT NULL;

-- STEP 5: Drop old columns
ALTER TABLE "plans" 
DROP COLUMN "max_clients",
DROP COLUMN "max_trainers",
DROP COLUMN "price_monthly",
DROP COLUMN "price_yearly";

-- AlterTable
ALTER TABLE "studios" ADD COLUMN     "blocked_at" TIMESTAMP(3),
ADD COLUMN     "blocked_reason" TEXT,
ADD COLUMN     "grace_period_ends" TIMESTAMP(3),
ADD COLUMN     "is_paid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_payment_date" TIMESTAMP(3),
ADD COLUMN     "payment_due_date" TIMESTAMP(3),
ADD COLUMN     "payment_notes" TEXT;

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "next_billing_date" TIMESTAMP(3) NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "trial_ends_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "active_trainers" INTEGER NOT NULL,
    "total_trainers" INTEGER NOT NULL,
    "trainer_activity" JSONB NOT NULL,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "total_assessments" INTEGER NOT NULL DEFAULT 0,
    "total_workouts" INTEGER NOT NULL DEFAULT 0,
    "total_clients" INTEGER NOT NULL DEFAULT 0,
    "price_per_trainer" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "is_billed" BOOLEAN NOT NULL DEFAULT false,
    "invoice_id" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "items" JSONB NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "payment_method" TEXT,
    "payment_id" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_subscriptions" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_next_billing_date_idx" ON "subscriptions"("next_billing_date");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_studio_id_key" ON "subscriptions"("studio_id");

-- CreateIndex
CREATE INDEX "usage_records_subscription_id_idx" ON "usage_records"("subscription_id");

-- CreateIndex
CREATE INDEX "usage_records_studio_id_idx" ON "usage_records"("studio_id");

-- CreateIndex
CREATE INDEX "usage_records_period_start_idx" ON "usage_records"("period_start");

-- CreateIndex
CREATE INDEX "usage_records_period_end_idx" ON "usage_records"("period_end");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "invoices_studio_id_idx" ON "invoices"("studio_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "studio_subscriptions_studio_id_key" ON "studio_subscriptions"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "studios_is_paid_idx" ON "studios"("is_paid");

-- CreateIndex
CREATE INDEX "studios_payment_due_date_idx" ON "studios"("payment_due_date");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
