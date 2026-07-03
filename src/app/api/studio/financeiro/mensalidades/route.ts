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

// Calcular próxima data de cobrança a partir de uma data base
function calcNextBillingDate(fromDate: Date, cycle: string): Date {
  const months = CYCLE_MONTHS[cycle] ?? 1
  const next = new Date(fromDate)
  next.setMonth(next.getMonth() + months)
  return next
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth
  const now = new Date()

  try {
    // Auto-OVERDUE: se nextBillingDate já passou e está PENDING → OVERDUE
    // E atualiza isActive do cliente
    const overdueUpdated = await prisma.clientMensalidade.findMany({
      where: {
        studioId,
        status: 'PENDING',
        nextBillingDate: { lt: now },
      },
      select: { id: true, clientId: true },
    })

    if (overdueUpdated.length > 0) {
      const overdueIds = overdueUpdated.map(m => m.id)
      const overdueClientIds = overdueUpdated.map(m => m.clientId)
      await prisma.clientMensalidade.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'OVERDUE' },
      })
      // Marcar alunos como inativos
      await prisma.client.updateMany({
        where: { id: { in: overdueClientIds } },
        data: { isActive: false },
      })
    }

    // Buscar todas as mensalidades do studio com dados do cliente
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
            studioId: true, // ← necessário para garantir isolamento SaaS
          },
        },
        studioPlan: {
          select: { id: true, name: true },
        },
      },
      orderBy: { client: { name: 'asc' } },
    })

    // ISOLAMENTO SAAS: descartar qualquer mensalidade cujo cliente não pertence ao studio atual.
    // Isso previne vazamento de dados caso haja registros inconsistentes no banco.
    const mensalidades = mensalidadesRaw.filter((m: any) => m.client?.studioId === studioId)

    // Alunos sem mensalidade: apenas ATIVOS do studio sem plano configurado.
    // isActive: true é essencial — clientes inativos (que saíram) NÃO devem aparecer.
    const clientsWithMens = new Set(mensalidades.map((m: any) => m.clientId))
    const allClients = await prisma.client.findMany({
      where: { studioId, isActive: true },
      select: { id: true, name: true, email: true, phone: true, isActive: true },
      orderBy: { name: 'asc' },
    })
    const clientsWithoutMens = allClients.filter(c => !clientsWithMens.has(c.id))


    // 3 dias antes = alerta
    const alertDate = new Date(now)
    alertDate.setDate(alertDate.getDate() + 3)

    const formattedMensalidades = mensalidades.map(m => ({
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
      // Alerta: vence em até 3 dias
      isAlertDue: m.status !== 'OVERDUE' && m.nextBillingDate <= alertDate,
      daysUntilDue: Math.ceil((m.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))

    // Estatísticas
    const stats = {
      total: allClients.length,
      comMensalidade: mensalidades.length,
      semMensalidade: clientsWithoutMens.length,
      ativos: mensalidades.filter(m => m.status === 'ACTIVE').length,
      pendentes: mensalidades.filter(m => m.status === 'PENDING').length,
      atrasados: mensalidades.filter(m => m.status === 'OVERDUE').length,
      inativos: mensalidades.filter(m => m.status === 'INACTIVE').length,
      alertas: formattedMensalidades.filter(m => m.isAlertDue).length,
      totalAReceber: mensalidades
        .filter(m => m.status === 'PENDING' || m.status === 'OVERDUE')
        .reduce((s, m) => s + parseFloat(m.amount.toString()), 0),
    }

    return NextResponse.json({
      success: true,
      data: {
        mensalidades: formattedMensalidades,
        clientsWithoutMens: clientsWithoutMens,
        stats,
      },
    })
  } catch (error) {
    console.error('Mensalidades GET error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar mensalidades' }, { status: 500 })
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

    const client = await prisma.client.findFirst({ where: { id: clientId, studioId } })
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno nao encontrado' }, { status: 404 })
    }

    // Se planId informado, busca plano para pegar ciclo e valor padrao
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
        resolvedPlanId = null
      }
    }

    if (!resolvedCycle) {
      return NextResponse.json({ success: false, error: 'Informe billingCycle ou selecione um plano' }, { status: 400 })
    }

    const adhesion = adhesionDate ? new Date(adhesionDate) : new Date()
    const nextBillingDate = calcNextBillingDate(adhesion, resolvedCycle)

    const mensalidade = await (prisma as any).clientMensalidade.upsert({
      // clientId é @unique no schema — cada aluno tem no máximo 1 mensalidade.
      // A validação de studio já foi feita acima (client.studioId === studioId).
      where: { clientId },
      create: {
        clientId,
        studioId,
        planId: resolvedPlanId,
        billingCycle: resolvedCycle,
        amount: resolvedAmount,
        adhesionDate: adhesion,
        nextBillingDate,
        status: 'ACTIVE',
        notes: notes ?? null,
      },
      update: {
        planId: resolvedPlanId,
        billingCycle: resolvedCycle,
        amount: resolvedAmount,
        adhesionDate: adhesion,
        nextBillingDate,
        status: 'ACTIVE',
        notes: notes ?? null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...mensalidade,
        amount: parseFloat(mensalidade.amount.toString()),
      },
      message: 'Mensalidade configurada com sucesso',
    }, { status: 201 })
  } catch (error) {
    console.error('Mensalidades POST error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao configurar mensalidade' }, { status: 500 })
  }
}
