// ============================================================================
// EXPERT TRAINING - JWT SERVICE (EDGE RUNTIME)
// ============================================================================
// Versão compatível com Edge Runtime para uso no middleware
// Usa a biblioteca 'jose' que funciona em Edge
// ============================================================================

import * as jose from 'jose'
import type { JWTPayload, JWTPayloadWithStudio } from '@/types'

// Secret como Uint8Array para jose
const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
)

// ============================================================================
// VERIFY TOKEN (EDGE COMPATIBLE)
// ============================================================================

/**
 * Verifica e decodifica um access token (Edge Runtime)
 */
export async function verifyAccessTokenEdge(
  token: string
): Promise<JWTPayload | JWTPayloadWithStudio | null> {
  try {
    const { payload } = await jose.jwtVerify(token, ACCESS_SECRET)
    return payload as unknown as JWTPayload | JWTPayloadWithStudio
  } catch (error) {
    console.log('JWT verification error:', error)
    return null
  }
}

/**
 * Verifica se o payload tem contexto de studio
 */
export function hasStudioContext(
  payload: JWTPayload | JWTPayloadWithStudio
): payload is JWTPayloadWithStudio {
  return 'studioId' in payload && 'role' in payload
}
