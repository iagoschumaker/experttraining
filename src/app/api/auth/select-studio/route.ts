// ============================================================================
// EXPERT TRAINING - SELECT STUDIO API
// ============================================================================
// POST /api/auth/select-studio
// Seleciona um studio e gera novo token com contexto
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { 
  verifyAccessToken,
  generateAccessTokenWithStudio,
  setAccessTokenCookie,
  getAccessTokenCookie,
} from '@/lib/auth'
import type { JWTPayloadWithStudio } from '@/types'

// Validation schema
const selectStudioSchema = z.object({
  studioId: z.string().min(1, 'Studio ID é obrigatório'),
})

export async function POST(request: NextRequest) {
  try {
    // Get current token
    const accessToken = await getAccessTokenCookie()
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verify current token
    const currentPayload = verifyAccessToken(accessToken)
    
    if (!currentPayload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validation = selectStudioSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { studioId } = validation.data

    // Get studio with user's role
    const userStudio = await prisma.userStudio.findFirst({
      where: {
        userId: currentPayload.userId,
        studioId: studioId,
        isActive: true,
      },
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
    })

    // Check if SuperAdmin (can access any studio)
    let studio
    let role: 'STUDIO_ADMIN' | 'TRAINER'

    if (currentPayload.isSuperAdmin) {
      // SuperAdmin can access any studio
      studio = await prisma.studio.findUnique({
        where: { id: studioId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      })
      
      if (!studio) {
        return NextResponse.json(
          { success: false, error: 'Studio não encontrado' },
          { status: 404 }
        )
      }
      
      role = 'STUDIO_ADMIN' // SuperAdmin has full access
    } else {
      // Regular user - must have access to studio
      if (!userStudio) {
        return NextResponse.json(
          { success: false, error: 'Acesso negado a este studio' },
          { status: 403 }
        )
      }

      // Check if studio is active
      if (userStudio.studio.status === 'SUSPENDED') {
        return NextResponse.json(
          { success: false, error: 'Studio suspenso. Entre em contato com o suporte.' },
          { status: 403 }
        )
      }

      studio = userStudio.studio
      role = userStudio.role as 'STUDIO_ADMIN' | 'TRAINER'
    }

    // Generate new token with studio context
    const newPayload: JWTPayloadWithStudio = {
      userId: currentPayload.userId,
      isSuperAdmin: currentPayload.isSuperAdmin,
      studioId: studio.id,
      role: role,
      studioName: studio.name,
    }

    const newAccessToken = generateAccessTokenWithStudio(newPayload)
    
    // Set new cookie
    await setAccessTokenCookie(newAccessToken)

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: currentPayload.userId,
        studioId: studio.id,
        action: 'SELECT_STUDIO',
        entity: 'Studio',
        entityId: studio.id,
        metadata: {
          studioName: studio.name,
          role: role,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        studio: {
          id: studio.id,
          name: studio.name,
          slug: studio.slug,
        },
        role: role,
        redirect: '/dashboard',
      },
    })
  } catch (error) {
    console.error('Select studio error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
