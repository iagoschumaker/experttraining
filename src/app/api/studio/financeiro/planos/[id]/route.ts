// ============================================================================
// KINEX PERFORMANCE — PLANO INDIVIDUAL (editar / deletar)
// PUT    /api/studio/financeiro/planos/[id] — Editar plano
// DELETE /api/studio/financeiro/planos/[id] — Desativar plano
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

  const { studioId } = auth
  const { id } = params

  try {
    const body = await request.json()
    const { name, description, billingCycle, price } = body

    const plan = await (prisma as any).studioPlan.findFirst({
      where: { id, studioId },
    })
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 })
    }

    const updated = await (prisma as any).studioPlan.update({
      where: { id },
      data: {
        name: name?.trim() ?? plan.name,
        description: description?.trim() ?? plan.description,
        billingCycle: billingCycle ?? plan.billingCycle,
        price: price !== undefined ? parseFloat(price) : plan.price,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...updated, price: parseFloat(updated.price.toString()) },
      message: 'Plano atualizado',
    })
  } catch (error) {
    console.error('StudioPlan PUT error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar plano' }, { status: 500 })
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

  const { studioId } = auth
  const { id } = params

  try {
    const plan = await (prisma as any).studioPlan.findFirst({
      where: { id, studioId },
    })
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 })
    }

    // Soft delete — mantém histórico nos alunos vinculados
    await (prisma as any).studioPlan.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Plano removido' })
  } catch (error) {
    console.error('StudioPlan DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao remover plano' }, { status: 500 })
  }
}
