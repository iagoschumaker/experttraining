// ============================================================================
// EXPERT PRO TRAINING - LOGIN API
// ============================================================================
// POST /api/auth/login
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { 
  verifyPassword, 
  generateAccessToken, 
  generateRefreshToken,
} from '@/lib/auth'
import { COOKIES } from '@/lib/constants'
import type { JWTPayload, UserStudioLink } from '@/types'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Validation schema
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate body
    const body = await request.json()
    const validation = loginSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password } = validation.data
    console.log('🔐 Login attempt for:', email)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
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

    console.log('🔍 User found:', user ? `${user.email} (active: ${user.isActive})` : 'NOT FOUND')

    // User not found or inactive
    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive')
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    console.log('🔑 Password valid:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ Invalid password')
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    console.log('✅ Login successful for:', email)

    // Generate tokens (without studio context initially)
    const payload: JWTPayload = {
      userId: user.id,
      isSuperAdmin: user.isSuperAdmin,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(user.id)

    // Save refresh token to database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      },
    })

    // Map studios for response
    const studios: UserStudioLink[] = user.studios.map((us: any) => ({
      id: us.id,
      studioId: us.studio.id,
      studioName: us.studio.name,
      studioSlug: us.studio.slug,
      studioStatus: us.studio.status as 'ACTIVE' | 'SUSPENDED',
      role: us.role as 'STUDIO_ADMIN' | 'TRAINER',
      joinedAt: us.joinedAt,
    }))

    // Determine redirect
    let redirect: string

    if (user.isSuperAdmin && studios.length > 0) {
      // SuperAdmin with studios - show selector to choose between SuperAdmin or Studio access
      redirect = '/select-studio'
    } else if (user.isSuperAdmin) {
      // SuperAdmin without studios - go directly to SuperAdmin dashboard
      redirect = '/superadmin/dashboard'
    } else if (studios.length === 0) {
      // User has no studios - shouldn't happen in normal flow
      redirect = '/login'
    } else if (studios.length === 1) {
      // Only one studio - auto-select (will need to call select-studio API)
      redirect = `/api/auth/select-studio?studioId=${studios[0].studioId}&autoRedirect=true`
    } else {
      // Multiple studios - show selector
      redirect = '/select-studio'
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        metadata: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      },
    })

    // Create response with cookies set directly
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isSuperAdmin: user.isSuperAdmin,
        },
        studios,
        redirect,
      },
    })

    // Set cookies directly on the response
    response.cookies.set(COOKIES.ACCESS_TOKEN, accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    })

    response.cookies.set(COOKIES.REFRESH_TOKEN, refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    console.log('🍪 Cookies set on response')
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
