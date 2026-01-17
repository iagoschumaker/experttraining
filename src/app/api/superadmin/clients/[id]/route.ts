// ============================================================================
// EXPERT TRAINING - SUPERADMIN CLIENT BY ID API
// ============================================================================
// GET /api/superadmin/clients/[id] - Get client details
// DELETE /api/superadmin/clients/[id] - Delete client
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Middleware to check superadmin
async function verifySuperAdmin() {
  const accessToken = await getAccessTokenCookie()
  if (!accessToken) return { error: 'Não autenticado', status: 401 }
  const payload = verifyAccessToken(accessToken)
  if (!payload || !payload.isSuperAdmin) return { error: 'Acesso negado', status: 403 }
  return { payload }
}

// GET - Get client by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workouts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: client,
    })
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// DELETE - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Delete client (cascade will handle related records)
    await prisma.client.delete({
      where: { id: params.id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        studioId: client.studioId || undefined,
        action: 'DELETE',
        entity: 'Client',
        entityId: params.id,
        oldData: client as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Cliente excluído com sucesso' },
    })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir cliente' },
      { status: 500 }
    )
  }
}
