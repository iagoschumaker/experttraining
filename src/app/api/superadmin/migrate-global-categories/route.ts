// ============================================================================
// KINEX PERFORMANCE — MIGRAÇÃO DE CATEGORIAS PARA GLOBAIS (SUPERADMIN ONLY)
// ============================================================================
// POST /api/superadmin/migrate-global-categories
// 1. Cria categorias globais (studioId: null, isSystem: true)
// 2. Para cada FinancialEntry: migra categoryId per-studio → global (por code)
// 3. Desativa categorias per-studio após migração
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { seedGlobalCategories } from '@/services/financialCategories'

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const report = {
      globalCategoriesCreated: 0,
      globalCategoriesUpdated: 0,
      entriesMigrated: 0,
      perStudioCategoriesDeactivated: 0,
      errors: [] as string[],
    }

    // ─── 1. Criar/atualizar categorias globais ──────────────────────────────
    const seedResult = await seedGlobalCategories()
    report.globalCategoriesCreated = seedResult.created
    report.globalCategoriesUpdated = seedResult.updated

    // ─── 2. Buscar todas as categorias globais flat ─────────────────────────
    const globalCats = await prisma.financialCategory.findMany({
      where: { studioId: null, isSystem: true, isActive: true },
      select: { id: true, code: true },
    })
    // Mapa: code → global ID
    const codeToGlobalId: Record<string, string> = {}
    for (const gc of globalCats) {
      codeToGlobalId[gc.code] = gc.id
    }

    // ─── 3. Buscar todas as categorias per-studio ───────────────────────────
    const perStudioCats = await prisma.financialCategory.findMany({
      where: { studioId: { not: null } },
      select: { id: true, code: true, studioId: true },
    })

    // Mapa: perStudio ID → global ID
    const perStudioToGlobal: Record<string, string> = {}
    const unmatched: string[] = []

    for (const psc of perStudioCats) {
      const globalId = codeToGlobalId[psc.code]
      if (globalId) {
        perStudioToGlobal[psc.id] = globalId
      } else {
        unmatched.push(`code: ${psc.code} (studio: ${psc.studioId})`)
      }
    }

    if (unmatched.length > 0) {
      report.errors.push(`Categorias sem correspondência global: ${unmatched.join(', ')}`)
    }

    // ─── 4. Migrar FinancialEntry: atualizar categoryId ─────────────────────
    // Agrupar por globalId para fazer updateMany eficientemente
    const globalIdToPerStudioIds: Record<string, string[]> = {}
    for (const perStudioId of Object.keys(perStudioToGlobal)) {
      const globalId = perStudioToGlobal[perStudioId]
      if (!globalIdToPerStudioIds[globalId]) globalIdToPerStudioIds[globalId] = []
      globalIdToPerStudioIds[globalId].push(perStudioId)
    }

    for (const globalId of Object.keys(globalIdToPerStudioIds)) {
      const perStudioIds = globalIdToPerStudioIds[globalId]
      const result = await prisma.financialEntry.updateMany({
        where: { categoryId: { in: perStudioIds } },
        data: { categoryId: globalId },
      })
      report.entriesMigrated += result.count
    }

    // ─── 5. Desativar categorias per-studio ─────────────────────────────────
    const perStudioIds = perStudioCats.map(c => c.id)
    if (perStudioIds.length > 0) {
      const deactivated = await prisma.financialCategory.updateMany({
        where: { id: { in: perStudioIds } },
        data: { isActive: false },
      })
      report.perStudioCategoriesDeactivated = deactivated.count
    }

    return NextResponse.json({
      success: true,
      message: 'Migração concluída com sucesso',
      report,
    })
  } catch (error) {
    console.error('Migrate global categories error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// GET: checar status da migração
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const [globalCount, perStudioActive, perStudioTotal, entriesTotal] = await Promise.all([
      prisma.financialCategory.count({ where: { studioId: null, isSystem: true, isActive: true } }),
      prisma.financialCategory.count({ where: { studioId: { not: null }, isActive: true } }),
      prisma.financialCategory.count({ where: { studioId: { not: null } } }),
      prisma.financialEntry.count(),
    ])

    return NextResponse.json({
      success: true,
      status: {
        globalCategories: globalCount,
        perStudioActive,
        perStudioTotal,
        migrationNeeded: perStudioActive > 0,
        totalEntries: entriesTotal,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
