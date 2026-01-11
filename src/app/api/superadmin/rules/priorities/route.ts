import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request) {
  try {
    const { priorities } = await request.json()

    if (!priorities || !Array.isArray(priorities)) {
      return NextResponse.json(
        { error: 'Priorities array is required' },
        { status: 400 }
      )
    }

    // Update priorities in a transaction
    await prisma.$transaction(
      priorities.map(({ id, priority }) =>
        prisma.rule.update({
          where: { id },
          data: { priority }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating priorities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}