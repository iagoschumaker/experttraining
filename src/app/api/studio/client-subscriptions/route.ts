// ============================================================================
// EXPERT PRO TRAINING — CLIENT SUBSCRIPTIONS API (STUDIO)
// ============================================================================
// GET  /api/studio/client-subscriptions — Listar assinaturas de alunos
// POST /api/studio/client-subscriptions — Atribuir aluno a um plano
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { parseLocalDate } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // ACTIVE | EXPIRED | CANCELED
  const clientId = searchParams.get('clientId')

  try {
    const where: any = { studioId: auth.studioId }
    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const subscriptions = await prisma.clientSubscription.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, price: true, billingCycle: true, durationDays: true } },
      },
      orderBy: { endDate: 'desc' },
    })

    // Check payments for current month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const clientIds = subscriptions.map(s => s.clientId)
    const payments = clientIds.length > 0 ? await prisma.financialEntry.findMany({
      where: {
        studioId: auth.studioId,
        clientId: { in: clientIds },
        type: 'RECEITA',
        status: 'PAID',
        description: { contains: 'Mensalidade' },
        date: { gte: monthStart, lt: monthEnd },
      },
      select: { clientId: true, paidAt: true },
    }) : []

    const paidClientIds = new Set(payments.map(p => p.clientId))

    return NextResponse.json({
      success: true,
      data: subscriptions.map(s => ({
        ...s,
        price: parseFloat(s.price.toString()),
        plan: { ...s.plan, price: parseFloat(s.plan.price.toString()) },
        isExpired: s.endDate < new Date() && s.status === 'ACTIVE',
        isPaidThisMonth: paidClientIds.has(s.clientId),
        lastPaymentDate: payments.find(p => p.clientId === s.clientId)?.paidAt?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error('Subscriptions error:', error)
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
    const { clientId, planId, startDate, price, notes } = body

    if (!clientId || !planId) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: clientId, planId' },
        { status: 400 }
      )
    }

    // Verificar que o aluno pertence ao studio
    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId: auth.studioId },
    })
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    // Buscar plano
    const plan = await prisma.clientPlan.findUnique({
      where: { id: planId },
    })
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Cancelar assinatura ativa anterior (se existir)
    await prisma.clientSubscription.updateMany({
      where: {
        clientId,
        studioId: auth.studioId,
        status: 'ACTIVE',
      },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: 'Substituída por novo plano',
      },
    })

    // Calcular datas
    const start = startDate ? parseLocalDate(startDate) : new Date()
    const end = new Date(start)
    end.setDate(end.getDate() + plan.durationDays)

    const subscription = await prisma.clientSubscription.create({
      data: {
        clientId,
        studioId: auth.studioId,
        planId,
        status: 'ACTIVE',
        startDate: start,
        endDate: end,
        price: price ? parseFloat(price) : plan.price,
        autoRenew: true,
        notes,
      },
      include: {
        client: { select: { id: true, name: true } },
        plan: { select: { name: true, billingCycle: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...subscription, price: parseFloat(subscription.price.toString()) },
      message: `${client.name} atribuído ao plano ${plan.name} até ${end.toLocaleDateString('pt-BR')}`,
    }, { status: 201 })
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar assinatura' }, { status: 500 })
  }
}
