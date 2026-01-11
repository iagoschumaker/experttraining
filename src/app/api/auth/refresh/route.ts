// ============================================================================
// EXPERT TRAINING - REFRESH TOKEN API
// ============================================================================
// POST /api/auth/refresh
// Renova o access token usando o refresh token
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { 
  verifyRefreshToken,
  generateAccessToken,
  generateAccessTokenWithStudio,
  setAccessTokenCookie,
  getRefreshTokenCookie,
  getAccessTokenCookie,
  verifyAccessToken,
  hasStudioContext,
} from '@/lib/auth'
import type { JWTPayload, JWTPayloadWithStudio } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token
    const refreshToken = await getRefreshTokenCookie()
    
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token não encontrado' },
        { status: 401 }
      )
    }

    // Verify refresh token
    const refreshPayload = verifyRefreshToken(refreshToken)
    
    if (!refreshPayload) {
      return NextResponse.json(
        { success: false, error: 'Refresh token inválido' },
        { status: 401 }
      )
    }

    // Check if refresh token exists in database and is not revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: refreshPayload.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!storedToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token revogado ou expirado' },
        { status: 401 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: refreshPayload.userId },
      select: {
        id: true,
        isSuperAdmin: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 401 }
      )
    }

    // Try to preserve studio context from current token
    const currentAccessToken = await getAccessTokenCookie()
    let newAccessToken: string

    if (currentAccessToken) {
      const currentPayload = verifyAccessToken(currentAccessToken)
      
      if (currentPayload && hasStudioContext(currentPayload)) {
        // Verify studio still exists and is accessible
        const userStudio = await prisma.userStudio.findFirst({
          where: {
            userId: user.id,
            studioId: currentPayload.studioId,
            isActive: true,
          },
          include: {
            studio: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        })

        if (userStudio && userStudio.studio.status === 'ACTIVE') {
          // Preserve studio context
          const newPayload: JWTPayloadWithStudio = {
            userId: user.id,
            isSuperAdmin: user.isSuperAdmin,
            studioId: currentPayload.studioId,
            studioName: currentPayload.studioName,
            role: userStudio.role as 'STUDIO_ADMIN' | 'TRAINER',
          }
          newAccessToken = generateAccessTokenWithStudio(newPayload)
        } else {
          // Studio no longer accessible, generate token without context
          const newPayload: JWTPayload = {
            userId: user.id,
            isSuperAdmin: user.isSuperAdmin,
          }
          newAccessToken = generateAccessToken(newPayload)
        }
      } else {
        // No studio context in current token
        const newPayload: JWTPayload = {
          userId: user.id,
          isSuperAdmin: user.isSuperAdmin,
        }
        newAccessToken = generateAccessToken(newPayload)
      }
    } else {
      // No current token
      const newPayload: JWTPayload = {
        userId: user.id,
        isSuperAdmin: user.isSuperAdmin,
      }
      newAccessToken = generateAccessToken(newPayload)
    }

    // Set new access token
    await setAccessTokenCookie(newAccessToken)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Token renovado com sucesso',
      },
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
