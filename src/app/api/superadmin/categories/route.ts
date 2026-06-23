// ============================================================================
// KINEX PERFORMANCE — SUPERADMIN CATEGORIES API
// ============================================================================
// GET  /api/superadmin/categories — Listar categorias globais
// POST /api/superadmin/categories — Criar categoria global
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const categories = await prisma.financialCategory.findMany({
      where: { studioId: null, isSystem: true },
      orderBy: { code: 'asc' },
    })

    const rootCategories = categories.filter(c => !c.parentId)
    const buildTree = (parent: typeof categories[0]): any => ({
      ...parent,
      children: categories
        .filter(c => c.parentId === parent.id)
        .map(buildTree),
    })

    return NextResponse.json({
      success: true,
      data: { categories: rootCategories.map(buildTree), flat: categories },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { code, name, type, parentId } = await request.json()

    if (!code || !name || !type) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: code, name, type' },
        { status: 400 }
      )
    }

    // Verificar duplicidade de código global
    const existing = await prisma.financialCategory.findFirst({
      where: { code, studioId: null },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Código '${code}' já existe` },
        { status: 409 }
      )
    }

    const category = await prisma.financialCategory.create({
      data: {
        studioId: null,
        parentId: parentId || null,
        code,
        name,
        type,
        isSystem: true,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
