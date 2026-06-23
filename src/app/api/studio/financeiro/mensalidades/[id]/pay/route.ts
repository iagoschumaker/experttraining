// ============================================================================
// KINEX PERFORMANCE — REGISTRAR PAGAMENTO DE MENSALIDADE
// POST /api/studio/financeiro/mensalidades/[id]/pay
// Registra pagamento, renova ciclo e reativa o aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

const CYCLE_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId, userId } = auth
  const { id } = params

  try {
    const body = await request.json()
    const { paymentMethod, notes, categoryId, paidDate } = body

    // Buscar mensalidade
    const mensalidade = await (prisma as any).clientMensalidade.findFirst({
      where: { id, studioId },
      include: { client: true },
    })

    if (!mensalidade) {
      return NextResponse.json({ success: false, error: 'Mensalidade não encontrada' }, { status: 404 })
    }

    const now = paidDate ? new Date(paidDate) : new Date()
    const months = CYCLE_MONTHS[mensalidade.billingCycle] ?? 1

    // Calcular próxima cobrança a partir do nextBillingDate atual (ou de hoje se OVERDUE)
    const baseDate = mensalidade.status === 'OVERDUE'
      ? now  // se estava atrasado, conta a partir de hoje
      : mensalidade.nextBillingDate

    const nextBillingDate = new Date(baseDate)
    nextBillingDate.setMonth(nextBillingDate.getMonth() + months)

    // Buscar categoria padrão de mensalidade se não informada
    let resolvedCategoryId = categoryId
    if (!resolvedCategoryId) {
      const defaultCat = await prisma.financialCategory.findFirst({
        where: {
          studioId,
          type: 'RECEITA',
          isActive: true,
        },
        orderBy: { code: 'asc' },
      })
      resolvedCategoryId = defaultCat?.id
    }

    // Criar lançamento financeiro (RECEITA paga)
    if (resolvedCategoryId) {
      const cycleLabel: Record<string, string> = {
        MONTHLY: 'Mensal',
        QUARTERLY: 'Trimestral',
        SEMIANNUAL: 'Semestral',
        ANNUAL: 'Anual',
      }
      await prisma.financialEntry.create({
        data: {
          studioId,
          categoryId: resolvedCategoryId,
          clientId: mensalidade.clientId,
          type: 'RECEITA',
          description: `Mensalidade ${cycleLabel[mensalidade.billingCycle] || ''} — ${mensalidade.client.name}`,
          amount: mensalidade.amount,
          date: now,
          dueDate: mensalidade.nextBillingDate,
          status: 'PAID',
          paidAt: now,
          paymentMethod: paymentMethod ?? null,
          notes: notes ?? null,
          createdById: userId,
        } as any,
      })
    }

    // Atualizar mensalidade: renovar ciclo
    const updated = await (prisma as any).clientMensalidade.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        lastPaymentDate: now,
        nextBillingDate,
        updatedAt: now,
      },
    })

    // Reativar aluno
    await prisma.client.update({
      where: { id: mensalidade.clientId },
      data: { isActive: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        amount: parseFloat(updated.amount.toString()),
        nextBillingDate: updated.nextBillingDate.toISOString(),
      },
      message: `Pagamento registrado. Próxima cobrança: ${nextBillingDate.toLocaleDateString('pt-BR')}`,
    })
  } catch (error) {
    console.error('Mensalidade pay error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao registrar pagamento' }, { status: 500 })
  }
}
