-- ============================================================================
-- KINEX PERFORMANCE — SCRIPT DE REBRANDING DO BANCO DE DADOS
-- Expert Pro Training → Kinex Performance
-- 
-- INSTRUÇÕES: Rode na VPS com:
--   psql -U postgres -d experttraining -f rebrand-kinex.sql
-- OU dentro do psql:
--   \i /var/www/experttraining/scripts/rebrand-kinex.sql
--
-- SEGURO: apenas atualiza textos/nomes, não altera estrutura nem deleta dados
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. STUDIOS — Atualiza nome do studio se ainda contiver "Expert"
-- ============================================================================
UPDATE studios
SET name = REPLACE(REPLACE(name, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE name ILIKE '%expert%';

-- ============================================================================
-- 2. STUDIOS — Atualiza slug se ainda contiver "expert"
-- (cuidado: slug precisa ser único — só muda se não existir conflito)
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
-- 3. AUDIT LOGS — Atualiza metadata com referências ao nome antigo
-- ============================================================================
UPDATE audit_logs
SET metadata = REPLACE(metadata::text, 'Expert Pro Training', 'Kinex Performance')::jsonb
WHERE metadata::text ILIKE '%expert pro training%';

UPDATE audit_logs
SET metadata = REPLACE(metadata::text, 'Expert Training', 'Kinex Performance')::jsonb
WHERE metadata::text ILIKE '%expert training%';

-- ============================================================================
-- 4. WORKOUTS — Atualiza campo methodology nos treinos gerados
-- ============================================================================
UPDATE workouts
SET schedule = REPLACE(schedule::text, 'Método Expert Training', 'Método Kinex Performance')::jsonb
WHERE schedule::text ILIKE '%Método Expert Training%';

UPDATE workouts
SET schedule = REPLACE(schedule::text, 'Expert Pro Training', 'Kinex Performance')::jsonb
WHERE schedule::text ILIKE '%Expert Pro Training%';

UPDATE workouts
SET schedule = REPLACE(schedule::text, 'Expert Training', 'Kinex Performance')::jsonb
WHERE schedule::text ILIKE '%Expert Training%';

-- ============================================================================
-- 5. FINANCIAL ENTRIES — Descrições que mencionem o nome antigo
-- ============================================================================
UPDATE financial_entries
SET description = REPLACE(REPLACE(description, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE description ILIKE '%expert%';

-- ============================================================================
-- 6. FINANCIAL CATEGORIES — Descrições/nomes de categorias
-- ============================================================================
UPDATE financial_categories
SET name = REPLACE(REPLACE(name, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE name ILIKE '%expert%';

UPDATE financial_categories
SET description = REPLACE(REPLACE(description, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE description ILIKE '%expert%';

-- ============================================================================
-- 7. CLIENTS — Campo notes/objectives/history com referência ao nome antigo
-- ============================================================================
UPDATE clients
SET notes = REPLACE(REPLACE(notes, 'Expert Pro Training', 'Kinex Performance'), 'Expert Training', 'Kinex Performance')
WHERE notes ILIKE '%expert%';

-- ============================================================================
-- 8. STUDIO SETTINGS — JSON de configurações
-- ============================================================================
UPDATE studios
SET settings = REPLACE(settings::text, 'Expert Pro Training', 'Kinex Performance')::jsonb
WHERE settings::text ILIKE '%expert pro training%';

UPDATE studios
SET settings = REPLACE(settings::text, 'Expert Training', 'Kinex Performance')::jsonb
WHERE settings::text ILIKE '%expert training%';

-- ============================================================================
-- VERIFICAÇÃO — Mostra o que foi alterado
-- ============================================================================
SELECT 'Studios atualizados:' AS info, COUNT(*) AS total
FROM studios
WHERE name ILIKE '%kinex%'
UNION ALL
SELECT 'Treinos com metodologia atualizada:', COUNT(*)
FROM workouts
WHERE schedule::text ILIKE '%kinex%'
UNION ALL
SELECT 'Lançamentos financeiros atualizados:', COUNT(*)
FROM financial_entries
WHERE description ILIKE '%kinex%';

COMMIT;

-- ============================================================================
-- FIM DO SCRIPT
-- Todos os dados foram preservados, apenas os textos foram atualizados.
-- ============================================================================
