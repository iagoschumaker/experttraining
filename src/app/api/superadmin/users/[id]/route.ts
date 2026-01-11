// ============================================================================
// EXPERT TRAINING - SUPERADMIN USER BY ID API
// ============================================================================
// GET /api/superadmin/users/[id] - Get user details
// PUT /api/superadmin/users/[id] - Update user
// DELETE /api/superadmin/users/[id] - Delete user
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie, hashPassword } from '@/lib/auth'

// Validation schema
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  isSuperAdmin: z.boolean().optional(),
  studioAssignments: z.array(z.object({
    studioId: z.string(),
    role: z.enum(['STUDIO_ADMIN', 'TRAINER']),
  })).optional(),
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

// GET - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        studios: {
          include: {
            studio: {
              select: { id: true, name: true, status: true },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateUserSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password, isSuperAdmin, studioAssignments } = validation.data

    // Check email uniqueness if changing
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      })
      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email já está em uso' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = { name, email, isSuperAdmin }
    
    if (password) {
      updateData.passwordHash = await hashPassword(password)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
      },
    })

    // Update studio assignments if provided
    if (studioAssignments !== undefined) {
      // Delete existing assignments
      await prisma.userStudio.deleteMany({
        where: { userId: params.id },
      })

      // Create new assignments
      if (studioAssignments.length > 0) {
        await prisma.userStudio.createMany({
          data: studioAssignments.map((assignment) => ({
            userId: params.id,
            studioId: assignment.studioId,
            role: assignment.role,
          })),
        })
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Prevent self-deletion
    if (user.id === auth.payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      )
    }

    // Delete user (cascade will handle userStudios)
    await prisma.user.delete({
      where: { id: params.id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'DELETE',
        entity: 'User',
        entityId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Usuário excluído com sucesso',
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
