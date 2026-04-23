// ============================================================================
// EXPERT PRO TRAINING — FINANCIAL DASHBOARD API
// ============================================================================
// GET /api/studio/financeiro/dashboard — Métricas financeiras resumidas
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

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  try {
    // Buscar todos os lançamentos do período
    const entries = await prisma.financialEntry.findMany({
      where: {
        studioId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        category: { select: { code: true, name: true, type: true } },
      },
    })

    // Calcular totais
    let totalReceita = 0
    let totalDespesa = 0
    let totalPago = 0
    let totalPendente = 0
    let totalVencido = 0

    const now = new Date()

    for (const entry of entries) {
      const amount = parseFloat(entry.amount.toString())

      if (entry.type === 'RECEITA') {
        totalReceita += amount
      } else {
        totalDespesa += amount
      }

      if (entry.status === 'PAID') {
        totalPago += amount
      } else if (entry.status === 'PENDING') {
        if (entry.dueDate && entry.dueDate < now) {
          totalVencido += amount
        } else {
          totalPendente += amount
        }
      }
    }

    // Contas a vencer nos próximos 7 dias
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const upcomingDue = await prisma.financialEntry.findMany({
      where: {
        studioId,
        status: 'PENDING',
        dueDate: { gte: now, lte: sevenDaysFromNow },
      },
      include: {
        category: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    })

    // Últimas 10 movimentações
    const recentEntries = await prisma.financialEntry.findMany({
      where: { studioId },
      include: {
        category: { select: { code: true, name: true } },
        client: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Receita vs Despesa por mês (últimos 6 meses)
    const sixMonthsAgo = new Date(year, month - 7, 1)
    const monthlyData = await prisma.financialEntry.findMany({
      where: {
        studioId,
        date: { gte: sixMonthsAgo, lte: endDate },
        status: { in: ['PAID', 'PENDING'] },
      },
      select: { type: true, amount: true, date: true },
    })

    const monthlyChart: Record<string, { receita: number; despesa: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyChart[key] = { receita: 0, despesa: 0 }
    }

    for (const entry of monthlyData) {
      const d = new Date(entry.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyChart[key]) {
        const amt = parseFloat(entry.amount.toString())
        if (entry.type === 'RECEITA') {
          monthlyChart[key].receita += amt
        } else {
          monthlyChart[key].despesa += amt
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        period: { month, year },
        summary: {
          totalReceita,
          totalDespesa,
          lucro: totalReceita - totalDespesa,
          totalPago,
          totalPendente,
          totalVencido,
          totalEntries: entries.length,
        },
        upcomingDue: upcomingDue.map(e => ({
          ...e,
          amount: parseFloat(e.amount.toString()),
        })),
        recentEntries: recentEntries.map(e => ({
          ...e,
          amount: parseFloat(e.amount.toString()),
        })),
        monthlyChart: Object.entries(monthlyChart).map(([month, data]) => ({
          month,
          ...data,
        })),
      },
    })
  } catch (error) {
    console.error('Financial dashboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar dashboard' },
      { status: 500 }
    )
  }
}
