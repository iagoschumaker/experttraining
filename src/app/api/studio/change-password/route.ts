// ============================================================================
// EXPERT TRAINING - USER CHANGE PASSWORD API
// ============================================================================
// POST: Alterar senha do usuário logado
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import bcrypt from 'bcryptjs'

// POST /api/studio/change-password - Alterar senha do usuário logado
export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth()
    if ('error' in payload) {
      return NextResponse.json({ success: false, error: payload.error }, { status: payload.status })
    }

    const userId = payload.userId
    const studioId = payload.studioId

    // Verificar se é STUDIO_ADMIN
    const userStudio = await prisma.userStudio.findFirst({
      where: {
        userId: userId,
        studioId: studioId,
      },
    })

    if (!userStudio || userStudio.role !== 'STUDIO_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Apenas STUDIO_ADMIN pode alterar a senha' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { currentPassword, newPassword } = body

    // Validar dados
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar usuário com senha
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar senha atual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Senha atual incorreta' },
        { status: 401 }
      )
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Atualizar senha
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    })

    // Criar audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        userId: userId,
        studioId: studioId,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao alterar senha' },
      { status: 500 }
    )
  }
}
