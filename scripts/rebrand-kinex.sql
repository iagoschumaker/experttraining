-- ============================================================================
-- KINEX PERFORMANCE — SCRIPT DE REBRANDING DO BANCO DE DADOS (v2 - CORRIGIDO)
-- Expert Pro Training → Kinex Performance
--
-- COMO RODAR NA VPS:
--   PGPASSWORD="SuaSenhaSegura123!" psql -U expertuser -h localhost -d experttraining -f scripts/rebrand-kinex.sql
--
-- SEGURO: apenas atualiza textos, não altera estrutura nem deleta dados
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. STUDIOS — Atualiza nome do studio se contiver "Expert"
-- ============================================================================
UPDATE studios
SET name = REPLACE(REPLACE(name, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE name ILIKE '%expert%';

-- ============================================================================
-- 2. STUDIOS — Atualiza slug (apenas se não gerar conflito de unicidade)
-- ============================================================================
UPDATE studios
SET slug = REPLACE(REPLACE(slug, 'expertprotraining', 'kinexperformance'), 'expert-training', 'kinex-performance')
WHERE slug ILIKE '%expert%'
  AND NOT EXISTS (
    SELECT 1 FROM studios s2
    WHERE s2.slug = REPLACE(REPLACE(studios.slug, 'expertprotraining', 'kinexperformance'), 'expert-training', 'kinex-performance')
      AND s2.id <> studios.id
  );

-- ============================================================================
-- 3. STUDIOS — JSON de configurações (settings)
-- ============================================================================
UPDATE studios
SET settings = REPLACE(settings::text, 'Expert Pro Training', 'Kinex Performance')::jsonb
WHERE settings IS NOT NULL AND settings::text ILIKE '%expert pro training%';

UPDATE studios
SET settings = REPLACE(settings::text, 'Expert Training', 'Kinex Performance')::jsonb
WHERE settings IS NOT NULL AND settings::text ILIKE '%expert training%';

-- ============================================================================
-- 4. WORKOUTS — Campo schedule_json (nome correto da coluna no banco)
-- ============================================================================
UPDATE workouts
SET schedule_json = REPLACE(schedule_json::text, 'Método Expert Training', 'Método Kinex Performance')::jsonb
WHERE schedule_json::text ILIKE '%Método Expert Training%';

UPDATE workouts
SET schedule_json = REPLACE(schedule_json::text, 'Método Expert Pro Training', 'Método Kinex Performance')::jsonb
WHERE schedule_json::text ILIKE '%Método Expert Pro Training%';

UPDATE workouts
SET schedule_json = REPLACE(schedule_json::text, 'Expert Pro Training', 'Kinex Performance')::jsonb
WHERE schedule_json::text ILIKE '%Expert Pro Training%';

UPDATE workouts
SET schedule_json = REPLACE(schedule_json::text, 'Expert Training', 'Kinex Performance')::jsonb
WHERE schedule_json::text ILIKE '%Expert Training%';

-- ============================================================================
-- 5. WORKOUTS — Campo template_json (templates antigos)
-- ============================================================================
UPDATE workouts
SET template_json = REPLACE(template_json::text, 'Expert Pro Training', 'Kinex Performance')::jsonb
WHERE template_json IS NOT NULL AND template_json::text ILIKE '%expert%';

UPDATE workouts
SET template_json = REPLACE(template_json::text, 'Expert Training', 'Kinex Performance')::jsonb
WHERE template_json IS NOT NULL AND template_json::text ILIKE '%expert training%';

-- ============================================================================
-- 6. FINANCIAL ENTRIES — Descrições de lançamentos
-- ============================================================================
UPDATE financial_entries
SET description = REPLACE(REPLACE(description, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE description ILIKE '%expert%';

-- ============================================================================
-- 7. FINANCIAL CATEGORIES — Nomes e descrições de categorias
-- ============================================================================
UPDATE financial_categories
SET name = REPLACE(REPLACE(name, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE name ILIKE '%expert%';

UPDATE financial_categories
SET description = REPLACE(REPLACE(description, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE description IS NOT NULL AND description ILIKE '%expert%';

-- ============================================================================
-- 8. CLIENTS — Campo notes
-- ============================================================================
UPDATE clients
SET notes = REPLACE(REPLACE(notes, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE notes IS NOT NULL AND notes ILIKE '%expert%';

-- ============================================================================
-- 9. AUDIT LOGS — Metadata JSON
-- ============================================================================
UPDATE audit_logs
SET metadata = REPLACE(metadata::text, 'Expert Pro Training', 'Kinex Performance')::jsonb
WHERE metadata IS NOT NULL AND metadata::text ILIKE '%expert pro training%';

UPDATE audit_logs
SET metadata = REPLACE(metadata::text, 'Expert Training', 'Kinex Performance')::jsonb
WHERE metadata IS NOT NULL AND metadata::text ILIKE '%expert training%';

-- ============================================================================
-- VERIFICAÇÃO FINAL — Mostra quantos registros foram atualizados
-- ============================================================================
SELECT 'Studios com nome Kinex:' AS info, COUNT(*) AS total
FROM studios WHERE name ILIKE '%kinex%'
UNION ALL
SELECT 'Workouts com Kinex no schedule_json:', COUNT(*)
FROM workouts WHERE schedule_json::text ILIKE '%kinex%'
UNION ALL
SELECT 'Lançamentos financeiros com Kinex:', COUNT(*)
FROM financial_entries WHERE description ILIKE '%kinex%'
UNION ALL
SELECT 'Categorias financeiras com Kinex:', COUNT(*)
FROM financial_categories WHERE name ILIKE '%kinex%';

COMMIT;

-- ============================================================================
-- FIM — Nenhum dado foi perdido, apenas textos atualizados.
-- ============================================================================
