// ============================================================================
// EXPERT PRO TRAINING — STUDIO CLIENT PLANS API
// ============================================================================
// GET /api/studio/client-plans — Lista planos de aluno disponíveis
// Os studios veem apenas os planos ativos criados pelo SuperAdmin
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const plans = await prisma.clientPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: plans.map(p => ({
        ...p,
        price: parseFloat(p.price.toString()),
      })),
    })
  } catch (error) {
    console.error('Studio client plans error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}
