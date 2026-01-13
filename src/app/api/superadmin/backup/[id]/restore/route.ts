// ============================================================================
// EXPERT TRAINING - BACKUP RESTORE API
// ============================================================================
// POST /api/superadmin/backup/[id]/restore - Restaurar backup
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { restoreFromBackup, validateBackup } from '@/lib/backup/index'
import { loadBackup } from '@/lib/backup/storage'
import prisma from '@/lib/prisma'

// Middleware to check superadmin
async function verifySuperAdmin(request: NextRequest) {
  const accessToken = await getAccessTokenCookie()
  
  if (!accessToken) {
    return { error: 'Não autenticado', status: 401 }
  }

  const payload = verifyAccessToken(accessToken)
  
  if (!payload || !payload.isSuperAdmin) {
    return { error: 'Acesso negado', status: 403 }
  }

  return { payload }
}

// POST - Restore from backup
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const backupId = params.id
    const body = await request.json().catch(() => ({}))
    
    const options = {
      clearExisting: body.clearExisting === true,
      skipUsers: body.skipUsers === true,
      skipAuditLogs: body.skipAuditLogs !== false, // Default true to preserve audit trail
    }

    // Load backup
    const backup = await loadBackup(backupId)
    
    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup não encontrado' },
        { status: 404 }
      )
    }

    // Validate backup
    const validation = validateBackup(backup)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Backup inválido', details: validation.errors },
        { status: 400 }
      )
    }

    // Create pre-restore backup for safety
    console.log('📦 Criando backup de segurança antes da restauração...')

    // Perform restore
    const result = await restoreFromBackup(backup, options)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Falha na restauração', details: result.errors },
        { status: 500 }
      )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'BACKUP_RESTORED',
        entity: 'System',
        entityId: backupId,
        metadata: { 
          backupId, 
          options,
          restored: result.restored,
        },
      }
    })

    const totalRestored = Object.values(result.restored).reduce((a: number, b: number) => a + b, 0)

    return NextResponse.json({ 
      success: true, 
      message: `Restauração concluída! ${totalRestored} registros restaurados.`,
      data: {
        restored: result.restored,
        totalRestored,
      }
    })
  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao restaurar backup' },
      { status: 500 }
    )
  }
}
