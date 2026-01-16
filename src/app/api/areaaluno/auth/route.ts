// ============================================================================
// EXPERT TRAINING - ÁREA DO ALUNO - AUTENTICAÇÃO
// ============================================================================
// POST /api/areaaluno/auth - Autenticação por celular
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { SignJWT } from 'jose'

const authSchema = z.object({
  phone: z.string().min(8, 'Celular inválido'),
  name: z.string().optional(), // Para confirmação quando múltiplos resultados
})

// Secret para JWT do aluno (separado do sistema principal)
const ALUNO_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET + '_ALUNO'
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = authSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { phone, name } = validation.data

    // Normalizar telefone (remover caracteres especiais)
    const normalizedPhone = phone.replace(/\D/g, '')

    // Buscar cliente ativo pelo celular
    const whereClause: any = {
      isActive: true,
      phone: {
        contains: normalizedPhone,
      },
    }

    // Se nome fornecido, filtrar também por nome
    if (name) {
      whereClause.name = {
        contains: name,
        mode: 'insensitive',
      }
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        studioId: true,
        studio: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      take: 10, // Limitar resultados
    })

    // Nenhum cliente encontrado
    if (clients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Celular não encontrado. Verifique o número informado.' },
        { status: 404 }
      )
    }

    // Múltiplos clientes - pedir confirmação
    if (clients.length > 1 && !name) {
      return NextResponse.json({
        success: false,
        needsConfirmation: true,
        message: 'Múltiplos cadastros encontrados. Por favor, informe seu nome.',
        options: clients.map(c => ({
          id: c.id,
          name: c.name,
          studio: c.studio?.name,
        })),
      })
    }

    // Cliente único encontrado - criar sessão
    const client = clients[0]

    // Gerar token JWT para o aluno (válido por 24h)
    const token = await new SignJWT({
      clientId: client.id,
      studioId: client.studioId,
      name: client.name,
      type: 'ALUNO_SESSION',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(ALUNO_JWT_SECRET)

    // Criar resposta com cookie
    const response = NextResponse.json({
      success: true,
      data: {
        name: client.name,
        studio: client.studio,
      },
    })

    // Definir cookie httpOnly
    response.cookies.set('aluno_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erro na autenticação do aluno:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}

// DELETE - Logout do aluno
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  
  response.cookies.set('aluno_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
