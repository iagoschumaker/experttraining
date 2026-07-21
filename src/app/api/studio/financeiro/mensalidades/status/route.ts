// ============================================================================
// KINEX PERFORMANCE — STATUS COMPLETO DE MENSALIDADES POR ALUNO
// GET /api/studio/financeiro/mensalidades/status
// Retorna: no_plan | pending | overdue | upcoming | active para TODOS os alunos
// Usado pela tela de Presença para verificar antes de abrir sessão
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
    // Buscar TODOS os alunos do studio (incluindo inativos por inadimplência)
    // IMPORTANTE: não filtrar por isActive aqui — alunos OVERDUE têm isActive=false
    // e precisam aparecer no mapa de status para o bloqueio de sessão funcionar
    const clients = await prisma.client.findMany({
      where: { studioId },
      select: { id: true, name: true },
    })

    // Buscar todas as mensalidades do studio
    const mensalidades = await (prisma as any).clientMensalidade.findMany({
      where: { studioId },
      select: {
        clientId: true,
        status: true,
        nextBillingDate: true,
        amount: true,
        planId: true,
      },
    })

    // Mapear mensalidade por clientId
    const mensMap = new Map<string, any>()
    mensalidades.forEach((m: any) => mensMap.set(m.clientId, m))

    // Calcular status para cada aluno
    const result: Record<string, {
      status: 'no_plan' | 'pending' | 'overdue' | 'upcoming' | 'active'
      name: string
      nextBillingDate?: string
      daysUntilDue?: number
      daysOverdue?: number
    }> = {}

    for (const client of clients) {
      const mens = mensMap.get(client.id)

      if (!mens) {
        // Sem mensalidade configurada
        result[client.id] = { status: 'no_plan', name: client.name }
        continue
      }

      if (mens.status === 'OVERDUE') {
        const daysOverdue = Math.ceil((now.getTime() - mens.nextBillingDate.getTime()) / (1000 * 60 * 60 * 24))
        result[client.id] = {
          status: 'overdue',
          name: client.name,
          nextBillingDate: mens.nextBillingDate.toISOString(),
          daysOverdue,
        }
        continue
      }

      if (mens.status === 'PENDING') {
        result[client.id] = {
          status: 'pending',
          name: client.name,
          nextBillingDate: mens.nextBillingDate.toISOString(),
        }
        continue
      }

      // ACTIVE — mas verifica se está vencendo em 3 dias
      if (mens.status === 'ACTIVE' && mens.nextBillingDate <= alertDate) {
        const daysUntilDue = Math.ceil((mens.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        result[client.id] = {
          status: 'upcoming',
          name: client.name,
          nextBillingDate: mens.nextBillingDate.toISOString(),
          daysUntilDue,
        }
        continue
      }

      // Em dia
      result[client.id] = {
        status: 'active',
        name: client.name,
        nextBillingDate: mens.nextBillingDate?.toISOString(),
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Mensalidades status error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar status' }, { status: 500 })
  }
}
