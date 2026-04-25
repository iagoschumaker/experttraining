// ============================================================================
// EXPERT PRO TRAINING — RECURRENCE MANAGEMENT API
// ============================================================================
// GET    — List entries from a recurrence
// DELETE — Cancel all PENDING entries from a recurrence
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const recurrenceId = new URL(request.url).searchParams.get('id')
  if (!recurrenceId) {
    return NextResponse.json({ success: false, error: 'ID de recorrência obrigatório' }, { status: 400 })
  }

  try {
    const entries = await prisma.financialEntry.findMany({
      where: { studioId: auth.studioId, recurrenceId },
      include: { category: { select: { code: true, name: true } } },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: entries.map(e => ({ ...e, amount: parseFloat(e.amount.toString()) })),
    })
  } catch (error) {
    console.error('Recurrence list error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const recurrenceId = new URL(request.url).searchParams.get('id')
  if (!recurrenceId) {
    return NextResponse.json({ success: false, error: 'ID de recorrência obrigatório' }, { status: 400 })
  }

  try {
    const result = await prisma.financialEntry.updateMany({
      where: {
        studioId: auth.studioId,
        recurrenceId,
        status: 'PENDING',
      },
      data: { status: 'CANCELED' },
    })

    return NextResponse.json({
      success: true,
      message: `${result.count} lançamentos pendentes cancelados`,
    })
  } catch (error) {
    console.error('Cancel recurrence error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao cancelar' }, { status: 500 })
  }
}
