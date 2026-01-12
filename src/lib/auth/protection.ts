// ============================================================================
// EXPERT TRAINING - MIDDLEWARE DE PROTEÇÃO DE DADOS DO MÉTODO
// ============================================================================
// ⚠️ Este middleware implementa a REGRA ABSOLUTA DE NEGÓCIO:
// - Dados com is_locked = true são IMUTÁVEIS para studios
// - Apenas SuperAdmin pode criar/alterar/excluir dados protegidos
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, getAccessTokenCookie } from './index'
import type { JWTPayloadWithStudio } from '@/types'
import prisma from '@/lib/prisma'
import { checkStudioPayment } from '@/lib/billing/payment-check'

/**
 * Verifica autenticação do usuário (usando cookies)
 * Retorna payload com contexto de studio se disponível
 * 
 * HIERARQUIA DE PERMISSÕES (baseada no UserStudio.role):
 * 1. STUDIO_ADMIN - Administrador do studio (vê e gerencia tudo no studio)
 * 2. TRAINER - Treinador (vê apenas seus próprios clientes/treinos)
 * 
 * IMPORTANTE: 
 * - SuperAdmin COM studioId no token → usa o ROLE do UserStudio (não tem privilégios especiais)
 * - SuperAdmin SEM studioId → só acessa área /superadmin
 * - Permissões são SEMPRE baseadas no ROLE do UserStudio quando em contexto de studio
 * 
 * @param request - NextRequest (opcional, para compatibilidade)
 * @param allowedRoles - Roles permitidos (ex: ['STUDIO_ADMIN', 'TRAINER'])
 * @returns Payload com userId, studioId, role OU objeto com error
 */
export async function verifyAuth(
  request?: NextRequest,
  allowedRoles?: string[]
): Promise<
  | { userId: string; studioId: string; role: string; payload: JWTPayloadWithStudio }
  | { error: string; status: number }
> {
  try {
    const token = await getAccessTokenCookie()
    
    if (!token) {
      return { error: 'Token não fornecido', status: 401 }
    }

    const payload = verifyAccessToken(token)

    if (!payload) {
      return { error: 'Token inválido', status: 401 }
    }

    // Para rotas de Studio/Personal, precisa ter studioId
    const studioPayload = payload as JWTPayloadWithStudio
    if (!studioPayload.studioId) {
      // Se for SuperAdmin sem contexto de studio, bloquear
      if (payload.isSuperAdmin) {
        return { error: 'SuperAdmin precisa selecionar um studio', status: 403 }
      }
      return { error: 'Usuário não está vinculado a um studio', status: 403 }
    }

    // Buscar role do usuário no studio
    const userStudio = await prisma.userStudio.findFirst({
      where: {
        userId: studioPayload.userId,
        studioId: studioPayload.studioId,
      },
    })

    if (!userStudio) {
      console.error('❌ UserStudio não encontrado:', {
        userId: studioPayload.userId,
        studioId: studioPayload.studioId,
      })
      return { error: 'Usuário não encontrado no studio', status: 403 }
    }

    const role = userStudio.role
    console.log('✅ Permissão verificada:', {
      userId: studioPayload.userId,
      studioId: studioPayload.studioId,
      role,
      isSuperAdmin: payload.isSuperAdmin,
      allowedRoles,
    })

    // 🔒 VERIFICAR PAGAMENTO DO STUDIO (novo)
    // SuperAdmin sempre tem acesso, mesmo se studio não pagou
    if (!payload.isSuperAdmin) {
      const paymentCheck = await checkStudioPayment(studioPayload.studioId)
      
      if (!paymentCheck.allowed) {
        console.error('❌ Acesso bloqueado - Pagamento pendente:', {
          studioId: studioPayload.studioId,
          reason: paymentCheck.blockReason,
        })
        
        return {
          error: 'Acesso bloqueado',
          status: 402, // 402 Payment Required
          message: paymentCheck.message,
          blockReason: paymentCheck.blockReason,
        } as any
      }

      // Se está em período de carência, adiciona aviso no log
      if (paymentCheck.message) {
        console.warn('⚠️ Período de carência:', paymentCheck.message)
      }
    }

    // Verificar se o role é permitido
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(role)) {
        console.error('❌ Role não permitido:', { role, allowedRoles })
        return { error: 'Permissão negada para esta operação', status: 403 }
      }
    }

    return {
      userId: studioPayload.userId,
      studioId: studioPayload.studioId,
      role,
      payload: studioPayload,
    }
  } catch (error) {
    console.error('verifyAuth error:', error)
    return { error: 'Erro na autenticação', status: 500 }
  }
}

