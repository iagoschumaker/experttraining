// ============================================================================
// EXPERT PRO TRAINING — FINANCIAL CATEGORIES API
// ============================================================================
// GET  /api/studio/financeiro/categories — Listar categorias (árvore)
// POST /api/studio/financeiro/categories — Criar categoria customizada
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { seedDefaultCategories } from '@/services/financialCategories'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    // Buscar categorias do studio (pode incluir as do sistema)
    let categories = await prisma.financialCategory.findMany({
      where: {
        OR: [
          { studioId },
          { studioId: null, isSystem: true },
        ],
        isActive: true,
      },
      orderBy: { code: 'asc' },
    })

    // Se não há categorias para este studio, fazer seed automático
    if (categories.filter(c => c.studioId === studioId).length === 0) {
      await seedDefaultCategories(studioId)
      categories = await prisma.financialCategory.findMany({
        where: { studioId, isActive: true },
        orderBy: { code: 'asc' },
      })
    }

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

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    const body = await request.json()
    const { code, name, type, parentId } = body

    if (!code || !name || !type) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: code, name, type' },
        { status: 400 }
      )
    }

    // Verificar duplicidade de código
    const existing = await prisma.financialCategory.findUnique({
      where: { studioId_code: { studioId, code } },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Código '${code}' já existe` },
        { status: 409 }
      )
    }

    const category = await prisma.financialCategory.create({
      data: {
        studioId,
        parentId: parentId || null,
        code,
        name,
        type,
        isSystem: false,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar categoria' },
      { status: 500 }
    )
  }
}
