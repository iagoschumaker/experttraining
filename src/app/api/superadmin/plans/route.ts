// ============================================================================
// EXPERT TRAINING - SUPERADMIN PLANS API
// ============================================================================
// GET /api/superadmin/plans - Lista planos
// POST /api/superadmin/plans - Cria plano
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Validation schema
const createPlanSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser positivo'),
  maxTrainers: z.number().int().min(1, 'Mínimo 1 treinador'),
  maxClients: z.number().int().min(1, 'Mínimo 1 cliente'),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
})

// Middleware to check superadmin
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

// GET - List plans
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const total = await prisma.plan.count()

    const plans = await prisma.plan.findMany({
      orderBy: { priceMonthly: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { studios: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        items: plans,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('List plans error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Create plan
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

    const { name, description, price, maxTrainers, maxClients, features, isActive } = validation.data

    const plan = await prisma.plan.create({
      data: {
        name,
        description,
        priceMonthly: price,
        maxTrainers,
        maxClients,
        features,
        isActive,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'CREATE',
        entity: 'Plan',
        entityId: plan.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: plan,
    })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
