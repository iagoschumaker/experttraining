// ============================================================================
// EXPERT PRO TRAINING - BILLING API (STUDIO)
// ============================================================================
// GET /api/studio/billing - Ver uso e faturas do studio
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { 
  calculateStudioUsage,
  getCurrentBillingPeriod,
  getPreviousBillingPeriod 
} from '@/lib/billing/usage-calculator'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    // 1. Buscar assinatura ativa
    const subscription = await prisma.subscription.findFirst({
      where: {
        studioId,
        status: 'ACTIVE'
      },
      include: {
        plan: true
      }
    })

    if (!subscription) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma assinatura ativa encontrada'
      }, { status: 404 })
    }

    // 2. Calcular uso do período atual
    const currentPeriod = getCurrentBillingPeriod()
    const currentUsage = await calculateStudioUsage(
      studioId,
      currentPeriod.start,
      currentPeriod.end
    )

    // 3. Buscar uso do período anterior (se existir)
    const previousPeriod = getPreviousBillingPeriod()
    let previousUsage = null
    try {
      previousUsage = await calculateStudioUsage(
        studioId,
        previousPeriod.start,
        previousPeriod.end
      )
    } catch (error) {
      console.log('No previous period usage')
    }

    // 4. Buscar últimas faturas
    const invoices = await prisma.invoice.findMany({
      where: { studioId },
      orderBy: { createdAt: 'desc' },
      take: 12, // Últimos 12 meses
    })

    // 5. Buscar histórico de uso registrado
    const usageHistory = await prisma.usageRecord.findMany({
      where: { studioId },
      orderBy: { periodEnd: 'desc' },
      take: 12,
    })

    // 6. Calcular estatísticas
    const totalPaid = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0)

    const totalPending = invoices
      .filter(inv => inv.status === 'PENDING')
      .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0)

    const totalOverdue = invoices
      .filter(inv => inv.status === 'OVERDUE')
      .reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0)

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan: {
            name: subscription.plan.name,
            tier: subscription.plan.tier,
            pricePerTrainer: parseFloat(subscription.plan.pricePerTrainer.toString()),
            features: subscription.plan.features
          },
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          nextBillingDate: subscription.nextBillingDate,
          autoRenew: subscription.autoRenew,
        },
        currentUsage: {
          periodStart: currentUsage.periodStart,
          periodEnd: currentUsage.periodEnd,
          activeTrainers: currentUsage.activeTrainers,
          totalTrainers: currentUsage.totalTrainers,
          trainerActivity: currentUsage.trainerActivity,
          totalLessons: currentUsage.totalLessons,
          totalAssessments: currentUsage.totalAssessments,
          totalWorkouts: currentUsage.totalWorkouts,
          totalClients: currentUsage.totalClients,
          pricePerTrainer: currentUsage.pricePerTrainer,
          estimatedTotal: currentUsage.totalAmount,
        },
        previousUsage: previousUsage ? {
          periodStart: previousUsage.periodStart,
          periodEnd: previousUsage.periodEnd,
          activeTrainers: previousUsage.activeTrainers,
          totalAmount: previousUsage.totalAmount,
        } : null,
        invoices: invoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          periodStart: inv.periodStart,
          periodEnd: inv.periodEnd,
          total: parseFloat(inv.total.toString()),
          status: inv.status,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
          items: inv.items,
        })),
        usageHistory: usageHistory.map(usage => ({
          id: usage.id,
          periodStart: usage.periodStart,
          periodEnd: usage.periodEnd,
          activeTrainers: usage.activeTrainers,
          totalAmount: parseFloat(usage.totalAmount.toString()),
          isBilled: usage.isBilled,
        })),
        summary: {
          totalPaid,
          totalPending,
          totalOverdue,
          totalInvoices: invoices.length,
        }
      }
    })
  } catch (error) {
    console.error('Billing error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar informações de cobrança' },
      { status: 500 }
    )
  }
}
