// ============================================================================
// EXPERT PRO TRAINING — QUITAR MENSALIDADES API
// ============================================================================
// POST /api/studio/financeiro/mensalidades/quitar
//   Body: { recurrenceId, monthsCount, paymentMethod }
//   → Quita os próximos N meses (PENDING/OVERDUE) de uma recorrência
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    const body = await request.json()
    const { recurrenceId, monthsCount, paymentMethod } = body

    if (!recurrenceId || !monthsCount) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: recurrenceId, monthsCount' },
        { status: 400 }
      )
    }

    const count = parseInt(monthsCount)
    if (count < 1 || count > 24) {
      return NextResponse.json(
        { success: false, error: 'monthsCount deve ser entre 1 e 24' },
        { status: 400 }
      )
    }

    // Buscar os próximos N lançamentos PENDING ou OVERDUE da recorrência (mais antigos primeiro)
    const unpaidEntries = await prisma.financialEntry.findMany({
      where: {
        studioId,
        recurrenceId,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      orderBy: { date: 'asc' },
      take: count,
    })

    if (unpaidEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum lançamento pendente encontrado para esta recorrência' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Atualizar cada entrada como PAID
    const updated = await Promise.all(
      unpaidEntries.map(entry =>
        prisma.financialEntry.update({
          where: { id: entry.id },
          data: {
            status: 'PAID',
            paidAt: now,
            paymentMethod: paymentMethod || null,
          },
          include: {
            category: { select: { code: true, name: true } },
            client: { select: { name: true } },
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: updated.map(e => ({ ...e, amount: parseFloat(e.amount.toString()) })),
      message: `${updated.length} ${updated.length === 1 ? 'mensalidade quitada' : 'mensalidades quitadas'}`,
    })
  } catch (error) {
    console.error('Quitar mensalidades error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao quitar mensalidades' }, { status: 500 })
  }
}
