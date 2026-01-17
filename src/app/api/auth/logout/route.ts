// ============================================================================
// EXPERT PRO TRAINING - LOGOUT API
// ============================================================================
// POST /api/auth/logout
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { 
  clearAuthCookies,
  getRefreshTokenCookie,
  verifyAccessToken,
  getAccessTokenCookie,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get tokens
    const accessToken = await getAccessTokenCookie()
    const refreshToken = await getRefreshTokenCookie()

    // Revoke refresh token in database
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      })
    }

    // Log audit if we have user info
    if (accessToken) {
      const payload = verifyAccessToken(accessToken)
      if (payload) {
        await prisma.auditLog.create({
          data: {
            userId: payload.userId,
            action: 'LOGOUT',
            entity: 'User',
            entityId: payload.userId,
          },
        })
      }
    }

    // Clear cookies
    await clearAuthCookies()

    return NextResponse.json({
      success: true,
      data: {
        redirect: '/login',
      },
    })
  } catch (error) {
    console.error('Logout error:', error)
    
    // Clear cookies even on error
    await clearAuthCookies()
    
    return NextResponse.json({
      success: true,
      data: {
        redirect: '/login',
      },
    })
  }
}
