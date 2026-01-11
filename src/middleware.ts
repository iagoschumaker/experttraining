// ============================================================================
// EXPERT TRAINING - MIDDLEWARE
// ============================================================================
// Middleware RBAC para proteção de rotas
// ============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessTokenEdge, hasStudioContext } from '@/lib/auth/jwt-edge'
import { COOKIES, ROUTES } from '@/lib/constants'

// ============================================================================
// ROUTE PATTERNS
// ============================================================================

const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/refresh']
const SUPERADMIN_ROUTES = /^\/superadmin/
const APP_ROUTES = /^\/app/
const SELECT_STUDIO_ROUTE = '/select-studio'

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Skip static files and API health
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Get access token from cookie
  const accessToken = request.cookies.get(COOKIES.ACCESS_TOKEN)?.value
  console.log('🔒 Middleware check for:', pathname, '| Token:', accessToken ? 'EXISTS' : 'MISSING')

  // No token - redirect to login
  if (!accessToken) {
    console.log('❌ No token, redirecting to login')
    return redirectToLogin(request)
  }

  // Verify token (async for jose library)
  const payload = await verifyAccessTokenEdge(accessToken)
  console.log('🔓 Token verified:', payload ? 'VALID' : 'INVALID')

  if (!payload) {
    // Token invalid/expired - try refresh or redirect to login
    console.log('❌ Invalid token, redirecting to login')
    return redirectToLogin(request)
  }

  // ============================================================================
  // SUPERADMIN ROUTES
  // ============================================================================
  if (SUPERADMIN_ROUTES.test(pathname)) {
    // Only SuperAdmin can access /superadmin/*
    if (!payload.isSuperAdmin) {
      return redirectToUnauthorized(request)
    }
    
    // SuperAdmin can access without studio context
    return NextResponse.next()
  }

  // ============================================================================
  // SELECT STUDIO ROUTE
  // ============================================================================
  if (pathname === SELECT_STUDIO_ROUTE) {
    // SuperAdmin can also access this page to select a studio
    // The page will show options for both SuperAdmin dashboard and studio access
    return NextResponse.next()
  }

  // ============================================================================
  // APP ROUTES (STUDIO REQUIRED)
  // ============================================================================
  if (APP_ROUTES.test(pathname)) {
    // SuperAdmin can access any studio
    if (payload.isSuperAdmin) {
      // SuperAdmin needs studio context too for /app routes
      if (!hasStudioContext(payload)) {
        return NextResponse.redirect(new URL(ROUTES.SUPERADMIN_DASHBOARD, request.url))
      }
    }

    // Regular user needs studio context
    if (!hasStudioContext(payload)) {
      return NextResponse.redirect(new URL(SELECT_STUDIO_ROUTE, request.url))
    }

    // Validate studio is still active (call API or check in token)
    // For now, we trust the token - studio status check happens at token generation
    
    // Add studio context to headers for API routes to use
    const response = NextResponse.next()
    response.headers.set('x-studio-id', payload.studioId)
    response.headers.set('x-user-role', payload.role)
    response.headers.set('x-user-id', payload.userId)
    
    return response
  }

  // Default: allow
  return NextResponse.next()
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL(ROUTES.LOGIN, request.url)
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
  
  const response = NextResponse.redirect(loginUrl)
  
  // Clear invalid cookies
  response.cookies.delete(COOKIES.ACCESS_TOKEN)
  response.cookies.delete(COOKIES.REFRESH_TOKEN)
  
  return response
}

function redirectToUnauthorized(request: NextRequest) {
  // Redirect to appropriate dashboard based on context
  return NextResponse.redirect(new URL(ROUTES.APP_DASHBOARD, request.url))
}

// ============================================================================
// MATCHER CONFIG
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
