// ============================================================================
// SUPERADMIN ENTRY BY ID — PUT/DELETE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

const SUPERADMIN_STUDIO_ID = '_SUPERADMIN_'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getAccessTokenCookie()
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload?.isSuperAdmin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.financialEntry.findFirst({
      where: { id: params.id, studioId: SUPERADMIN_STUDIO_ID },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })

    const body = await request.json()
    const updateData: any = {}
    if (body.description !== undefined) updateData.description = body.description
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
    if (body.notes !== undefined) updateData.notes = body.notes

    if (body.status === 'PAID' && existing.status !== 'PAID') {
      updateData.status = 'PAID'
      updateData.paidAt = new Date()
    } else if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status !== 'PAID') updateData.paidAt = null
    }

    const entry = await prisma.financialEntry.update({
      where: { id: params.id },
      data: updateData,
      include: { category: { select: { id: true, code: true, name: true } } },
    })

    return NextResponse.json({
      success: true,
      data: { ...entry, amount: parseFloat(entry.amount.toString()) },
    })
  } catch (error) {
    console.error('SA update error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getAccessTokenCookie()
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload?.isSuperAdmin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.financialEntry.findFirst({
      where: { id: params.id, studioId: SUPERADMIN_STUDIO_ID },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })

    await prisma.financialEntry.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}
