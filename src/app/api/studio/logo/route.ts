// ============================================================================
// EXPERT TRAINING - STUDIO LOGO UPLOAD API
// ============================================================================
// POST: Upload da logo do studio
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// POST /api/studio/logo - Upload de logo
export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth()
    if ('error' in payload) {
      return NextResponse.json({ success: false, error: payload.error }, { status: payload.status })
    }

    const studioId = payload.studioId

    // Verificar se é STUDIO_ADMIN
    const userStudio = await prisma.userStudio.findFirst({
      where: {
        userId: payload.userId,
        studioId: studioId,
      },
    })

    if (!userStudio || userStudio.role !== 'STUDIO_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Apenas STUDIO_ADMIN pode fazer upload de logo' },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Arquivo deve ser uma imagem' },
        { status: 400 }
      )
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Arquivo deve ter no máximo 2MB' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'studios')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Gerar nome único para o arquivo
    const ext = file.name.split('.').pop()
    const fileName = `${studioId}-${Date.now()}.${ext}`
    const filePath = path.join(uploadsDir, fileName)

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Atualizar URL no banco
    const logoUrl = `/uploads/studios/${fileName}`
    await prisma.studio.update({
      where: { id: studioId },
      data: { logoUrl },
    })

    // Criar audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Studio',
        entityId: studioId,
        userId: payload.userId,
        studioId: studioId,
      },
    })

    return NextResponse.json({
      success: true,
      data: { logoUrl },
    })
  } catch (error) {
    console.error('Error uploading logo:', error)
    return NextResponse.json({ success: false, error: 'Erro ao fazer upload da logo' }, { status: 500 })
  }
}
