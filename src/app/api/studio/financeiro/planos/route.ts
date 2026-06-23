// ============================================================================
// KINEX PERFORMANCE — PLANOS DO STUDIO (templates de mensalidade)
// GET  /api/studio/financeiro/planos — Lista planos do studio
// POST /api/studio/financeiro/planos — Cria novo plano
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

  try {
    const plans = await (prisma as any).studioPlan.findMany({
      where: { studioId, isActive: true },
      orderBy: [{ billingCycle: 'asc' }, { price: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: plans.map((p: any) => ({
        ...p,
        price: parseFloat(p.price.toString()),
      })),
    })
  } catch (error) {
    console.error('StudioPlans GET error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar planos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    const body = await request.json()
    const { name, description, billingCycle, price } = body

    if (!name || !billingCycle || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: name, billingCycle, price' },
        { status: 400 }
      )
    }

    const plan = await (prisma as any).studioPlan.create({
      data: {
        studioId,
        name: name.trim(),
        description: description?.trim() ?? null,
        billingCycle,
        price: parseFloat(price),
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...plan, price: parseFloat(plan.price.toString()) },
      message: 'Plano criado com sucesso',
    }, { status: 201 })
  } catch (error) {
    console.error('StudioPlans POST error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar plano' }, { status: 500 })
  }
}
