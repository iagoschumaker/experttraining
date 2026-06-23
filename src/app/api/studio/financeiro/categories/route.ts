// ============================================================================
// KINEX PERFORMANCE — FINANCIAL CATEGORIES API (STUDIO — SOMENTE LEITURA)
// ============================================================================
// GET /api/studio/financeiro/categories — Retorna categorias GLOBAIS do sistema
// Studios não podem criar/editar/excluir categorias — apenas o superadmin pode.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // RECEITA | CUSTO | DESPESA | null (todos)

  try {
    const where: any = {
      studioId: null,
      isSystem: true,
      isActive: true,
    }
    if (type) where.type = type

    const categories = await prisma.financialCategory.findMany({
      where,
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
