// ============================================================================
// EXPERT TRAINING - ME API
// ============================================================================
// GET /api/auth/me
// Retorna dados do usuário autenticado
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie, hasStudioContext } from '@/lib/auth'
import type { UserStudioLink } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Get token
    const accessToken = await getAccessTokenCookie()
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = verifyAccessToken(accessToken)
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Get user with studios
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        isActive: true,
        createdAt: true,
        studios: {
          where: { isActive: true },
          include: {
            studio: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
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

    // Map studios
    const studios: UserStudioLink[] = user.studios.map((us: any) => ({
      id: us.id,
      studioId: us.studio.id,
      studioName: us.studio.name,
      studioSlug: us.studio.slug,
      studioStatus: us.studio.status as 'ACTIVE' | 'SUSPENDED',
      role: us.role as 'STUDIO_ADMIN' | 'TRAINER',
      joinedAt: us.joinedAt,
    }))

    // Get current studio context if exists
    let currentStudio = null
    if (hasStudioContext(payload)) {
      currentStudio = {
        studioId: payload.studioId,
        studioName: payload.studioName,
        role: payload.role,
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isSuperAdmin: user.isSuperAdmin,
        },
        studios,
        currentStudio,
      },
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
