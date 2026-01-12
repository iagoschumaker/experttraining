
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Middleware to check superadmin matches existing pattern
async function verifySuperAdmin() {
  const accessToken = await getAccessTokenCookie()
  if (!accessToken) return { error: 'Não autenticado', status: 401 }
  const payload = verifyAccessToken(accessToken)
  if (!payload || !payload.isSuperAdmin) return { error: 'Acesso negado', status: 403 }
  return { payload }
}

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const studioId = searchParams.get('studioId')

    const where: any = {}
    
    // Search by name or email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    // Filter by studio
    if (studioId) {
      where.studioId = studioId
    }

    const total = await prisma.client.count({ where })

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        studio: {
          select: {
            id: true,
            name: true
          }
        },
        trainer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        items: clients,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    })

  } catch (error) {
    console.error('Error listing clients:', error)
    return NextResponse.json({ success: false, error: 'Erro ao listar alunos' }, { status: 500 })
  }
}
