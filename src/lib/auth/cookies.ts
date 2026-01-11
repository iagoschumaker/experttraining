// ============================================================================
// EXPERT TRAINING - COOKIES SERVICE
// ============================================================================
// Gerenciamento de cookies HTTP-only para tokens
// ============================================================================

import { cookies } from 'next/headers'
import { COOKIES } from '@/lib/constants'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Cookie options
const BASE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
  path: '/',
}

// ============================================================================
// SET COOKIES
// ============================================================================

/**
 * Define o access token no cookie
 */
export async function setAccessTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIES.ACCESS_TOKEN, token, {
    ...BASE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  })
}

/**
 * Define o refresh token no cookie
 */
export async function setRefreshTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIES.REFRESH_TOKEN, token, {
    ...BASE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

// ============================================================================
// GET COOKIES
// ============================================================================

/**
 * Obtém o access token do cookie
 */
export async function getAccessTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIES.ACCESS_TOKEN)?.value
}

/**
 * Obtém o refresh token do cookie
 */
export async function getRefreshTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIES.REFRESH_TOKEN)?.value
}

// ============================================================================
// CLEAR COOKIES
// ============================================================================

/**
 * Remove todos os cookies de autenticação
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIES.ACCESS_TOKEN)
  cookieStore.delete(COOKIES.REFRESH_TOKEN)
}
