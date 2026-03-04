// ============================================================================
// EXPERT TRAINING - ALUNO BY ID API
// ============================================================================
// GET /api/clients/[id] - Get aluno details
// PUT /api/clients/[id] - Update aluno
// DELETE /api/clients/[id] - Soft delete aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'
import { computePollock, ageFromBirthDate } from '@/services/pollock'
import type { SkinfoldsInput } from '@/services/pollock'

// Validation schema for updating a client
const updateClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(['M', 'F', 'O']).optional().nullable(),
  height: z.number().positive().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  history: z.string().optional().nullable(),
  objectives: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  trainerId: z.string().optional().nullable(),
  // Body measurements
  chest: z.number().positive().optional().nullable(),
  waist: z.number().positive().optional().nullable(),
  hip: z.number().positive().optional().nullable(),
  arm: z.number().positive().optional().nullable(),
  thigh: z.number().positive().optional().nullable(),
  calf: z.number().positive().optional().nullable(),
  // Extended body measurements
  bodyFat: z.number().min(0).max(100).optional().nullable(),
  abdomen: z.number().positive().optional().nullable(),
  armRight: z.number().positive().optional().nullable(),
  armLeft: z.number().positive().optional().nullable(),
  forearmRight: z.number().positive().optional().nullable(),
  forearmLeft: z.number().positive().optional().nullable(),
  thighRight: z.number().positive().optional().nullable(),
  thighLeft: z.number().positive().optional().nullable(),
  calfRight: z.number().positive().optional().nullable(),
  calfLeft: z.number().positive().optional().nullable(),
  // Skinfolds (mm)
  sfChest: z.number().positive().optional().nullable(),
  sfAbdomen: z.number().positive().optional().nullable(),
  sfThigh: z.number().positive().optional().nullable(),
  sfTriceps: z.number().positive().optional().nullable(),
  sfSuprailiac: z.number().positive().optional().nullable(),
  sfSubscapular: z.number().positive().optional().nullable(),
  sfMidaxillary: z.number().positive().optional().nullable(),
})

