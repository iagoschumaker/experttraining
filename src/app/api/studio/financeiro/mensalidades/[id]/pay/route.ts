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

/**
 * Converte uma string de data YYYY-MM-DD em Date local (meio-dia) para evitar
 * problemas de offset UTC (-3 Brasil). new Date('2026-07-15') = UTC midnight =
 * 14/07 às 21h no Brasil, o que causa datas erradas.
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0) // meio-dia local → sem risco de virar outro dia
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

    // Buscar mensalidade — ISOLAMENTO: verifica studioId para evitar acesso cross-studio
    const mensalidade = await (prisma as any).clientMensalidade.findFirst({
      where: { id, studioId },
      include: { client: { select: { id: true, name: true, studioId: true } } },
    })

    if (!mensalidade) {
      return NextResponse.json({ success: false, error: 'Mensalidade não encontrada' }, { status: 404 })
    }

    // Segurança extra: garantir que o cliente pertence ao studio atual
    if (mensalidade.client?.studioId !== studioId) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    // ── Datas ───────────────────────────────────────────────────────────────
    // Usar parseLocalDate para evitar offset UTC (-3 Brasil) ao converter string de data
    const paidAt = paidDate ? parseLocalDate(paidDate) : new Date()
    const months = CYCLE_MONTHS[mensalidade.billingCycle] ?? 1

    // Próximo vencimento: avança 1 ciclo a partir do vencimento atual armazenado no banco.
    // Se o vencimento armazenado ainda estiver no passado após +1 ciclo (ex: muito atrasado),
    // continua avançando até ficar futuro em relação à data de pagamento.
    const nextBillingDate = new Date(mensalidade.nextBillingDate)
    nextBillingDate.setMonth(nextBillingDate.getMonth() + months)

    // Garantir que nextBillingDate é estritamente futuro em relação ao pagamento
    while (nextBillingDate <= paidAt) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + months)
    }

    // ── Categoria ─────────────────────────────────────────────────────────
    // Buscar categoria padrão de RECEITA nas categorias GLOBAIS (studioId = null).
    // Não filtrar por isSystem (default = false no schema).
    let resolvedCategoryId = categoryId
    if (!resolvedCategoryId) {
      const defaultCat = await prisma.financialCategory.findFirst({
        where: {
          studioId: null,  // categorias globais
          type: 'RECEITA',
          isActive: true,
        },
        orderBy: { code: 'asc' },
      })
      resolvedCategoryId = defaultCat?.id
    }

    // ── Criar lançamento financeiro (RECEITA paga) ────────────────────────
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
          date: paidAt,
          dueDate: mensalidade.nextBillingDate, // data que estava vencida/pendente
          status: 'PAID',
          paidAt,
          paymentMethod: paymentMethod ?? null,
          notes: notes ?? null,
          createdById: userId,
        } as any,
      })
    }

    // ── Atualizar mensalidade: renovar ciclo ────────────────────────────
    const updated = await (prisma as any).clientMensalidade.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        lastPaymentDate: paidAt,
        nextBillingDate,
        updatedAt: new Date(),
      },
    })

    // ── Reativar aluno ──────────────────────────────────────────────────
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
