// ============================================================================
// EXPERT PRO TRAINING - JWT SERVICE
// ============================================================================
// Gerenciamento de tokens JWT (access + refresh)
// ============================================================================

import jwt from 'jsonwebtoken'
import type { JWTPayload, JWTPayloadWithStudio } from '@/types'

// Secrets (em produção, usar env.ts validado)
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me'

// Expiration times
const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '7d'

// ============================================================================
// GENERATE TOKENS
// ============================================================================

/**
 * Gera um access token básico (sem studio)
 * Usado logo após o login, antes de selecionar studio
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  })
}

/**
 * Gera um access token com contexto de studio
 * Usado após selecionar um studio específico
 */
export function generateAccessTokenWithStudio(payload: JWTPayloadWithStudio): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  })
}

/**
 * Gera um refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  })
}

// ============================================================================
// VERIFY TOKENS
// ============================================================================

/**
 * Verifica e decodifica um access token
 */
export function verifyAccessToken(token: string): JWTPayload | JWTPayloadWithStudio | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET)
    return decoded as JWTPayload | JWTPayloadWithStudio
  } catch {
    return null
  }
}

/**
 * Verifica e decodifica um refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET)
    return decoded as { userId: string }
  } catch {
    return null
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se o payload tem contexto de studio
 */
export function hasStudioContext(
  payload: JWTPayload | JWTPayloadWithStudio
): payload is JWTPayloadWithStudio {
  return 'studioId' in payload && 'role' in payload
}

/**
 * Extrai o token do header Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  
  return parts[1]
}
