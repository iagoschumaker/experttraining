// ============================================================================
// EXPERT PRO TRAINING - ÁREA DO ALUNO - AUTENTICAÇÃO
// ============================================================================
// POST /api/areaaluno/auth - Autenticação por e-mail/celular + data de nascimento
// DELETE /api/areaaluno/auth - Logout
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { SignJWT } from 'jose'

const authSchema = z.object({
  // Aceita e-mail ou celular (apenas dígitos internamente)
  identifier: z.string().min(3, 'Informe e-mail ou celular'),
  // Data de nascimento no formato YYYY-MM-DD
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida'),
})

// Secret para JWT do aluno (separado do sistema principal)
const ALUNO_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET + '_ALUNO'
)

/**
 * Verifica se dois DateTime/Date têm o mesmo dia no calendário (ignorando horas).
 * birthDate no banco é @db.Date → armazenado como UTC midnight.
 * birthDate enviado pelo aluno é YYYY-MM-DD.
 */
function sameBirthDay(storedDate: Date | null, inputDate: string): boolean {
  if (!storedDate) return false
  const stored = new Date(storedDate)
  // Comparar por ISO string de data (YYYY-MM-DD) via UTC
  const storedStr = stored.toISOString().slice(0, 10)
  return storedStr === inputDate
}

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

    const { identifier, birthDate } = validation.data

    // ── Normalizar identificador ───────────────────────────────────────────
    const isEmail = identifier.includes('@')
    const normalizedDigits = identifier.replace(/\D/g, '')

    // ── Buscar clientes (sem filtro de isActive — alunos inativos podem logar) ─
    const clients = await prisma.client.findMany({
      where: isEmail
        ? { email: { equals: identifier.trim().toLowerCase(), mode: 'insensitive' } }
        : { phone: { contains: normalizedDigits } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        isActive: true,
        studioId: true,
        studio: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      take: 20,
    })

    if (clients.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: isEmail
            ? 'E-mail não encontrado. Verifique o endereço informado.'
            : 'Celular não encontrado. Verifique o número informado.',
        },
        { status: 404 }
      )
    }

    // ── Validar data de nascimento como segundo fator ─────────────────────
    const matched = clients.filter(c => sameBirthDay(c.birthDate, birthDate))

    if (matched.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data de nascimento não confere. Verifique os dados informados.',
        },
        { status: 401 }
      )
    }

    // Usar o primeiro match (se houver mais de um com mesma identidade + data nascimento,
    // pega o mais recente pelo studioId — situação muito rara)
    const client = matched[0]

    // ── Gerar token JWT para o aluno (válido por 7 dias) ─────────────────
    const token = await new SignJWT({
      clientId: client.id,
      studioId: client.studioId,
      name: client.name,
      type: 'ALUNO_SESSION',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(ALUNO_JWT_SECRET)

    // ── Criar resposta com cookie ─────────────────────────────────────────
    const response = NextResponse.json({
      success: true,
      data: {
        name: client.name,
        studio: client.studio,
      },
    })

    response.cookies.set('aluno_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
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
export async function DELETE(_request: NextRequest) {
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
