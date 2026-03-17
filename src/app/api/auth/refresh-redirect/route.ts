// ============================================================================
// EXPERT PRO TRAINING - REFRESH REDIRECT
// ============================================================================
// GET /api/auth/refresh-redirect?redirect=/path
// Chamado pelo middleware quando access token expirou mas refresh token existe.
// Chama o refresh, salva o novo access token, e redireciona de volta.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  verifyRefreshToken,
  generateAccessToken,
  generateAccessTokenWithStudio,
  verifyAccessToken,
  hasStudioContext,
} from '@/lib/auth'
import { COOKIES, ROUTES } from '@/lib/constants'
import type { JWTPayload, JWTPayloadWithStudio } from '@/types'

export async function GET(request: NextRequest) {
  const redirectPath = request.nextUrl.searchParams.get('redirect') || '/'

  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get(COOKIES.REFRESH_TOKEN)?.value

    if (!refreshToken) {
      return redirectToLogin(request, redirectPath)
    }

    // Verify refresh token
    const refreshPayload = verifyRefreshToken(refreshToken)
    if (!refreshPayload) {
      return redirectToLogin(request, redirectPath)
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
      return redirectToLogin(request, redirectPath)
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
      return redirectToLogin(request, redirectPath)
    }

    // Try to preserve studio context from current (expired) access token
    const currentAccessToken = request.cookies.get(COOKIES.ACCESS_TOKEN)?.value
    let newAccessToken: string

    if (currentAccessToken) {
      // Even though expired, we can still decode it to get studio context
      const currentPayload = verifyAccessToken(currentAccessToken)

      if (currentPayload && hasStudioContext(currentPayload)) {
        const userStudio = await prisma.userStudio.findFirst({
          where: {
            userId: user.id,
            studioId: currentPayload.studioId,
            isActive: true,
          },
          include: {
            studio: { select: { id: true, name: true, status: true } },
          },
        })

        if (userStudio && userStudio.studio.status === 'ACTIVE') {
          const newPayload: JWTPayloadWithStudio = {
            userId: user.id,
            isSuperAdmin: user.isSuperAdmin,
            studioId: currentPayload.studioId,
            studioName: currentPayload.studioName,
            role: userStudio.role as 'STUDIO_ADMIN' | 'TRAINER',
          }
          newAccessToken = generateAccessTokenWithStudio(newPayload)
        } else {
          newAccessToken = generateAccessToken({
            userId: user.id,
            isSuperAdmin: user.isSuperAdmin,
          })
        }
      } else {
        newAccessToken = generateAccessToken({
          userId: user.id,
          isSuperAdmin: user.isSuperAdmin,
        })
      }
    } else {
      newAccessToken = generateAccessToken({
        userId: user.id,
        isSuperAdmin: user.isSuperAdmin,
      })
    }

    // Set new access token cookie and redirect back
    console.log('🔄 Token renovado via refresh-redirect, redirecionando para:', redirectPath)

    const response = NextResponse.redirect(new URL(redirectPath, request.url))
    response.cookies.set(COOKIES.ACCESS_TOKEN, newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    })

    return response
  } catch (error) {
    console.error('Refresh-redirect error:', error)
    return redirectToLogin(request, redirectPath)
  }
}

function redirectToLogin(request: NextRequest, redirectPath: string) {
  const loginUrl = new URL(ROUTES.LOGIN, request.url)
  loginUrl.searchParams.set('redirect', redirectPath)

  const response = NextResponse.redirect(loginUrl)
  response.cookies.delete(COOKIES.ACCESS_TOKEN)
  response.cookies.delete(COOKIES.REFRESH_TOKEN)

  return response
}
