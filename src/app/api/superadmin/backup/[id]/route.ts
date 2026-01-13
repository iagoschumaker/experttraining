// ============================================================================
// EXPERT TRAINING - SUPERADMIN BACKUP ITEM API
// ============================================================================
// GET    /api/superadmin/backup/[id] - Obter detalhes do backup
// DELETE /api/superadmin/backup/[id] - Deletar backup
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { formatBytes, validateBackup } from '@/lib/backup/index'
import { loadBackup, deleteBackup as deleteBackupFile, getBackupFileSize } from '@/lib/backup/storage'
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

// GET - Get backup details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const backupId = params.id
    const backup = await loadBackup(backupId)
    
    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup não encontrado' },
        { status: 404 }
      )
    }

    // Validate backup
    const validation = validateBackup(backup)

    return NextResponse.json({ 
      success: true, 
      data: {
        ...backup.metadata,
        sizeFormatted: formatBytes(backup.metadata.size),
        totalRecords: (Object.values(backup.metadata.recordCounts) as number[]).reduce((a, b) => a + b, 0),
        validation,
      }
    })
  } catch (error) {
    console.error('Error getting backup:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao obter backup' },
      { status: 500 }
    )
  }
}

// DELETE - Delete backup
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const backupId = params.id
    
    // Delete file
    const deleted = await deleteBackupFile(backupId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Backup não encontrado' },
        { status: 404 }
      )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'BACKUP_DELETED',
        entity: 'System',
        entityId: backupId,
        metadata: { backupId },
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Backup deletado com sucesso!'
    })
  } catch (error) {
    console.error('Error deleting backup:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao deletar backup' },
      { status: 500 }
    )
  }
}
