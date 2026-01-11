// ============================================================================
// EXPERT TRAINING - STUDIO USER BY ID API
// ============================================================================
// PUT /api/studio/users/[id] - Update user role or status
// DELETE /api/studio/users/[id] - Remove user from studio
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// Validation schema
const updateUserSchema = z.object({
  role: z.enum(['STUDIO_ADMIN', 'TRAINER']).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
})

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const existingUserStudio = await prisma.userStudio.findUnique({
      where: { id: params.id },
      include: { user: true },
    })

    if (!existingUserStudio || existingUserStudio.studioId !== auth.payload.studioId) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado neste studio' },
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

    const { role, isActive, resetPassword, newPassword } = validation.data

    // Update UserStudio
    const userStudio = await prisma.userStudio.update({
      where: { id: params.id },
      data: {
        role,
        isActive,
      },
    })

    // Reset password if requested
    let passwordReset = false
    if (resetPassword && newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: existingUserStudio.userId },
        data: { passwordHash },
      })
      passwordReset = true
    }

    return NextResponse.json({
      success: true,
      data: {
        userStudio,
        passwordReset,
      },
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remove user from studio (deactivate, not delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const existingUserStudio = await prisma.userStudio.findUnique({
      where: { id: params.id },
      include: { user: true },
    })

    if (!existingUserStudio || existingUserStudio.studioId !== auth.payload.studioId) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado neste studio' },
        { status: 404 }
      )
    }

    // Check if this is the last active admin
    if (existingUserStudio.role === 'STUDIO_ADMIN') {
      const otherAdmins = await prisma.userStudio.count({
        where: {
          studioId: auth.payload.studioId,
          role: 'STUDIO_ADMIN',
          isActive: true,
          id: { not: params.id },
        },
      })

      if (otherAdmins === 0) {
        return NextResponse.json(
          { success: false, error: 'Não é possível remover o último administrador do studio' },
          { status: 400 }
        )
      }
    }

    // Check if user has other studio links
    const otherLinks = await prisma.userStudio.count({
      where: {
        userId: existingUserStudio.userId,
        id: { not: params.id },
      },
    })

    if (otherLinks === 0) {
      // User only belongs to this studio - delete the link AND the user
      await prisma.userStudio.delete({
        where: { id: params.id },
      })
      
      // Also delete the user since they have no other studios
      await prisma.user.delete({
        where: { id: existingUserStudio.userId },
      })

      return NextResponse.json({
        success: true,
        message: 'Usuário removido do studio e conta excluída',
        userDeleted: true,
      })
    } else {
      // User belongs to other studios - just delete the link
      await prisma.userStudio.delete({
        where: { id: params.id },
      })

      return NextResponse.json({
        success: true,
        message: 'Usuário removido do studio (conta mantida pois tem acesso a outros studios)',
        userDeleted: false,
      })
    }
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
