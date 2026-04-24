// ============================================================================
// SUPERADMIN DRE API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

const SUPERADMIN_STUDIO_ID = '_SUPERADMIN_'

export async function GET(request: NextRequest) {
  const token = await getAccessTokenCookie()
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload?.isSuperAdmin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const period = searchParams.get('period') || 'month'

  let startDate: Date, endDate: Date
  if (period === 'year') { startDate = new Date(year, 0, 1); endDate = new Date(year, 11, 31, 23, 59, 59) }
  else if (period === 'quarter') { const q = Math.ceil(month / 3); startDate = new Date(year, (q-1)*3, 1); endDate = new Date(year, q*3, 0, 23, 59, 59) }
  else { startDate = new Date(year, month - 1, 1); endDate = new Date(year, month, 0, 23, 59, 59) }

  try {
    const categories = await prisma.financialCategory.findMany({
      where: { studioId: SUPERADMIN_STUDIO_ID, isActive: true },
      orderBy: { code: 'asc' },
    })

    const entries = await prisma.financialEntry.findMany({
      where: { studioId: SUPERADMIN_STUDIO_ID, date: { gte: startDate, lte: endDate }, status: { in: ['PAID', 'PENDING'] } },
      select: { categoryId: true, type: true, amount: true, status: true },
    })

    const catTotals: Record<string, { paid: number; pending: number }> = {}
    for (const e of entries) {
      if (!catTotals[e.categoryId]) catTotals[e.categoryId] = { paid: 0, pending: 0 }
      const amt = parseFloat(e.amount.toString())
      if (e.status === 'PAID') catTotals[e.categoryId].paid += amt
      else catTotals[e.categoryId].pending += amt
    }

    const buildNode = (cat: typeof categories[0]): any => {
      const children = categories.filter(c => c.parentId === cat.id).map(buildNode)
      const direct = catTotals[cat.id] || { paid: 0, pending: 0 }
      const childPaid = children.reduce((s: number, c: any) => s + c.totalPaid, 0)
      const childPend = children.reduce((s: number, c: any) => s + c.totalPending, 0)
      return {
        id: cat.id, code: cat.code, name: cat.name, type: cat.type,
        totalPaid: direct.paid + childPaid, totalPending: direct.pending + childPend,
        total: direct.paid + direct.pending + childPaid + childPend, children,
      }
    }

    const dre = categories.filter(c => !c.parentId).map(buildNode)
    const totalReceita = dre.filter((c: any) => c.type === 'RECEITA').reduce((s: number, c: any) => s + c.total, 0)
    const totalCusto = dre.filter((c: any) => c.type === 'CUSTO').reduce((s: number, c: any) => s + c.total, 0)
    const totalDespesa = dre.filter((c: any) => c.type === 'DESPESA').reduce((s: number, c: any) => s + c.total, 0)
    const lucroBruto = totalReceita - totalCusto
    const lucroLiquido = lucroBruto - totalDespesa

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate, endDate, type: period, month, year },
        summary: { totalReceita, totalCusto, totalDespesa, lucroBruto, lucroLiquido, margem: totalReceita > 0 ? ((lucroLiquido / totalReceita) * 100).toFixed(1) : '0.0' },
        dre,
      },
    })
  } catch (error) {
    console.error('SA DRE error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}
