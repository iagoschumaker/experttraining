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
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const url = new URL(request.url)
  const recurrenceId = url.searchParams.get('id')
  const force = url.searchParams.get('force') === 'true'

  if (!recurrenceId) {
    return NextResponse.json({ success: false, error: 'ID de recorrência obrigatório' }, { status: 400 })
  }

  try {
    // Verificar que as entries pertencem ao studio
    const entries = await prisma.financialEntry.findMany({
      where: { studioId: auth.studioId, recurrenceId },
      select: { id: true, status: true },
    })

    if (entries.length === 0) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 })
    }

    if (force) {
      // Deletar TODAS as entries do contrato (hard delete)
      const result = await prisma.financialEntry.deleteMany({
        where: { studioId: auth.studioId, recurrenceId },
      })
      return NextResponse.json({
        success: true,
        message: `Contrato excluído (${result.count} lançamentos removidos)`,
      })
    } else {
      // Cancelar apenas PENDING/OVERDUE (soft cancel)
      const result = await prisma.financialEntry.updateMany({
        where: {
          studioId: auth.studioId,
          recurrenceId,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        data: { status: 'CANCELED' },
      })
      return NextResponse.json({
        success: true,
        message: result.count > 0
          ? `${result.count} lançamentos pendentes cancelados`
          : 'Nenhum lançamento pendente para cancelar. Use "Excluir contrato" para remover completamente.',
      })
    }
  } catch (error) {
    console.error('Cancel recurrence error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao excluir contrato' }, { status: 500 })
  }
}
