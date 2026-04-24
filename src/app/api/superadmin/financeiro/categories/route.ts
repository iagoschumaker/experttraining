// ============================================================================
// SUPERADMIN FINANCIAL CATEGORIES API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { seedDefaultCategories } from '@/services/financialCategories'

const SUPERADMIN_STUDIO_ID = '_SUPERADMIN_'

export async function GET(request: NextRequest) {
  const token = await getAccessTokenCookie()
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload?.isSuperAdmin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    let categories = await prisma.financialCategory.findMany({
      where: { studioId: SUPERADMIN_STUDIO_ID, isActive: true },
      orderBy: { code: 'asc' },
    })

    if (categories.length === 0) {
      await seedDefaultCategories(SUPERADMIN_STUDIO_ID)
      categories = await prisma.financialCategory.findMany({
        where: { studioId: SUPERADMIN_STUDIO_ID, isActive: true },
        orderBy: { code: 'asc' },
      })
    }

    const rootCategories = categories.filter(c => !c.parentId)
    const buildTree = (parent: typeof categories[0]): any => ({
      ...parent,
      children: categories.filter(c => c.parentId === parent.id).map(buildTree),
    })

    return NextResponse.json({
      success: true,
      data: { categories: rootCategories.map(buildTree), flat: categories },
    })
  } catch (error) {
    console.error('SA categories error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}
