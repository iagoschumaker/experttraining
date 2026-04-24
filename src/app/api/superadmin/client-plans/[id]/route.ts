// ============================================================================
// SUPERADMIN CLIENT PLAN BY ID — PUT (toggle active, edit)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getAccessTokenCookie()
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload?.isSuperAdmin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.price !== undefined) updateData.price = parseFloat(body.price)
    if (body.billingCycle !== undefined) updateData.billingCycle = body.billingCycle
    if (body.durationDays !== undefined) updateData.durationDays = parseInt(body.durationDays)
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.isTrial !== undefined) updateData.isTrial = body.isTrial
    if (body.trialDays !== undefined) updateData.trialDays = body.trialDays
    if (body.features !== undefined) updateData.features = body.features

    const plan = await prisma.clientPlan.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: { ...plan, price: parseFloat(plan.price.toString()) },
    })
  } catch (error) {
    console.error('Update client plan error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}
