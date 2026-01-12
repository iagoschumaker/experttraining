// ============================================================================
// EXPERT TRAINING - SUPERADMIN PLANS API
// ============================================================================
// GET /api/superadmin/plans - Lista todos os planos
// POST /api/superadmin/plans - Cria novo plano
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { PlanTier } from '@prisma/client'

// ============================================================================
// SCHEMAS
// ============================================================================
const createPlanSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  tier: z.enum(['START', 'PRO', 'PREMIUM']),
  description: z.string().optional(),
  pricePerTrainer: z.number().positive('Preço deve ser positivo'),
  minTrainers: z.number().int().min(1).default(1),
  recommendedMax: z.number().int().positive().optional().nullable(),
  billingRules: z.record(z.any()).default({}),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isVisible: z.boolean().default(true),
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
// GET - List all plans
// ============================================================================
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}
    if (!includeInactive) {
      where.isActive = true
    }

    const plans = await prisma.plan.findMany({
      where,
      include: {
        _count: {
          select: {
            studios: true,
            subscriptions: true,
          }
        }
      },
      orderBy: [
        { pricePerTrainer: 'asc' },
        { name: 'asc' }
      ]
    })

    // Calcular estatísticas
    const stats = {
      total: plans.length,
      active: plans.filter(p => p.isActive).length,
      byTier: {
        START: plans.filter(p => p.tier === 'START').length,
        PRO: plans.filter(p => p.tier === 'PRO').length,
        PREMIUM: plans.filter(p => p.tier === 'PREMIUM').length,
      },
      totalStudios: plans.reduce((sum, p) => sum + p._count.studios, 0),
      totalSubscriptions: plans.reduce((sum, p) => sum + p._count.subscriptions, 0),
    }

    return NextResponse.json({
      success: true,
      data: {
        items: plans.map(p => ({
          ...p,
          pricePerTrainer: parseFloat(p.pricePerTrainer.toString()),
          studiosCount: p._count.studios,
          subscriptionsCount: p._count.subscriptions,
        })),
        stats
      }
    })
  } catch (error) {
    console.error('List plans error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create plan
// ============================================================================
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const validation = createPlanSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check for duplicate slug
    const existing = await prisma.plan.findUnique({
      where: { slug: data.slug }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Já existe um plano com este slug' },
        { status: 400 }
      )
    }

    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        slug: data.slug,
        tier: data.tier as PlanTier,
        description: data.description,
        pricePerTrainer: data.pricePerTrainer,
        minTrainers: data.minTrainers,
        recommendedMax: data.recommendedMax,
        billingRules: data.billingRules,
        features: data.features,
        isActive: data.isActive,
        isVisible: data.isVisible,
      }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'CREATE',
        entity: 'Plan',
        entityId: plan.id,
        newData: data,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...plan,
        pricePerTrainer: parseFloat(plan.pricePerTrainer.toString())
      }
    })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
