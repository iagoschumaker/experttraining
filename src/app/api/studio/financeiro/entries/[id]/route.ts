// ============================================================================
// EXPERT PRO TRAINING — FINANCIAL ENTRY BY ID API
// ============================================================================
// GET    /api/studio/financeiro/entries/[id] — Detalhes do lançamento
// PUT    /api/studio/financeiro/entries/[id] — Atualizar lançamento
// DELETE /api/studio/financeiro/entries/[id] — Excluir lançamento
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const entry = await prisma.financialEntry.findFirst({
      where: { id: params.id, studioId: auth.studioId },
      include: {
        category: true,
        client: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Lançamento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ...entry, amount: parseFloat(entry.amount.toString()) },
    })
  } catch (error) {
    console.error('Get entry error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    // Verificar que pertence ao studio
    const existing = await prisma.financialEntry.findFirst({
      where: { id: params.id, studioId: auth.studioId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Lançamento não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
    if (body.description !== undefined) updateData.description = body.description
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod || null
    if (body.clientId !== undefined) updateData.clientId = body.clientId || null
    if (body.unitId !== undefined) updateData.unitId = body.unitId || null
    if (body.notes !== undefined) updateData.notes = body.notes

    // Marcar como pago
    if (body.status === 'PAID' && existing.status !== 'PAID') {
      updateData.status = 'PAID'
      updateData.paidAt = body.paidAt ? new Date(body.paidAt) : new Date()
      if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod
    } else if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status !== 'PAID') updateData.paidAt = null
    }

    const entry = await prisma.financialEntry.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: { select: { id: true, code: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...entry, amount: parseFloat(entry.amount.toString()) },
    })
  } catch (error) {
    console.error('Update entry error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const existing = await prisma.financialEntry.findFirst({
      where: { id: params.id, studioId: auth.studioId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Lançamento não encontrado' },
        { status: 404 }
      )
    }

    await prisma.financialEntry.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Lançamento excluído' })
  } catch (error) {
    console.error('Delete entry error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao excluir' }, { status: 500 })
  }
}
