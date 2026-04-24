import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    // Buscar planos globais (SuperAdmin) + planos do próprio studio
    const plans = await prisma.clientPlan.findMany({
      where: {
        isActive: true,
        OR: [
          { studioId: null },       // Planos globais
          { studioId: auth.studioId }, // Planos do studio
        ],
      },
      orderBy: { price: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: plans.map(p => ({
        ...p,
        price: parseFloat(p.price.toString()),
        isGlobal: !p.studioId,
      })),
    })
  } catch (error) {
    console.error('Studio client plans error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { name, description, price, billingCycle, durationDays, isTrial, trialDays } = body

    if (!name || price === undefined || !billingCycle || !durationDays) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: name, price, billingCycle, durationDays' },
        { status: 400 }
      )
    }

    const plan = await prisma.clientPlan.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        billingCycle,
        durationDays: parseInt(durationDays),
        isTrial: isTrial || false,
        trialDays: trialDays ? parseInt(trialDays) : null,
        features: [],
        isActive: true,
        studioId: auth.studioId,
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...plan, price: parseFloat(plan.price.toString()) },
    }, { status: 201 })
  } catch (error) {
    console.error('Create studio plan error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar plano' }, { status: 500 })
  }
}
