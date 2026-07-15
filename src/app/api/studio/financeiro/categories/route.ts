// ============================================================================
// KINEX PERFORMANCE — FINANCIAL CATEGORIES API (STUDIO — SOMENTE LEITURA)
// ============================================================================
// GET /api/studio/financeiro/categories — Retorna categorias disponíveis
// Retorna: categorias globais (studioId = null) OU do próprio studio.
// Somente o superadmin pode criar/editar/excluir categorias.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // RECEITA | CUSTO | DESPESA | null (todos)

  try {
    // Buscar categorias globais (studioId = null) OU do próprio studio.
    // Isso cobre dois cenários:
    // 1. Categorias verdadeiramente globais criadas pelo superadmin (studioId = null)
    // 2. Categorias criadas pelo superadmin vinculadas a este studio específico
    const typeFilter = type ? { type: type as any } : {}

    const categories = await prisma.financialCategory.findMany({
      where: {
        OR: [
          { studioId: null },
          { studioId: studioId },
        ],
        isActive: true,
        ...typeFilter,
      },
      orderBy: { code: 'asc' },
    })

    // Montar árvore hierárquica
    const rootCategories = categories.filter(c => !c.parentId)
    const buildTree = (parent: typeof categories[0]): any => ({
      ...parent,
      children: categories
        .filter(c => c.parentId === parent.id)
        .map(buildTree),
    })

    const tree = rootCategories.map(buildTree)

    return NextResponse.json({
      success: true,
      data: { categories: tree, flat: categories },
    })
  } catch (error) {
    console.error('Financial categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar categorias' },
      { status: 500 }
    )
  }
}
