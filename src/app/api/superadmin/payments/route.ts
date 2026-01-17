// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN PAYMENT MANAGEMENT API
// ============================================================================
// POST /api/superadmin/payments/mark-paid - Marcar studio como pago (manual)
// POST /api/superadmin/payments/block - Bloquear studio por falta de pagamento
// GET /api/superadmin/payments/overdue - Lista studios com pagamento atrasado
// GET /api/superadmin/payments/upcoming - Lista pagamentos vencendo
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import {
  markStudioAsPaid,
  blockStudioForNonPayment,
  getOverdueStudios,
  getStudiosWithUpcomingPayments
} from '@/lib/billing/payment-check'
import prisma from '@/lib/prisma'

// ============================================================================
// SCHEMAS
// ============================================================================
const markPaidSchema = z.object({
  studioId: z.string().min(1, 'Studio ID é obrigatório'),
  paymentDate: z.string().datetime('Data de pagamento inválida'),
  nextDueDate: z.string().datetime('Data de vencimento inválida'),
  notes: z.string().optional(),
})

const blockStudioSchema = z.object({
  studioId: z.string().min(1, 'Studio ID é obrigatório'),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  graceDays: z.number().int().min(0).max(30).optional(),
})

// ============================================================================
// MIDDLEWARE
// ============================================================================
async function verifySuperAdmin() {
  const accessToken = await getAccessTokenCookie()
  
  if (!accessToken) {
    return { error: 'Não autenticado', status: 401 }
  }

  const payload = verifyAccessToken(accessToken)
  
  if (!payload || !payload.isSuperAdmin) {
    return { error: 'Acesso negado', status: 403 }
  }

  return { payload }
}

// ============================================================================
// POST - Marcar studio como pago
// ============================================================================
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'mark-paid') {
      const validation = markPaidSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.errors[0].message },
          { status: 400 }
        )
      }

      const { studioId, paymentDate, nextDueDate, notes } = validation.data

      await markStudioAsPaid(studioId, {
        paidBy: auth.payload.userId,
        paymentDate: new Date(paymentDate),
        nextDueDate: new Date(nextDueDate),
        notes,
      })

      const studio = await prisma.studio.findUnique({
        where: { id: studioId },
        select: { id: true, name: true, status: true, isPaid: true }
      })

      return NextResponse.json({
        success: true,
        message: `Studio "${studio?.name}" marcado como pago`,
        data: studio
      })
    }

    if (action === 'block') {
      const validation = blockStudioSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.errors[0].message },
          { status: 400 }
        )
      }

      const { studioId, reason, graceDays } = validation.data

      await blockStudioForNonPayment(studioId, {
        blockedBy: auth.payload.userId,
        reason,
        graceDays,
      })

      const studio = await prisma.studio.findUnique({
        where: { id: studioId },
        select: { 
          id: true, 
          name: true, 
          status: true, 
          isPaid: true,
          gracePeriodEnds: true 
        }
      })

      return NextResponse.json({
        success: true,
        message: graceDays 
          ? `Studio "${studio?.name}" entrará em período de carência de ${graceDays} dias`
          : `Studio "${studio?.name}" foi bloqueado`,
        data: studio
      })
    }

    return NextResponse.json(
      { success: false, error: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Payment management error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Lista studios com problemas de pagamento
// ============================================================================
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overdue'

    if (type === 'overdue') {
      const overdueStudios = await getOverdueStudios()
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'overdue',
          count: overdueStudios.length,
          studios: overdueStudios
        }
      })
    }

    if (type === 'upcoming') {
      const daysAhead = parseInt(searchParams.get('days') || '7')
      const upcomingStudios = await getStudiosWithUpcomingPayments(daysAhead)
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'upcoming',
          daysAhead,
          count: upcomingStudios.length,
          studios: upcomingStudios
        }
      })
    }

    if (type === 'all') {
      const [overdueStudios, upcomingStudios] = await Promise.all([
        getOverdueStudios(),
        getStudiosWithUpcomingPayments(7)
      ])

      // Buscar estatísticas gerais
      const stats = await prisma.studio.groupBy({
        by: ['status'],
        _count: true,
      })

      const statusCounts = {
        ACTIVE: 0,
        SUSPENDED: 0,
        GRACE_PERIOD: 0,
        CANCELED: 0,
      }

      stats.forEach(stat => {
        statusCounts[stat.status as keyof typeof statusCounts] = stat._count
      })

      return NextResponse.json({
        success: true,
        data: {
          type: 'all',
          stats: statusCounts,
          overdue: {
            count: overdueStudios.length,
            studios: overdueStudios
          },
          upcoming: {
            count: upcomingStudios.length,
            studios: upcomingStudios
          }
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Tipo inválido' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Get payment status error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
