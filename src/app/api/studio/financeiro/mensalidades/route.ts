// ============================================================================
// KINEX PERFORMANCE — MENSALIDADES API (Assinaturas Recorrentes)
// GET  — Lista alunos com status de assinatura recorrente
// POST — Configura/atualiza mensalidade de um aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// Mapear ciclo para número de meses
const CYCLE_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
}

/**
 * Calcula a data de cobrança e status correto baseado na data de adesão.
 *
 * REGRAS:
 * - Se o 1º vencimento (adesão + 1 ciclo) for FUTURO → ACTIVE, nextBillingDate = 1º vencimento
 * - Se o 1º vencimento já PASSOU → encontra o vencimento mais recente passado → OVERDUE
 *
 * Exemplos (ciclo MONTHLY, hoje = 15/07/2026):
 *   adhesion = 10/07/2026 → nextBillingDate = 10/08/2026 → ACTIVE ✅
 *   adhesion = 01/01/2026 → nextBillingDate = 01/07/2026 → OVERDUE (14 dias) ✅
 *   adhesion = 01/06/2026 → nextBillingDate = 01/07/2026 → OVERDUE (14 dias) ✅
 *
 * Exemplos (ciclo ANNUAL, hoje = 15/07/2026):
 *   adhesion = 01/08/2026 → nextBillingDate = 01/08/2027 → ACTIVE ✅
 *   adhesion = 01/01/2026 → nextBillingDate = 01/01/2026 → OVERDUE (195 dias) ✅
 *   adhesion = 01/01/2025 → nextBillingDate = 01/01/2026 → OVERDUE (195 dias) ✅
 */
