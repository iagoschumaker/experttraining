// ============================================================================
// EXPERT PRO TRAINING — STUDIO CLIENT PLAN BY ID API
// ============================================================================
// PUT    /api/studio/client-plans/[id] — Atualizar plano
// DELETE /api/studio/client-plans/[id] — Excluir plano
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    // Verificar que o plano pertence ao studio
    const existing = await prisma.clientPlan.findFirst({
      where: { id: params.id, studioId: auth.studioId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.price !== undefined) updateData.price = parseFloat(body.price)
    if (body.billingCycle !== undefined) updateData.billingCycle = body.billingCycle
    if (body.durationDays !== undefined) updateData.durationDays = parseInt(body.durationDays)
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.isTrial !== undefined) updateData.isTrial = body.isTrial
    if (body.trialDays !== undefined) updateData.trialDays = body.trialDays ? parseInt(body.trialDays) : null

    const plan = await prisma.clientPlan.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: { ...plan, price: parseFloat(plan.price.toString()) },
    })
  } catch (error) {
    console.error('Update plan error:', error)
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
    const existing = await prisma.clientPlan.findFirst({
      where: { id: params.id, studioId: auth.studioId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se tem assinaturas ativas
    const activeSubs = await prisma.clientSubscription.count({
      where: { planId: params.id, status: 'ACTIVE' },
    })

    if (activeSubs > 0) {
      // Desativar ao invés de excluir
      await prisma.clientPlan.update({
        where: { id: params.id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: `Plano desativado (${activeSubs} assinaturas ativas)`,
      })
    }

    await prisma.clientPlan.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true, message: 'Plano excluído' })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao excluir' }, { status: 500 })
  }
}
