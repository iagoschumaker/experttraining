// ============================================================================
// EXPERT PRO TRAINING — MERCADO PAGO WEBHOOK
// ============================================================================
// POST /api/webhooks/mercadopago
// Recebe notificações de pagamento do Mercado Pago (PIX, boleto, cartão)
// Atualiza automaticamente lançamentos financeiros e assinaturas de aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  getMercadoPagoService,
  mapMPStatusToEntryStatus,
  mapMPPaymentMethod,
} from '@/lib/payments/mercadopago'
import { PaymentMethod } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Mercado Pago manda tipos diferentes de notificação
    // Nos interessa: payment, merchant_order
    const { type, data, action } = body

    console.log('[MP Webhook] Received:', { type, action, dataId: data?.id })

    if (type !== 'payment' || !data?.id) {
      // Acknowledgar outros tipos sem processar
      return NextResponse.json({ success: true, message: 'Ignored' })
    }

    const mp = getMercadoPagoService()
    if (!mp.isConfigured()) {
      console.warn('[MP Webhook] Mercado Pago não configurado')
      return NextResponse.json({ success: true, message: 'MP not configured' })
    }

    // Buscar detalhes do pagamento no MP
    const payment = await mp.getPayment(data.id)
    console.log('[MP Webhook] Payment:', {
      id: payment.id,
      status: payment.status,
      ref: payment.externalReference,
      amount: payment.amount,
    })

    if (!payment.externalReference) {
      return NextResponse.json({ success: true, message: 'No reference' })
    }

    // FORMATO DO externalReference:
    // "entry:ENTRY_ID" → atualizar FinancialEntry
    // "sub:SUBSCRIPTION_ID" → atualizar ClientSubscription
    // "saas:STUDIO_ID" → atualizar pagamento do studio ao SuperAdmin

    const [refType, refId] = payment.externalReference.split(':')
    const newStatus = mapMPStatusToEntryStatus(payment.status)
    const paymentMethodStr = mapMPPaymentMethod(payment.paymentMethod)
    // Cast para o enum PaymentMethod do Prisma
    const paymentMethod = paymentMethodStr as PaymentMethod

    switch (refType) {
      // ─── LANÇAMENTO FINANCEIRO ───
      case 'entry': {
        const entry = await prisma.financialEntry.findUnique({ where: { id: refId } })
        if (entry) {
          await prisma.financialEntry.update({
            where: { id: refId },
            data: {
              status: newStatus,
              paymentMethod,
              paidAt: newStatus === 'PAID' ? new Date() : null,
              notes: `MP Payment #${payment.id} - ${payment.status}`,
            },
          })
          console.log(`[MP Webhook] Updated entry ${refId} → ${newStatus}`)
        }
        break
      }

      // ─── ASSINATURA DE ALUNO ───
      case 'sub': {
        const sub = await prisma.clientSubscription.findUnique({
          where: { id: refId },
          include: { plan: true },
        })
        if (sub && newStatus === 'PAID') {
          const now = new Date()
          const endDate = new Date(now)
          endDate.setDate(endDate.getDate() + (sub.plan?.durationDays || 30))
          
          await prisma.clientSubscription.update({
            where: { id: refId },
            data: {
              status: 'ACTIVE',
              startDate: now,
              endDate,
              notes: `Pago via MP #${payment.id} (${paymentMethodStr})`,
            },
          })
          console.log(`[MP Webhook] Activated subscription ${refId}`)
        } else if (sub && newStatus === 'CANCELED') {
          await prisma.clientSubscription.update({
            where: { id: refId },
            data: { status: 'CANCELED' },
          })
        }
        break
      }

      // ─── PAGAMENTO SAAS (studio → superadmin) ───
      case 'saas': {
        // Atualizar status de pagamento do studio
        if (newStatus === 'PAID') {
          const nextDue = new Date()
          nextDue.setMonth(nextDue.getMonth() + 1)
          
          await prisma.studio.update({
            where: { id: refId },
            data: {
              isPaid: true,
              status: 'ACTIVE',
              paymentDueDate: nextDue,
            },
          })
          console.log(`[MP Webhook] Studio ${refId} payment confirmed`)
        }
        break
      }

      default:
        console.log(`[MP Webhook] Unknown ref type: ${refType}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MP Webhook] Error:', error)
    // Sempre retornar 200 para o MP não reenviar
    return NextResponse.json({ success: true, error: 'processed' })
  }
}

// GET para verificação do webhook pelo MP
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'mercadopago-webhook' })
}
