-- ============================================================================
-- KINEX PERFORMANCE — Migração: Sistema de Mensalidades Recorrentes
-- Rodar na VPS: PGPASSWORD="SuaSenhaSegura123!" psql -U expertuser -h localhost -d experttraining -f scripts/migrate-mensalidades.sql
-- SEGURO: não altera dados existentes, apenas adiciona tabela nova
-- ============================================================================

BEGIN;

-- 1. Criar tipos enum
DO $$ BEGIN
  CREATE TYPE "MensalidadeCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MensalidadeStatus" AS ENUM ('ACTIVE', 'PENDING', 'OVERDUE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Criar tabela client_mensalidades
CREATE TABLE IF NOT EXISTS "client_mensalidades" (
  "id"                TEXT NOT NULL,
  "client_id"         TEXT NOT NULL,
  "studio_id"         TEXT NOT NULL,
  "billing_cycle"     "MensalidadeCycle" NOT NULL DEFAULT 'MONTHLY',
  "amount"            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "adhesion_date"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "next_billing_date" TIMESTAMP(3) NOT NULL,
  "last_payment_date" TIMESTAMP(3),
  "status"            "MensalidadeStatus" NOT NULL DEFAULT 'PENDING',
  "notes"             TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "client_mensalidades_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_mensalidades_client_id_studio_id_key" UNIQUE ("client_id", "studio_id"),
  CONSTRAINT "client_mensalidades_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE,
  CONSTRAINT "client_mensalidades_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "client_mensalidades_studio_id_next_billing_date_idx"
  ON "client_mensalidades"("studio_id", "next_billing_date");
CREATE INDEX IF NOT EXISTS "client_mensalidades_studio_id_status_idx"
  ON "client_mensalidades"("studio_id", "status");

-- 3. Migrar dados de alunos que JÁ TÊM lançamentos de mensalidade
-- Usa financial_entries existentes para reconstruir o histórico
INSERT INTO "client_mensalidades" (
  "id", "client_id", "studio_id", "billing_cycle", "amount",
  "adhesion_date", "next_billing_date", "last_payment_date",
  "status", "created_at", "updated_at"
)
SELECT
  -- ID único por cliente
  CONCAT('mens_', LEFT(MD5(CONCAT(fe.client_id, fe.studio_id)), 20)),
  fe.client_id,
  fe.studio_id,
  'MONTHLY'::"MensalidadeCycle",
  -- Valor: média das mensalidades PAGAS (ou PENDENTE se nenhuma paga)
  COALESCE(
    ROUND(AVG(fe.amount) FILTER (WHERE fe.status = 'PAID'), 2),
    ROUND(AVG(fe.amount), 2)
  ),
  -- Data de adesão: primeiro lançamento
  DATE_TRUNC('day', MIN(fe.date))::timestamp,
  -- Próxima cobrança: 1º do próximo mês
  DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
  -- Último pagamento
  MAX(fe.paid_at) FILTER (WHERE fe.status = 'PAID'),
  -- Status baseado nos lançamentos existentes
  CASE
    WHEN COUNT(*) FILTER (WHERE fe.status = 'OVERDUE') > 0 THEN
      'OVERDUE'::"MensalidadeStatus"
    WHEN COUNT(*) FILTER (
      WHERE fe.status = 'PAID'
      AND DATE_TRUNC('month', fe.date) = DATE_TRUNC('month', NOW())
    ) > 0 THEN
      'ACTIVE'::"MensalidadeStatus"
    WHEN COUNT(*) FILTER (WHERE fe.status = 'PENDING') > 0 THEN
      'PENDING'::"MensalidadeStatus"
    ELSE
      'ACTIVE'::"MensalidadeStatus"
  END,
  NOW(),
  NOW()
FROM "financial_entries" fe
WHERE fe.type = 'RECEITA'
  AND fe.status != 'CANCELED'
  AND fe.client_id IS NOT NULL
GROUP BY fe.client_id, fe.studio_id
ON CONFLICT ("client_id", "studio_id") DO NOTHING;

-- 4. Criar mensalidade PENDING para alunos SEM NENHUM lançamento
-- (studios que já têm módulo FINANCEIRO ativo)
INSERT INTO "client_mensalidades" (
  "id", "client_id", "studio_id", "billing_cycle", "amount",
  "adhesion_date", "next_billing_date", "status", "created_at", "updated_at"
)
SELECT
  CONCAT('mens_', LEFT(MD5(CONCAT(c.id, c.studio_id, 'auto')), 20)),
  c.id,
  c.studio_id,
  'MONTHLY'::"MensalidadeCycle",
  0.00,
  NOW(),
  DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
  'PENDING'::"MensalidadeStatus",
  NOW(),
  NOW()
FROM "clients" c
JOIN "studios" s ON s.id = c.studio_id
WHERE c.is_active = true
  AND 'FINANCEIRO' = ANY(s.modules)
  AND NOT EXISTS (
    SELECT 1 FROM "client_mensalidades" cm
    WHERE cm.client_id = c.id AND cm.studio_id = c.studio_id
  )
ON CONFLICT ("client_id", "studio_id") DO NOTHING;

-- 5. Verificação
SELECT
  'Mensalidades criadas' AS descricao,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') AS ativas,
  COUNT(*) FILTER (WHERE status = 'PENDING') AS pendentes,
  COUNT(*) FILTER (WHERE status = 'OVERDUE') AS atrasadas,
  COUNT(*) FILTER (WHERE amount = 0) AS sem_valor_configurado
FROM "client_mensalidades";

COMMIT;
