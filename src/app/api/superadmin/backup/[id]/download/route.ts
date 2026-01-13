// ============================================================================
// EXPERT TRAINING - BACKUP DOWNLOAD API
// ============================================================================
// GET /api/superadmin/backup/[id]/download - Download backup as JSON
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { getBackupFileContent } from '@/lib/backup/storage'
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

// GET - Download backup file
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
    const content = await getBackupFileContent(backupId)
    
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Backup não encontrado' },
        { status: 404 }
      )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'BACKUP_DOWNLOADED',
        entity: 'System',
        entityId: backupId,
        metadata: { backupId },
      }
    })

    // Return as downloadable JSON file
    const filename = `${backupId}.json`
    
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(content, 'utf8').toString(),
      },
    })
  } catch (error) {
    console.error('Error downloading backup:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao baixar backup' },
      { status: 500 }
    )
  }
}
