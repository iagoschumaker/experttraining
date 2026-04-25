// ============================================================================
// EXPERT PRO TRAINING — SUBSCRIPTION PAYMENT API
// ============================================================================
// POST   /api/studio/client-subscriptions/[id]/pay — Registrar pagamento
// DELETE /api/studio/client-subscriptions/[id]/pay — Estornar pagamento
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const sub = await prisma.clientSubscription.findFirst({
      where: { id: params.id, studioId: auth.studioId },
      include: {
        client: { select: { id: true, name: true } },
        plan: { select: { name: true, price: true } },
      },
    })

    if (!sub) {
      return NextResponse.json({ success: false, error: 'Assinatura não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const { paymentMethod, month, year } = body
    const targetMonth = month || new Date().getMonth() + 1
    const targetYear = year || new Date().getFullYear()

    // Check if already paid this month
    const existingPayment = await prisma.financialEntry.findFirst({
      where: {
        studioId: auth.studioId,
        clientId: sub.clientId,
        type: 'RECEITA',
        status: 'PAID',
        description: { contains: `Mensalidade` },
        date: {
          gte: new Date(targetYear, targetMonth - 1, 1),
          lt: new Date(targetYear, targetMonth, 1),
        },
      },
    })

    if (existingPayment) {
      return NextResponse.json({ success: false, error: 'Pagamento já registrado neste mês' }, { status: 409 })
    }

    // Find or create "Mensalidade" category
    let category = await prisma.financialCategory.findFirst({
      where: { studioId: auth.studioId, code: '1.1', type: 'RECEITA' },
    })
    if (!category) {
      category = await prisma.financialCategory.findFirst({
        where: { studioId: auth.studioId, type: 'RECEITA' },
        orderBy: { code: 'asc' },
      })
    }

    if (!category) {
      return NextResponse.json({ success: false, error: 'Crie uma categoria de RECEITA antes' }, { status: 400 })
    }

    const paymentDate = new Date(targetYear, targetMonth - 1, new Date().getDate(), 12, 0, 0)
    const price = parseFloat(sub.price.toString())

    const entry = await prisma.financialEntry.create({
      data: {
        studioId: auth.studioId,
        categoryId: category.id,
        clientId: sub.clientId,
        type: 'RECEITA',
        description: `Mensalidade ${sub.plan.name} - ${sub.client.name} (${String(targetMonth).padStart(2, '0')}/${targetYear})`,
        amount: price,
        date: paymentDate,
        dueDate: paymentDate,
        paidAt: new Date(),
        status: 'PAID',
        paymentMethod: paymentMethod || 'PIX',
        notes: `Ref: Assinatura ${sub.id}`,
        createdById: auth.userId,
      } as any,
    })

    return NextResponse.json({
      success: true,
      data: { ...entry, amount: parseFloat(entry.amount.toString()) },
      message: `Pagamento de ${sub.client.name} registrado!`,
    }, { status: 201 })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao registrar pagamento' }, { status: 500 })
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
    const sub = await prisma.clientSubscription.findFirst({
      where: { id: params.id, studioId: auth.studioId },
    })
    if (!sub) {
      return NextResponse.json({ success: false, error: 'Assinatura não encontrada' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    // Find the payment entry
    const payment = await prisma.financialEntry.findFirst({
      where: {
        studioId: auth.studioId,
        clientId: sub.clientId,
        type: 'RECEITA',
        status: 'PAID',
        description: { contains: 'Mensalidade' },
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Pagamento não encontrado neste mês' }, { status: 404 })
    }

    // Cancel the entry instead of deleting
    await prisma.financialEntry.update({
      where: { id: payment.id },
      data: { status: 'CANCELED', notes: `${payment.notes || ''} | Estornado em ${new Date().toLocaleDateString('pt-BR')}` },
    })

    return NextResponse.json({ success: true, message: 'Pagamento estornado' })
  } catch (error) {
    console.error('Reverse payment error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao estornar' }, { status: 500 })
  }
}
