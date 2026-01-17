// ============================================================================
// EXPERT PRO TRAINING - CHANGE PASSWORD API
// ============================================================================
// POST /api/auth/change-password
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyPassword, hashPassword, verifyAccessToken } from '@/lib/auth'
import { COOKIES } from '@/lib/constants'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(1, 'Nova senha é obrigatória'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine(
  data => data.newPassword === data.confirmPassword,
  { message: 'As senhas não conferem', path: ['confirmPassword'] }
)

export async function POST(request: NextRequest) {
  try {
    // Get and verify access token
    const accessToken = request.cookies.get(COOKIES.ACCESS_TOKEN)?.value
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const payload = verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validation = changePasswordSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = validation.data

    // Get user from database with their studio roles
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        isSuperAdmin: true,
        studios: {
          where: { isActive: true },
          select: {
            role: true,
          },
        },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // SECURITY: Only users with TRAINER role can use this endpoint
    // SuperAdmins and StudioAdmins should use their respective admin areas
    const hasTrainerRole = user.studios.some(studio => studio.role === 'TRAINER')
    
    if (user.isSuperAdmin || !hasTrainerRole) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Use a área administrativa para alterar sua senha.' },
        { status: 403 }
      )
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Senha atual incorreta' },
        { status: 401 }
      )
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })

    // Invalidate all refresh tokens for this user (force re-login on other devices)
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entityId: user.id,
        metadata: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      },
    })

    console.log('✅ Password changed successfully for user:', user.email)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Senha alterada com sucesso',
      },
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
