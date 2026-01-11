// ============================================================================
// EXPERT TRAINING - SUPERADMIN PLAN BY ID API
// ============================================================================
// GET /api/superadmin/plans/[id] - Get plan details
// PUT /api/superadmin/plans/[id] - Update plan
// DELETE /api/superadmin/plans/[id] - Delete plan
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Validation schema
const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  maxUsers: z.number().int().min(1).optional(),
  maxClients: z.number().int().min(1).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
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

// GET - Get plan by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        studios: {
          select: { id: true, name: true, status: true },
        },
        _count: {
          select: { studios: true },
        },
      },
    })

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: plan,
    })
  } catch (error) {
    console.error('Get plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const existingPlan = await prisma.plan.findUnique({
      where: { id: params.id },
    })

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updatePlanSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: validation.data,
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'UPDATE',
        entity: 'Plan',
        entityId: plan.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: plan,
    })
  } catch (error) {
    console.error('Update plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Delete plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { studios: true },
        },
      },
    })

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Check if plan has studios
    if (plan._count.studios > 0) {
      return NextResponse.json(
        { success: false, error: 'Plano possui studios associados. Desative-o em vez de excluir.' },
        { status: 400 }
      )
    }

    await prisma.plan.delete({
      where: { id: params.id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'DELETE',
        entity: 'Plan',
        entityId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Plano excluído com sucesso',
    })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