// GET - Get aluno by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = await getAccessTokenCookie()

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const payload = verifyAccessToken(accessToken)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // SuperAdmin can access any client, others need studio context
    const isSuperAdmin = payload.isSuperAdmin
    if (!isSuperAdmin && !hasStudioContext(payload)) {
      return NextResponse.json(
        { success: false, error: 'Contexto de studio não encontrado' },
        { status: 401 }
      )
    }

    const whereClause: any = { id: params.id }
    if (!isSuperAdmin && hasStudioContext(payload)) {
      whereClause.studioId = payload.studioId
    }

    const client = await prisma.client.findFirst({
      where: whereClause,
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            confidence: true,
            createdAt: true,
            completedAt: true,
            bodyMetricsJson: true,
          },
        },
        workouts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // All trainers in the studio can view any client details
    // (editing is restricted to the assigned trainer or admin)

    // ---- Compute attendance stats from active workout + lessons ----
    let attendanceStats: any = null
    let checkInHistory: any[] = []

    // Find active workout for this client
    const activeWorkout = await prisma.workout.findFirst({
      where: { clientId: client.id, isActive: true },
      select: {
        id: true,
        name: true,
        sessionsPerWeek: true,
        targetWeeks: true,
        sessionsCompleted: true,
        createdAt: true,
      },
    })

    if (activeWorkout) {
      const totalExpected = (activeWorkout.sessionsPerWeek || 3) * (activeWorkout.targetWeeks || 8)
      const completed = activeWorkout.sessionsCompleted || 0

      // Compute expected sessions by now
      const weeksSinceStart = Math.max(1, Math.ceil(
        (Date.now() - new Date(activeWorkout.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)
      ))
      const expectedByNow = Math.min(totalExpected, weeksSinceStart * (activeWorkout.sessionsPerWeek || 3))
      const rate = expectedByNow > 0 ? completed / expectedByNow : completed > 0 ? 1 : 0

      attendanceStats = {
        workoutId: activeWorkout.id,
        workoutName: activeWorkout.name,
        sessionsCompleted: completed,
        totalExpected,
        remaining: Math.max(0, totalExpected - completed),
        sessionsPerWeek: activeWorkout.sessionsPerWeek || 3,
        targetWeeks: activeWorkout.targetWeeks || 8,
        attendanceRate: Math.min(1, rate),
        attendanceStatus: rate >= 0.85 ? 'ON_TRACK' : rate >= 0.60 ? 'BELOW_TARGET' : 'CRITICAL',
      }

      // Load check-in history (lessons for this client's workouts)
      const lessons = await prisma.lesson.findMany({
        where: { workoutId: activeWorkout.id },
        orderBy: { date: 'desc' },
        take: 30,
        select: {
          id: true,
          date: true,
          startedAt: true,
          endedAt: true,
          focus: true,
          sessionIndex: true,
          weekIndex: true,
        },
      })
      checkInHistory = lessons
    }

    return NextResponse.json({
      success: true,
      data: { ...client, attendanceStats, checkInHistory },
    })
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = await getAccessTokenCookie()

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const payload = verifyAccessToken(accessToken)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // SuperAdmin can access any client, others need studio context
    const isSuperAdmin = payload.isSuperAdmin
    if (!isSuperAdmin && !hasStudioContext(payload)) {
      return NextResponse.json(
        { success: false, error: 'Contexto de studio não encontrado' },
        { status: 401 }
      )
    }

    // Check if client exists
    const whereClause: any = { id: params.id }
    if (!isSuperAdmin && hasStudioContext(payload)) {
      whereClause.studioId = payload.studioId
    }

    const existingClient = await prisma.client.findFirst({
      where: whereClause,
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Check access for trainers - only assigned trainer or admin can edit
    // SuperAdmin can edit any client
    if (!isSuperAdmin && hasStudioContext(payload) && payload.role === 'TRAINER' && existingClient.trainerId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Apenas o trainer responsável pode editar este aluno' },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validation = updateClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Update client
    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        history: data.history,
        objectives: data.objectives,
        notes: data.notes,
        goal: data.goal,
        trainerId: data.trainerId,
        // Body measurements
        chest: data.chest,
        waist: data.waist,
        hip: data.hip,
        arm: data.armRight ?? data.arm,
        thigh: data.thighRight ?? data.thigh,
        calf: data.calfRight ?? data.calf,
        // Extended measurements
        bodyFat: data.bodyFat,
        abdomen: data.abdomen,
        armRight: data.armRight,
        armLeft: data.armLeft,
        forearmRight: data.forearmRight,
        forearmLeft: data.forearmLeft,
        thighRight: data.thighRight,
        thighLeft: data.thighLeft,
        calfRight: data.calfRight,
        calfLeft: data.calfLeft,
        // Skinfolds
        sfChest: data.sfChest,
        sfAbdomen: data.sfAbdomen,
        sfThigh: data.sfThigh,
        sfTriceps: data.sfTriceps,
        sfSuprailiac: data.sfSuprailiac,
        sfSubscapular: data.sfSubscapular,
        sfMidaxillary: data.sfMidaxillary,
      },
    })

    // Server-side Pollock computation — uses the updated client data
    const c = client as any
    const pollockGender = c.gender
    const pollockBirthDate = c.birthDate
    const pollockWeight = c.weight ? Number(c.weight) : null

    console.log('[POLLOCK DEBUG] gender:', pollockGender, 'birthDate:', pollockBirthDate, 'weight:', pollockWeight)
    console.log('[POLLOCK DEBUG] sfTriceps:', c.sfTriceps?.toString(), 'sfSuprailiac:', c.sfSuprailiac?.toString(), 'sfThigh:', c.sfThigh?.toString())
    console.log('[POLLOCK DEBUG] sfChest:', c.sfChest?.toString(), 'sfAbdomen:', c.sfAbdomen?.toString())

    if (pollockWeight && pollockBirthDate && (pollockGender === 'M' || pollockGender === 'F')) {
      const sfInput: SkinfoldsInput = {
        chest: c.sfChest ? Number(c.sfChest) : undefined,
        abdomen: c.sfAbdomen ? Number(c.sfAbdomen) : undefined,
        thigh: c.sfThigh ? Number(c.sfThigh) : undefined,
        triceps: c.sfTriceps ? Number(c.sfTriceps) : undefined,
        suprailiac: c.sfSuprailiac ? Number(c.sfSuprailiac) : undefined,
        subscapular: c.sfSubscapular ? Number(c.sfSubscapular) : undefined,
        midaxillary: c.sfMidaxillary ? Number(c.sfMidaxillary) : undefined,
      }
      const age = ageFromBirthDate(pollockBirthDate)
      console.log('[POLLOCK DEBUG] age:', age, 'sfInput:', JSON.stringify(sfInput))
      const pollockResult = computePollock(sfInput, age, pollockWeight, pollockGender)
      console.log('[POLLOCK DEBUG] result:', JSON.stringify(pollockResult))
      if (pollockResult) {
        // Update bodyFat with Pollock result
        await prisma.client.update({
          where: { id: params.id },
          data: { bodyFat: pollockResult.bodyFatPercent },
        })
          ; (client as any).bodyFat = pollockResult.bodyFatPercent
        console.log('[POLLOCK DEBUG] bodyFat saved:', pollockResult.bodyFatPercent)
      }
    } else {
      console.log('[POLLOCK DEBUG] SKIPPED - missing data. weight:', pollockWeight, 'birthDate:', pollockBirthDate, 'gender:', pollockGender)
    }

    // NOTE: Body metrics snapshots are only created via the assessment flow.
    // Editing client data does NOT auto-create assessments (one-way: assessment → client).

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: hasStudioContext(payload) ? payload.studioId : null,
        action: 'UPDATE',
        entity: 'Client',
        entityId: client.id,
        oldData: existingClient as any,
        newData: client as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: client,
    })
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = await getAccessTokenCookie()

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const payload = verifyAccessToken(accessToken)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // SuperAdmin can delete any client, others need studio context
    const isSuperAdmin = payload.isSuperAdmin
    if (!isSuperAdmin && !hasStudioContext(payload)) {
      return NextResponse.json(
        { success: false, error: 'Contexto de studio não encontrado' },
        { status: 401 }
      )
    }

    // Only studio admins and superadmins can delete clients (trainers cannot delete)
    if (!isSuperAdmin && hasStudioContext(payload) && payload.role !== 'STUDIO_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores do studio podem excluir alunos' },
        { status: 403 }
      )
    }

    // Check if client exists
    const whereClause: any = { id: params.id }
    if (!isSuperAdmin && hasStudioContext(payload)) {
      whereClause.studioId = payload.studioId
    }

    const existingClient = await prisma.client.findFirst({
      where: whereClause,
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Soft delete
    await prisma.client.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: (payload as any).studioId,
        action: 'DELETE',
        entity: 'Client',
        entityId: params.id,
        oldData: existingClient as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Cliente excluído com sucesso' },
    })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
