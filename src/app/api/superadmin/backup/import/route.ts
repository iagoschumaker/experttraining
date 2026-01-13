// ============================================================================
// EXPERT TRAINING - BACKUP IMPORT API
// ============================================================================
// POST /api/superadmin/backup/import - Importar backup de arquivo
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { validateBackup, formatBytes, BackupData } from '@/lib/backup/index'
import { importBackup, listBackups } from '@/lib/backup/storage'
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

// POST - Import backup from file
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()
    
    // Parse and validate
    let backup: BackupData
    try {
      backup = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Arquivo JSON inválido' },
        { status: 400 }
      )
    }

    // Validate structure
    const validation = validateBackup(backup)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Backup inválido', details: validation.errors },
        { status: 400 }
      )
    }

    // Check if backup already exists
    const existingBackups = await listBackups()
    const exists = existingBackups.some(b => b.id === backup.metadata.id)
    
    if (exists) {
      return NextResponse.json(
        { success: false, error: 'Este backup já existe no sistema' },
        { status: 409 }
      )
    }

    // Import backup
    const imported = await importBackup(content)
    
    if (!imported) {
      return NextResponse.json(
        { success: false, error: 'Erro ao importar backup' },
        { status: 500 }
      )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'BACKUP_IMPORTED',
        entity: 'System',
        entityId: backup.metadata.id,
        metadata: { 
          backupId: backup.metadata.id,
          originalDate: backup.metadata.createdAt,
          size: backup.metadata.size,
        },
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Backup importado com sucesso!',
      data: {
        ...backup.metadata,
        sizeFormatted: formatBytes(backup.metadata.size),
        totalRecords: Object.values(backup.metadata.recordCounts).reduce((a: number, b: number) => a + b, 0),
      }
    })
  } catch (error) {
    console.error('Error importing backup:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao importar backup' },
      { status: 500 }
    )
  }
}
