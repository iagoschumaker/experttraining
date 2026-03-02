// ============================================================================
// EXPERT TRAINING - CLIENT DETAIL API
// ============================================================================
// GET    /api/studio/clients/[id] - Detalhes do cliente
// PUT    /api/studio/clients/[id] - Atualizar cliente
// DELETE /api/studio/clients/[id] - Inativar cliente
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'
import { computePollock, ageFromBirthDate } from '@/services/pollock'
import type { SkinfoldsInput } from '@/services/pollock'

function normalizeGender(value: string): 'M' | 'F' | 'O' {
  switch (value) {
    case 'M':
    case 'MALE':
    case 'male':
      return 'M'
    case 'F':
    case 'FEMALE':
    case 'female':
      return 'F'
    case 'O':
    case 'OTHER':
    case 'other':
      return 'O'
    default:
      return 'O'
  }
}

function parseBirthDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return null

  const input = value.trim()
  if (!input) return null

  // YYYY-MM-DD
  const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/
  if (isoDateOnly.test(input)) {
    const [y, m, d] = input.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // DD/MM/YYYY
  const brDate = /^\d{2}\/\d{2}\/\d{4}$/
  if (brDate.test(input)) {
    const [d, m, y] = input.split('/').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // ISO datetime or other Date-parseable strings (defensive)
  const dt = new Date(input)
  return Number.isNaN(dt.getTime()) ? null : dt
}

// ============================================================================
// GET - Client Details
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const clientId = params.id

  try {
    // Build where clause
    const where: any = { id: clientId, studioId }

    // TRAINER só vê seus clientes
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const client = await prisma.client.findFirst({
      where,
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            confidence: true,
            bodyMetricsJson: true,
          },
        },
        workouts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
            sessionsCompleted: true,
            sessionsPerWeek: true,
            targetWeeks: true,
            startDate: true,
          },
        },
        _count: {
          select: {
            assessments: true,
            workouts: true,
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

    // Get trainer info
    let trainer = null
    if (client.trainerId) {
      trainer = await prisma.user.findUnique({
        where: { id: client.trainerId },
        select: { id: true, name: true, email: true },
      })
    }

    // Get attendance stats for active workout
    const activeWorkout = client.workouts.find((w: any) => w.isActive)
    let attendanceStats = null
    if (activeWorkout) {
      const totalLessons = await prisma.lesson.count({
        where: { workoutId: activeWorkout.id, status: 'COMPLETED' },
      })
      const sessionsPerWeek = (activeWorkout as any).sessionsPerWeek || 3
      const targetWeeks = (activeWorkout as any).targetWeeks || 8
      const totalExpected = sessionsPerWeek * targetWeeks
      const sessionsCompleted = (activeWorkout as any).sessionsCompleted || totalLessons

      attendanceStats = {
        workoutId: activeWorkout.id,
        workoutName: activeWorkout.name,
        sessionsCompleted,
        sessionsPerWeek,
        targetWeeks,
        totalExpected,
        remaining: Math.max(0, totalExpected - sessionsCompleted),
        attendanceRate: totalExpected > 0 ? sessionsCompleted / totalExpected : 0,
        lessonsCount: totalLessons,
      }
    }

    // Get check-in history (all completed lessons for this client)
    const workoutIds = client.workouts.map((w: any) => w.id)
    const checkInHistory = workoutIds.length > 0
      ? await prisma.lesson.findMany({
        where: {
          workoutId: { in: workoutIds },
          status: 'COMPLETED',
        },
        orderBy: { date: 'desc' },
        take: 50,
        select: {
          id: true,
          date: true,
          startedAt: true,
          endedAt: true,
          focus: true,
          weekIndex: true,
          dayIndex: true,
          duration: true,
          workoutId: true,
        },
      })
      : []

    return NextResponse.json({
      success: true,
      data: { ...client, trainer, attendanceStats, checkInHistory },
    })
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Update Client
// ============================================================================
const updateClientSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.union([
    z.string().email('Email inválido'),
    z.literal(''),
    z.null(),
    z.undefined()
  ]).optional().nullable().transform(val => val === '' ? null : val),
  phone: z.string().optional().nullable(),
  birthDate: z.union([z.string(), z.literal(''), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform((val, ctx) => {
      const parsed = parseBirthDate(val)
      if (val && val !== '' && parsed === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data de nascimento inválida' })
      }
      return parsed
    }),
  gender: z.union([
    z.enum(['M', 'F', 'O', 'MALE', 'FEMALE', 'OTHER', 'male', 'female', 'other']),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return null
      return normalizeGender(val)
    }),
  height: z.number().positive().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  history: z.string().optional().nullable(),
  objectives: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  trainerId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  chest: z.number().positive().optional().nullable(),
  waist: z.number().positive().optional().nullable(),
  hip: z.number().positive().optional().nullable(),
  arm: z.number().positive().optional().nullable(),
  thigh: z.number().positive().optional().nullable(),
  calf: z.number().positive().optional().nullable(),
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
  sfChest: z.number().positive().optional().nullable(),
  sfAbdomen: z.number().positive().optional().nullable(),
  sfThigh: z.number().positive().optional().nullable(),
  sfTriceps: z.number().positive().optional().nullable(),
  sfSuprailiac: z.number().positive().optional().nullable(),
  sfSubscapular: z.number().positive().optional().nullable(),
  sfMidaxillary: z.number().positive().optional().nullable(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const clientId = params.id

  try {
    // Verify client exists and belongs to studio
    const where: any = { id: clientId, studioId }
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const existingClient = await prisma.client.findFirst({ where })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Validate body
    const body = await request.json()
    const validation = updateClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'input inválido',
          issues: validation.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // TRAINER não pode mudar o treinador responsável
    if (role === 'TRAINER' && data.trainerId && data.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Você não pode atribuir o cliente a outro treinador' },
        { status: 403 }
      )
    }

    // Check email uniqueness
    if (data.email && data.email !== existingClient.email) {
      const emailExists = await prisma.client.findFirst({
        where: {
          studioId,
          email: data.email,
          id: { not: clientId },
          isActive: true,
        },
      })

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email já cadastrado neste studio' },
          { status: 400 }
        )
      }
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate ?? undefined,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        history: data.history,
        objectives: data.objectives,
        notes: data.notes,
        goal: data.goal,
        trainerId: data.trainerId,
        status: data.status,
        chest: data.chest,
        waist: data.waist,
        hip: data.hip,
        arm: data.arm,
        thigh: data.thigh,
        calf: data.calf,
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
        sfChest: data.sfChest,
        sfAbdomen: data.sfAbdomen,
        sfThigh: data.sfThigh,
        sfTriceps: data.sfTriceps,
        sfSuprailiac: data.sfSuprailiac,
        sfSubscapular: data.sfSubscapular,
        sfMidaxillary: data.sfMidaxillary,
      },
    })

    // Server-side Pollock computation — always runs after saving
    const uc = updatedClient as any
    const savedGender = uc.gender
    const savedBirthDate = uc.birthDate
    const savedWeight = uc.weight ? Number(uc.weight) : null

    if (savedWeight && savedBirthDate && (savedGender === 'M' || savedGender === 'F')) {
      const sfInput: SkinfoldsInput = {
        chest: uc.sfChest ? Number(uc.sfChest) : undefined,
        abdomen: uc.sfAbdomen ? Number(uc.sfAbdomen) : undefined,
        thigh: uc.sfThigh ? Number(uc.sfThigh) : undefined,
        triceps: uc.sfTriceps ? Number(uc.sfTriceps) : undefined,
        suprailiac: uc.sfSuprailiac ? Number(uc.sfSuprailiac) : undefined,
        subscapular: uc.sfSubscapular ? Number(uc.sfSubscapular) : undefined,
        midaxillary: uc.sfMidaxillary ? Number(uc.sfMidaxillary) : undefined,
      }
      const age = ageFromBirthDate(savedBirthDate)
      const pollockResult = computePollock(sfInput, age, savedWeight, savedGender)
      if (pollockResult) {
        await prisma.client.update({
          where: { id: clientId },
          data: { bodyFat: pollockResult.bodyFatPercent },
        })
          ; (updatedClient as any).bodyFat = pollockResult.bodyFatPercent
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'UPDATE',
        entity: 'Client',
        entityId: clientId,
        oldData: { name: existingClient.name, status: existingClient.status },
        newData: { name: updatedClient.name, status: updatedClient.status },
      },
    })

    // Auto-create bodyMetricsJson snapshot when body data changes
    const bodyFields = ['weight', 'height', 'chest', 'waist', 'hip', 'arm', 'thigh', 'calf'] as const
    const hasBodyChange = bodyFields.some(f => body[f] !== undefined && body[f] !== null)

    if (hasBodyChange) {
      // Build snapshot from updated client (cast to any since TS types may be stale)
      const c = updatedClient as any
      const snapshot: Record<string, number> = {}
      if (c.weight) snapshot.weight = Number(c.weight)
      if (c.height) snapshot.height = Number(c.height)
      if (c.bodyFat) snapshot.bodyFat = Number(c.bodyFat)
      if (c.chest) snapshot.chest = Number(c.chest)
      if (c.waist) snapshot.waist = Number(c.waist)
      if (c.hip) snapshot.hip = Number(c.hip)
      if (c.abdomen) snapshot.abdomen = Number(c.abdomen)
      if (c.armRight) snapshot.arm_right = Number(c.armRight)
      if (c.armLeft) snapshot.arm_left = Number(c.armLeft)
      if (c.thighRight) snapshot.thigh_right = Number(c.thighRight)
      if (c.thighLeft) snapshot.thigh_left = Number(c.thighLeft)
      if (c.calfRight) snapshot.calf_right = Number(c.calfRight)
      if (c.calfLeft) snapshot.calf_left = Number(c.calfLeft)
      if (c.sfChest) snapshot.sf_chest = Number(c.sfChest)
      if (c.sfAbdomen) snapshot.sf_abdomen = Number(c.sfAbdomen)
      if (c.sfThigh) snapshot.sf_thigh = Number(c.sfThigh)
      if (c.sfTriceps) snapshot.sf_triceps = Number(c.sfTriceps)
      if (c.sfSuprailiac) snapshot.sf_suprailiac = Number(c.sfSuprailiac)
      if (c.sfSubscapular) snapshot.sf_subscapular = Number(c.sfSubscapular)
      if (c.sfMidaxillary) snapshot.sf_midaxillary = Number(c.sfMidaxillary)

      if (Object.keys(snapshot).length > 0) {
        // Upsert: update today's assessment if exists, else create new
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        const existingToday = await prisma.assessment.findFirst({
          where: {
            clientId,
            createdAt: { gte: todayStart, lte: todayEnd },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (existingToday) {
          await prisma.assessment.update({
            where: { id: existingToday.id },
            data: {
              bodyMetricsJson: snapshot,
              completedAt: new Date(),
            },
          })
        } else {
          await prisma.assessment.create({
            data: {
              clientId,
              assessorId: userId,
              status: 'COMPLETED',
              inputJson: {},
              completedAt: new Date(),
              bodyMetricsJson: snapshot,
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Cliente atualizado com sucesso',
    })
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar cliente' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Hard Delete Client (exclusão permanente)
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const clientId = params.id

  try {
    // Verify client exists and belongs to studio
    const where: any = { id: clientId, studioId }
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const client = await prisma.client.findFirst({ where })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Audit log (criar ANTES de excluir)
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'DELETE',
        entity: 'Client',
        entityId: clientId,
        oldData: { name: client.name, status: client.status },
      },
    })

    // Hard delete — remover tudo relacionado ao cliente
    // 1. Remover vínculos aula-aluno
    await prisma.lessonClient.deleteMany({
      where: { clientId },
    })

    // 2. Buscar treinos do cliente
    const workouts = await prisma.workout.findMany({
      where: { clientId },
      select: { id: true },
    })
    const workoutIds = workouts.map((w: any) => w.id)

    // 3. Remover aulas dos treinos
    if (workoutIds.length > 0) {
      await prisma.lesson.deleteMany({
        where: { workoutId: { in: workoutIds } },
      })
    }

    // 4. Remover treinos
    await prisma.workout.deleteMany({
      where: { clientId },
    })

    // 5. Remover avaliações
    await prisma.assessment.deleteMany({
      where: { clientId },
    })

    // 6. Remover o cliente
    await prisma.client.delete({
      where: { id: clientId },
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente excluído permanentemente',
    })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir cliente' },
      { status: 500 }
    )
  }
}
