// ============================================================================
// EXPERT TRAINING - SUPERADMIN BLOCK BY ID API
// ============================================================================
// GET /api/superadmin/blocks/[id] - Get block details
// PUT /api/superadmin/blocks/[id] - Update block
// DELETE /api/superadmin/blocks/[id] - Delete block
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Validation schema
const updateBlockSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  movementPattern: z.string().optional(),
  physicalCapacity: z.string().optional(),
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

// GET - Get block by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const block = await prisma.block.findUnique({
      where: { id: params.id },
    })

    if (!block) {
      return NextResponse.json(
        { success: false, error: 'Bloco não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: block,
    })
  } catch (error) {
    console.error('Get block error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update block
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const existingBlock = await prisma.block.findUnique({
      where: { id: params.id },
    })

    if (!existingBlock) {
      return NextResponse.json(
        { success: false, error: 'Bloco não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateBlockSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const block = await prisma.block.update({
      where: { id: params.id },
      data: validation.data,
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'UPDATE',
        entity: 'Block',
        entityId: block.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: block,
    })
  } catch (error) {
    console.error('Update block error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Delete block
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const block = await prisma.block.findUnique({
      where: { id: params.id },
    })

    if (!block) {
      return NextResponse.json(
        { success: false, error: 'Bloco não encontrado' },
        { status: 404 }
      )
    }

    await prisma.block.delete({
      where: { id: params.id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'DELETE',
        entity: 'Block',
        entityId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Bloco excluído com sucesso',
    })
  } catch (error) {
    console.error('Delete block error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
