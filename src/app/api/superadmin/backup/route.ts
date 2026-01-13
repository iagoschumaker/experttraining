// ============================================================================
// EXPERT TRAINING - SUPERADMIN BACKUP API
// ============================================================================
// GET  /api/superadmin/backup - Lista todos os backups
// POST /api/superadmin/backup - Cria novo backup
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { createFullBackup, formatBytes } from '@/lib/backup/index'
import { listBackups, saveBackup } from '@/lib/backup/storage'
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

// GET - List all backups
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const backups = await listBackups()
    
    // Format for frontend
    const formattedBackups = backups.map(backup => ({
      ...backup,
      sizeFormatted: formatBytes(backup.size),
      totalRecords: (Object.values(backup.recordCounts) as number[]).reduce((a, b) => a + b, 0),
    }))

    return NextResponse.json({ 
      success: true, 
      data: formattedBackups,
      total: formattedBackups.length
    })
  } catch (error) {
    console.error('Error listing backups:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar backups' },
      { status: 500 }
    )
  }
}

// POST - Create new backup
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const description = body.description || null

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
      select: { id: true, name: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Create backup
    const backup = await createFullBackup(user.id, user.name, description)
    
    // Save to storage
    await saveBackup(backup)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'BACKUP_CREATED',
        entity: 'System',
        entityId: backup.metadata.id,
        metadata: {
          backupId: backup.metadata.id,
          size: backup.metadata.size,
          recordCounts: backup.metadata.recordCounts,
        },
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        ...backup.metadata,
        sizeFormatted: formatBytes(backup.metadata.size),
        totalRecords: (Object.values(backup.metadata.recordCounts) as number[]).reduce((a, b) => a + b, 0),
      },
      message: 'Backup criado com sucesso!'
    })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar backup' },
      { status: 500 }
    )
  }
}
