// ============================================================================
// EXPERT PRO TRAINING — SUPERADMIN CLIENT PLANS API
// ============================================================================
// GET  /api/superadmin/client-plans — Listar templates de planos
// POST /api/superadmin/client-plans — Criar template de plano de aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = await getAccessTokenCookie()
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload?.isSuperAdmin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })

  try {
    const plans = await prisma.clientPlan.findMany({
      orderBy: [{ isActive: 'desc' }, { price: 'asc' }],
      include: {
        _count: { select: { subscriptions: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: plans.map(p => ({
        ...p,
        price: parseFloat(p.price.toString()),
        activeSubscriptions: p._count.subscriptions,
      })),
    })
  } catch (error) {
    console.error('Client plans error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = await getAccessTokenCookie()
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload?.isSuperAdmin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })

  try {
    const body = await request.json()
    const { name, description, price, billingCycle, durationDays, isTrial, trialDays, features } = body

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
        features: features || [],
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...plan, price: parseFloat(plan.price.toString()) },
    }, { status: 201 })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar plano' }, { status: 500 })
  }
}
