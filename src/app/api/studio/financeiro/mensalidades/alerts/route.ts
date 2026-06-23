// ============================================================================
// KINEX PERFORMANCE — ALERTAS DE MENSALIDADES (próximos 3 dias)
// GET /api/studio/financeiro/mensalidades/alerts
// Usado pelo dashboard e pela tela de presença
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
  const now = new Date()
  const alertDate = new Date(now)
  alertDate.setDate(alertDate.getDate() + 3)

  try {
    // Alunos com vencimento em até 3 dias (PENDING ou ACTIVE prestes a vencer)
    const upcoming = await (prisma as any).clientMensalidade.findMany({
      where: {
        studioId,
        status: { in: ['ACTIVE', 'PENDING'] },
        nextBillingDate: {
          gte: now,
          lte: alertDate,
        },
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { nextBillingDate: 'asc' },
    })

    // Alunos em atraso (OVERDUE)
    const overdue = await (prisma as any).clientMensalidade.findMany({
      where: {
        studioId,
        status: 'OVERDUE',
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { nextBillingDate: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        upcoming: upcoming.map((m: any) => ({
          id: m.id,
          clientId: m.clientId,
          clientName: m.client.name,
          clientPhone: m.client.phone,
          amount: parseFloat(m.amount.toString()),
          nextBillingDate: m.nextBillingDate.toISOString(),
          daysUntilDue: Math.ceil((m.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          billingCycle: m.billingCycle,
        })),
        overdue: overdue.map((m: any) => ({
          id: m.id,
          clientId: m.clientId,
          clientName: m.client.name,
          clientPhone: m.client.phone,
          amount: parseFloat(m.amount.toString()),
          nextBillingDate: m.nextBillingDate.toISOString(),
          daysOverdue: Math.ceil((now.getTime() - m.nextBillingDate.getTime()) / (1000 * 60 * 60 * 24)),
          billingCycle: m.billingCycle,
        })),
        totalAlerts: upcoming.length + overdue.length,
      },
    })
  } catch (error) {
    console.error('Mensalidades alerts error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar alertas' }, { status: 500 })
  }
}
