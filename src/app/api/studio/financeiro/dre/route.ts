// ============================================================================
// EXPERT PRO TRAINING — DRE API
// ============================================================================
// GET /api/studio/financeiro/dre — Demonstração do Resultado do Exercício
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const period = searchParams.get('period') || 'month' // month | quarter | year

  // Calcular período
  let startDate: Date, endDate: Date
  if (period === 'year') {
    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59)
  } else if (period === 'quarter') {
    const quarter = Math.ceil(month / 3)
    startDate = new Date(year, (quarter - 1) * 3, 1)
    endDate = new Date(year, quarter * 3, 0, 23, 59, 59)
  } else {
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 0, 23, 59, 59)
  }

  try {
    // Buscar todas as categorias do studio
    const categories = await prisma.financialCategory.findMany({
      where: { studioId, isActive: true },
      orderBy: { code: 'asc' },
    })

    // Buscar lançamentos pagos do período
    const entries = await prisma.financialEntry.findMany({
      where: {
        studioId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'PENDING'] },
      },
      select: {
        categoryId: true,
        type: true,
        amount: true,
        status: true,
      },
    })

    // Agrupar valores por categoria
    const categoryTotals: Record<string, { paid: number; pending: number }> = {}
    for (const entry of entries) {
      if (!categoryTotals[entry.categoryId]) {
        categoryTotals[entry.categoryId] = { paid: 0, pending: 0 }
      }
      const amount = parseFloat(entry.amount.toString())
      if (entry.status === 'PAID') {
        categoryTotals[entry.categoryId].paid += amount
      } else {
        categoryTotals[entry.categoryId].pending += amount
      }
    }

    // Montar DRE hierárquico
    const buildDRENode = (cat: typeof categories[0]): any => {
      const children = categories
        .filter(c => c.parentId === cat.id)
        .map(buildDRENode)

      const directTotal = categoryTotals[cat.id] || { paid: 0, pending: 0 }
      const childrenPaid = children.reduce((sum: number, c: any) => sum + c.totalPaid, 0)
      const childrenPending = children.reduce((sum: number, c: any) => sum + c.totalPending, 0)

      return {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        type: cat.type,
        totalPaid: directTotal.paid + childrenPaid,
        totalPending: directTotal.pending + childrenPending,
        total: directTotal.paid + directTotal.pending + childrenPaid + childrenPending,
        children,
      }
    }

    const rootCategories = categories.filter(c => !c.parentId)
    const dreTree = rootCategories.map(buildDRENode)

    // Calcular totais gerais
    const totalReceita = dreTree
      .filter((c: any) => c.type === 'RECEITA')
      .reduce((sum: number, c: any) => sum + c.total, 0)

    const totalCusto = dreTree
      .filter((c: any) => c.type === 'CUSTO')
      .reduce((sum: number, c: any) => sum + c.total, 0)

    const totalDespesa = dreTree
      .filter((c: any) => c.type === 'DESPESA')
      .reduce((sum: number, c: any) => sum + c.total, 0)

    const lucroBruto = totalReceita - totalCusto
    const lucroLiquido = lucroBruto - totalDespesa

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate, endDate, type: period, month, year },
        summary: {
          totalReceita,
          totalCusto,
          totalDespesa,
          lucroBruto,
          lucroLiquido,
          margem: totalReceita > 0 ? ((lucroLiquido / totalReceita) * 100).toFixed(1) : '0.0',
        },
        dre: dreTree,
      },
    })
  } catch (error) {
    console.error('DRE error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar DRE' },
      { status: 500 }
    )
  }
}
