// ============================================================================
// ADMIN - APPLY PENDING MIGRATIONS
// ============================================================================
// POST /api/admin/migrate - Aplica SQLs pendentes direto no banco
// Protegido por STUDIO_ADMIN auth
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

const MIGRATIONS = [
  {
    name: '20260414_add_training_phases',
    sqls: [
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingPhase') THEN CREATE TYPE "TrainingPhase" AS ENUM ('CONDICIONAMENTO_1','CONDICIONAMENTO_2','HIPERTROFIA','FORCA','POTENCIA','RESISTENCIA','METABOLICO','HIPERTROFIA_2','FORCA_2','RESISTENCIA_2','METABOLICO_2'); END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientObjective') THEN CREATE TYPE "ClientObjective" AS ENUM ('EMAGRECIMENTO','HIPERTROFIA_OBJ','PERFORMANCE','REABILITACAO'); END IF; END $$;`,
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "objective" "ClientObjective"`,
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "current_phase" "TrainingPhase"`,
      `ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "selected_phase" "TrainingPhase"`,
      `ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "objective" "ClientObjective"`,
      `ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "phase" "TrainingPhase"`,
      `ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "assessment_id" TEXT`,
      `ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "template_json" JSONB`,
      `ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "target_weeks" INTEGER NOT NULL DEFAULT 6`,
      `ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "sessions_per_week" INTEGER NOT NULL DEFAULT 3`,
      `ALTER TABLE "workouts" ADD COLUMN IF NOT EXISTS "sessions_completed" INTEGER NOT NULL DEFAULT 0`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'workouts_assessment_id_fkey') THEN ALTER TABLE "workouts" ADD CONSTRAINT "workouts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,
    ],
  },
  {
    name: '20260416_add_gestante_protocol',
    sqls: [
      `DO $$ BEGIN ALTER TYPE "ClientObjective" ADD VALUE IF NOT EXISTS 'GESTANTE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN ALTER TYPE "TrainingPhase" ADD VALUE IF NOT EXISTS 'GESTANTE_T1'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN ALTER TYPE "TrainingPhase" ADD VALUE IF NOT EXISTS 'GESTANTE_T2'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN ALTER TYPE "TrainingPhase" ADD VALUE IF NOT EXISTS 'GESTANTE_T3_A'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN ALTER TYPE "TrainingPhase" ADD VALUE IF NOT EXISTS 'GESTANTE_T3_B'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "gestational_week" INTEGER`,
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3)`,
    ],
  },
]

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const results: { migration: string; status: string; error?: string }[] = []

  for (const migration of MIGRATIONS) {
    for (const sql of migration.sqls) {
      try {
        await prisma.$executeRawUnsafe(sql)
        results.push({ migration: migration.name, status: 'ok' })
      } catch (error: any) {
        results.push({
          migration: migration.name,
          status: 'error',
          error: error.message?.substring(0, 200),
        })
      }
    }
  }

  const hasErrors = results.some(r => r.status === 'error')

  return NextResponse.json({
    success: !hasErrors,
    message: hasErrors ? 'Algumas migrations falharam' : 'Todas migrations aplicadas com sucesso',
    results,
  })
}