/**
 * Verifica se o usuário atual é SuperAdmin (usando cookies)
 * Para uso em route handlers sem passar request
 */
export async function verifySuperAdmin(): Promise<{
  userId: string
  isSuperAdmin: boolean
} | null> {
  try {
    const token = await getAccessTokenCookie()
    
    if (!token) {
      return null
    }

    const payload = verifyAccessToken(token)

    if (!payload || !payload.isSuperAdmin) {
      return null
    }

    return {
      userId: payload.userId,
      isSuperAdmin: payload.isSuperAdmin,
    }
  } catch {
    return null
  }
}

/**
 * Verifica se o usuário atual é SuperAdmin (usando request headers)
 * Para uso em middlewares que recebem NextRequest
 */
export async function verifySuperAdminFromRequest(request: NextRequest): Promise<{
  isAuthorized: boolean
  error?: NextResponse
  userId?: string
}> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthorized: false,
      error: NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      ),
    }
  }

  const token = authHeader.substring(7)
  const payload = verifyAccessToken(token)

  if (!payload) {
    return {
      isAuthorized: false,
      error: NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      ),
    }
  }

  if (!payload.isSuperAdmin) {
    return {
      isAuthorized: false,
      error: NextResponse.json(
        { 
          error: 'Acesso negado',
          message: 'Apenas o SuperAdmin pode realizar esta operação',
          code: 'SUPERADMIN_REQUIRED'
        },
        { status: 403 }
      ),
    }
  }

  return {
    isAuthorized: true,
    userId: payload.userId,
  }
}

/**
 * Middleware para proteger operações em dados do método
 * Bloqueia PUT, PATCH, DELETE em registros com is_locked = true
 */
export async function protectLockedData(
  request: NextRequest,
  checkLocked: () => Promise<boolean>
): Promise<NextResponse | null> {
  const method = request.method

  // GET é sempre permitido (leitura)
  if (method === 'GET') {
    return null
  }

  // Para operações de escrita, verificar se é SuperAdmin
  const authResult = await verifySuperAdminFromRequest(request)

  if (authResult.isAuthorized) {
    // SuperAdmin pode fazer qualquer operação
    return null
  }

  // Se não é SuperAdmin, verificar se o dado é protegido
  const isLocked = await checkLocked()

  if (isLocked) {
    return NextResponse.json(
      {
        error: 'Operação não permitida',
        message: 'Este registro é parte do Método Expert Training e não pode ser modificado',
        code: 'LOCKED_DATA',
        hint: 'Apenas o SuperAdmin pode modificar dados protegidos do método',
      },
      { status: 403 }
    )
  }

  // Dado não é protegido, verificar autenticação normal
  if (!authResult.isAuthorized && authResult.error) {
    return authResult.error
  }

  return null
}

/**
 * Erros padrão para dados protegidos
 */
export const PROTECTION_ERRORS = {
  CANNOT_MODIFY_LOCKED: {
    error: 'Operação não permitida',
    message: 'Este registro é protegido e não pode ser modificado',
    code: 'CANNOT_MODIFY_LOCKED',
  },
  CANNOT_DELETE_LOCKED: {
    error: 'Operação não permitida',
    message: 'Este registro é protegido e não pode ser excluído',
    code: 'CANNOT_DELETE_LOCKED',
  },
  SUPERADMIN_ONLY: {
    error: 'Acesso negado',
    message: 'Esta operação requer permissão de SuperAdmin',
    code: 'SUPERADMIN_ONLY',
  },
}

/**
 * Helper para verificar se um studio pode acessar dados protegidos
 * Studios podem APENAS LER dados protegidos, nunca modificar
 */
export function canStudioAccessProtectedData(
  method: string,
  isLocked: boolean,
  isSuperAdmin: boolean
): { allowed: boolean; reason?: string } {
  // SuperAdmin pode tudo
  if (isSuperAdmin) {
    return { allowed: true }
  }

  // Se não é protegido, studio pode fazer qualquer operação
  if (!isLocked) {
    return { allowed: true }
  }

  // Dado protegido: studio só pode ler
  if (method === 'GET') {
    return { allowed: true }
  }

  // Qualquer outra operação em dado protegido é negada para studios
  return {
    allowed: false,
    reason: 'Este dado é parte do Método Expert Training e não pode ser alterado por studios',
  }
}
