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
    const mensalidades = await prisma.clientMensalidade.findMany({
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
          },
        },
      },
      orderBy: { client: { name: 'asc' } },
    })

    // Alunos sem mensalidade (no studio com FINANCEIRO mas ainda não configurados)
    const clientsWithMens = new Set(mensalidades.map(m => m.clientId))
    const allClients = await prisma.client.findMany({
      where: { studioId, isActive: true },
      select: { id: true, name: true, email: true, phone: true },
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
    const { clientId, billingCycle, amount, adhesionDate, notes } = body

    if (!clientId || !billingCycle || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: clientId, billingCycle, amount' },
        { status: 400 }
      )
    }

    // Verificar que o cliente pertence ao studio
    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId },
    })
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado' }, { status: 404 })
    }

    const adhesion = adhesionDate ? new Date(adhesionDate) : new Date()
    const nextBillingDate = calcNextBillingDate(adhesion, billingCycle)

    // Criar ou atualizar mensalidade (upsert)
    const mensalidade = await (prisma as any).clientMensalidade.upsert({
      where: { clientId_studioId: { clientId, studioId } },
      create: {
        clientId,
        studioId,
        billingCycle,
        amount: parseFloat(amount),
        adhesionDate: adhesion,
        nextBillingDate,
        status: 'PENDING',
        notes: notes ?? null,
      },
      update: {
        billingCycle,
        amount: parseFloat(amount),
        adhesionDate: adhesion,
        nextBillingDate,
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