function calcNextBillingDate(
  adhesionDate: Date,
  cycle: string,
  now: Date = new Date()
): { nextDate: Date; isOverdue: boolean } {
  const months = CYCLE_MONTHS[cycle] ?? 1

  // Primeiro vencimento: adesão + 1 ciclo
  const firstBilling = new Date(adhesionDate)
  firstBilling.setMonth(firstBilling.getMonth() + months)

  // Primeiro vencimento no futuro → ACTIVE
  if (firstBilling > now) {
    return { nextDate: firstBilling, isOverdue: false }
  }

  // Primeiro vencimento já passou → achar a última data de cobrança passada
  // (a mais recente que ainda é ≤ hoje)
  let cursor = new Date(firstBilling)
  let mostRecentPast = new Date(firstBilling)

  while (cursor <= now) {
    mostRecentPast = new Date(cursor)
    cursor = new Date(cursor)
    cursor.setMonth(cursor.getMonth() + months)
  }

  return { nextDate: mostRecentPast, isOverdue: true }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth
  const now = new Date()

  try {
    // ── Auto-OVERDUE ─────────────────────────────────────────────────────────
    // Se nextBillingDate já passou e status é ACTIVE ou PENDING → OVERDUE + bloquear aluno.
    // Cobrindo ACTIVE garante que planos configurados com data histórica (ex: adhesionDate = Jan,
    // configurado agora em Jul) que geraram nextBillingDate futuro correto, só ficam OVERDUE
    // quando de fato o próximo vencimento passar — nunca ao serem configurados.
    const overdueToMark = await (prisma as any).clientMensalidade.findMany({
      where: {
        studioId,
        status: { in: ['ACTIVE', 'PENDING'] },
        nextBillingDate: { lt: now },
      },
      select: { id: true, clientId: true },
    })

    if (overdueToMark.length > 0) {
      const overdueIds = overdueToMark.map((m: any) => m.id)
      const overdueClientIds = overdueToMark.map((m: any) => m.clientId)
      await (prisma as any).clientMensalidade.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'OVERDUE' },
      })
      await prisma.client.updateMany({
        where: { id: { in: overdueClientIds } },
        data: { isActive: false },
      })
    }

    // ── Buscar mensalidades do studio ────────────────────────────────────────
    const mensalidadesRaw = await (prisma as any).clientMensalidade.findMany({
      where: { studioId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            status: true,
            studioId: true, // necessário para isolamento SaaS
          },
        },
        studioPlan: {
          select: { id: true, name: true },
        },
      },
      orderBy: { client: { name: 'asc' } },
    })

    // ISOLAMENTO SAAS: descartar qualquer mensalidade cujo cliente não pertence ao studio atual
    const mensalidades = mensalidadesRaw.filter((m: any) => m.client?.studioId === studioId)

    // Alunos ATIVOS do studio sem mensalidade configurada
    const clientsWithMens = new Set(mensalidades.map((m: any) => m.clientId))
    const allClients = await prisma.client.findMany({
      where: { studioId, isActive: true },
      select: { id: true, name: true, email: true, phone: true, isActive: true },
      orderBy: { name: 'asc' },
    })
    const clientsWithoutMens = allClients.filter(c => !clientsWithMens.has(c.id))

    // Alerta: vencimento nos próximos 3 dias
    const alertDate = new Date(now)
    alertDate.setDate(alertDate.getDate() + 3)

    const formattedMensalidades = mensalidades.map((m: any) => ({
      id: m.id,
      clientId: m.clientId,
      clientName: m.client.name,
      clientEmail: m.client.email,
      clientPhone: m.client.phone,
      clientIsActive: m.client.isActive,
      planId: m.planId ?? null,
      planName: m.studioPlan?.name ?? null,
      billingCycle: m.billingCycle,
      amount: parseFloat(m.amount.toString()),
      adhesionDate: m.adhesionDate.toISOString(),
      nextBillingDate: m.nextBillingDate.toISOString(),
      lastPaymentDate: m.lastPaymentDate?.toISOString() ?? null,
      status: m.status,
      notes: m.notes,
      isAlertDue: m.status !== 'OVERDUE' && m.nextBillingDate <= alertDate,
      daysUntilDue: Math.ceil((m.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))

    const stats = {
      total: allClients.length,
      comMensalidade: mensalidades.length,
      semMensalidade: clientsWithoutMens.length,
      ativos: mensalidades.filter((m: any) => m.status === 'ACTIVE').length,
      pendentes: mensalidades.filter((m: any) => m.status === 'PENDING').length,
      atrasados: mensalidades.filter((m: any) => m.status === 'OVERDUE').length,
      inativos: mensalidades.filter((m: any) => m.status === 'INACTIVE').length,
      alertas: formattedMensalidades.filter((m: any) => m.isAlertDue).length,
      totalAReceber: mensalidades
        .filter((m: any) => m.status === 'PENDING' || m.status === 'OVERDUE')
        .reduce((s: number, m: any) => s + parseFloat(m.amount.toString()), 0),
    }

    return NextResponse.json({
      success: true,
      data: {
        mensalidades: formattedMensalidades,
        clientsWithoutMens,
        stats,
      },
    })
  } catch (error: any) {
    console.error('=== Mensalidades GET error ===', error?.message, error?.code, JSON.stringify(error?.meta))
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar mensalidades', detail: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    const body = await request.json()
    const { clientId, billingCycle, amount, adhesionDate, notes, planId } = body

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Campo obrigatorio: clientId' }, { status: 400 })
    }

    // Verificação de segurança: aluno deve pertencer ao studio
    const client = await prisma.client.findFirst({ where: { id: clientId, studioId } })
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado neste studio' }, { status: 404 })
    }

    // Resolver ciclo e valor: prioridade ao que foi enviado, fallback ao plano
    let resolvedCycle = billingCycle
    let resolvedAmount = (amount !== undefined && amount !== null && amount !== '') ? parseFloat(amount) : 0
    let resolvedPlanId = planId ?? null

    if (planId) {
      const plan = await (prisma as any).studioPlan.findFirst({
        where: { id: planId, studioId, isActive: true },
      })
      if (plan) {
        resolvedCycle = resolvedCycle ?? plan.billingCycle
        if (amount === undefined || amount === null || amount === '') {
          resolvedAmount = parseFloat(plan.price.toString())
        }
      } else {
        resolvedPlanId = null // plano não encontrado neste studio, ignorar
      }
    }

    if (!resolvedCycle) {
      return NextResponse.json(
        { success: false, error: 'Selecione um plano ou informe o ciclo de cobrança' },
        { status: 400 }
      )
    }

    const adhesion = adhesionDate ? new Date(adhesionDate) : new Date()
    const now = new Date()

    // ── Calcular data de vencimento e status ──────────────────────────────────
    // Se a data de adesão é retroativa e o 1º vencimento já passou → OVERDUE
    // Se o 1º vencimento ainda está no futuro → ACTIVE
    const { nextDate: nextBillingDate, isOverdue } = calcNextBillingDate(adhesion, resolvedCycle, now)
    const billingStatus = isOverdue ? 'OVERDUE' : 'ACTIVE'

    const daysOverdue = isOverdue
      ? Math.floor((now.getTime() - nextBillingDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const mensalidade = await (prisma as any).clientMensalidade.upsert({
      where: { clientId }, // clientId @unique no schema + UNIQUE(client_id) no banco
      create: {
        clientId,
        studioId,
        planId: resolvedPlanId,
        billingCycle: resolvedCycle,
        amount: resolvedAmount,
        adhesionDate: adhesion,
        nextBillingDate,
        status: billingStatus,
        notes: notes ?? null,
      },
      update: {
        planId: resolvedPlanId,
        billingCycle: resolvedCycle,
        amount: resolvedAmount,
        adhesionDate: adhesion,
        nextBillingDate,
        status: billingStatus,
        notes: notes ?? null,
        updatedAt: new Date(),
      },
    })

    // Atualizar isActive do aluno com base no status da mensalidade
    await prisma.client.update({
      where: { id: clientId },
      data: { isActive: !isOverdue },
    })

    const msg = isOverdue
      ? `Mensalidade configurada com atraso. Venceu em ${nextBillingDate.toLocaleDateString('pt-BR')} (${daysOverdue} dias atrás)`
      : `Mensalidade configurada! Próxima cobrança: ${nextBillingDate.toLocaleDateString('pt-BR')}`

    return NextResponse.json(
      {
        success: true,
        data: {
          ...mensalidade,
          amount: parseFloat(mensalidade.amount.toString()),
          nextBillingDate: nextBillingDate.toISOString(),
          status: billingStatus,
          isOverdue,
          daysOverdue,
        },
        message: msg,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('=== Mensalidades POST error ===', error?.message, error?.code, JSON.stringify(error?.meta))
    return NextResponse.json(
      { success: false, error: 'Erro ao configurar mensalidade', detail: error?.message },
      { status: 500 }
    )
  }
}
