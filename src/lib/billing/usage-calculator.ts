// ============================================================================
// EXPERT PRO TRAINING - USAGE CALCULATOR SERVICE
// ============================================================================
// Calcula personals ativos baseado em ações reais no sistema
// Definição: Personal ativo = fez pelo menos UMA das ações:
//   - Iniciou aula (Lesson)
//   - Realizou avaliação (Assessment)
//   - Criou treino (Workout)
// ============================================================================

import prisma from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

interface TrainerActivity {
  trainerId: string
  trainerName: string
  trainerEmail: string
  lessonsStarted: number
  assessmentsCreated: number
  workoutsCreated: number
  isActive: boolean
  firstActivityAt: string | null
  lastActivityAt: string | null
}

interface UsageCalculation {
  studioId: string
  studioName: string
  periodStart: Date
  periodEnd: Date
  totalTrainers: number
  activeTrainers: number
  trainerActivity: Record<string, TrainerActivity>
  totalLessons: number
  totalAssessments: number
  totalWorkouts: number
  totalClients: number
  pricePerTrainer: number
  totalAmount: number
}

// ============================================================================
// FUNÇÃO PRINCIPAL: CALCULAR USO DO STUDIO
// ============================================================================
export async function calculateStudioUsage(
  studioId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<UsageCalculation> {
  
  // 1. Buscar o studio e seu plano
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    include: {
      plan: true,
      users: {
        where: { 
          role: 'TRAINER',
          isActive: true 
        },
        include: {
          user: true
        }
      }
    }
  })

  if (!studio) {
    throw new Error('Studio not found')
  }

  if (!studio.plan) {
    throw new Error('Studio does not have an active plan')
  }

  const pricePerTrainer = parseFloat(studio.plan.pricePerTrainer.toString())
  const totalTrainers = studio.users.length

  // 2. Buscar atividades no período
  const [lessons, assessments, workouts, clients] = await Promise.all([
    // Aulas iniciadas
    prisma.lesson.findMany({
      where: {
        studioId,
        startedAt: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        trainer: true
      }
    }),

    // Avaliações realizadas
    prisma.assessment.findMany({
      where: {
        client: { studioId },
        createdAt: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    }),

    // Treinos criados
    prisma.workout.findMany({
      where: {
        studioId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    }),

    // Total de clientes ativos
    prisma.client.count({
      where: {
        studioId,
        isActive: true
      }
    })
  ])

  // 3. Processar atividades por trainer
  const trainerActivity: Record<string, TrainerActivity> = {}

  // Inicializar todos os trainers com zero atividades
  for (const userStudio of studio.users) {
    trainerActivity[userStudio.userId] = {
      trainerId: userStudio.userId,
      trainerName: userStudio.user.name,
      trainerEmail: userStudio.user.email,
      lessonsStarted: 0,
      assessmentsCreated: 0,
      workoutsCreated: 0,
      isActive: false,
      firstActivityAt: null,
      lastActivityAt: null
    }
  }

  // Processar aulas
  for (const lesson of lessons) {
    const trainerId = lesson.trainerId
    if (trainerActivity[trainerId]) {
      trainerActivity[trainerId].lessonsStarted++
      trainerActivity[trainerId].isActive = true
      
      const activityDate = lesson.startedAt.toISOString()
      if (!trainerActivity[trainerId].firstActivityAt || activityDate < trainerActivity[trainerId].firstActivityAt!) {
        trainerActivity[trainerId].firstActivityAt = activityDate
      }
      if (!trainerActivity[trainerId].lastActivityAt || activityDate > trainerActivity[trainerId].lastActivityAt!) {
        trainerActivity[trainerId].lastActivityAt = activityDate
      }
    }
  }

  // Processar avaliações
  for (const assessment of assessments) {
    const trainerId = assessment.assessorId
    if (trainerId && trainerActivity[trainerId]) {
      trainerActivity[trainerId].assessmentsCreated++
      trainerActivity[trainerId].isActive = true
      
      const activityDate = assessment.createdAt.toISOString()
      if (!trainerActivity[trainerId].firstActivityAt || activityDate < trainerActivity[trainerId].firstActivityAt!) {
        trainerActivity[trainerId].firstActivityAt = activityDate
      }
      if (!trainerActivity[trainerId].lastActivityAt || activityDate > trainerActivity[trainerId].lastActivityAt!) {
        trainerActivity[trainerId].lastActivityAt = activityDate
      }
    }
  }

  // Processar treinos
  for (const workout of workouts) {
    const trainerId = workout.createdById
    if (trainerActivity[trainerId]) {
      trainerActivity[trainerId].workoutsCreated++
      trainerActivity[trainerId].isActive = true
      
      const activityDate = workout.createdAt.toISOString()
      if (!trainerActivity[trainerId].firstActivityAt || activityDate < trainerActivity[trainerId].firstActivityAt!) {
        trainerActivity[trainerId].firstActivityAt = activityDate
      }
      if (!trainerActivity[trainerId].lastActivityAt || activityDate > trainerActivity[trainerId].lastActivityAt!) {
        trainerActivity[trainerId].lastActivityAt = activityDate
      }
    }
  }

  // 4. Contar trainers ativos
  const activeTrainers = Object.values(trainerActivity).filter(t => t.isActive).length

  // 5. Calcular valor total
  const totalAmount = activeTrainers * pricePerTrainer

  return {
    studioId,
    studioName: studio.name,
    periodStart,
    periodEnd,
    totalTrainers,
    activeTrainers,
    trainerActivity,
    totalLessons: lessons.length,
    totalAssessments: assessments.length,
    totalWorkouts: workouts.length,
    totalClients: clients,
    pricePerTrainer,
    totalAmount
  }
}

// ============================================================================
// CRIAR REGISTRO DE USO NO BANCO
// ============================================================================
export async function recordStudioUsage(
  studioId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<any> {
  
  // Calcular uso
  const usage = await calculateStudioUsage(studioId, periodStart, periodEnd)

  // Buscar assinatura ativa
  const subscription = await prisma.subscription.findFirst({
    where: {
      studioId,
      status: 'ACTIVE'
    }
  })

  if (!subscription) {
    throw new Error('No active subscription found for studio')
  }

  // Criar registro de uso
  const usageRecord = await prisma.usageRecord.create({
    data: {
      subscriptionId: subscription.id,
      studioId,
      periodStart,
      periodEnd,
      activeTrainers: usage.activeTrainers,
      totalTrainers: usage.totalTrainers,
      trainerActivity: usage.trainerActivity as any,
      totalLessons: usage.totalLessons,
      totalAssessments: usage.totalAssessments,
      totalWorkouts: usage.totalWorkouts,
      totalClients: usage.totalClients,
      pricePerTrainer: new Decimal(usage.pricePerTrainer),
      totalAmount: new Decimal(usage.totalAmount),
      isBilled: false,
      recordedAt: new Date()
    }
  })

  return usageRecord
}

// ============================================================================
// GERAR FATURA BASEADA EM REGISTRO DE USO
// ============================================================================
export async function generateInvoiceFromUsage(
  usageRecordId: string
): Promise<any> {
  
  const usageRecord = await prisma.usageRecord.findUnique({
    where: { id: usageRecordId },
    include: {
      subscription: {
        include: {
          studio: true,
          plan: true
        }
      }
    }
  })

  if (!usageRecord) {
    throw new Error('Usage record not found')
  }

  if (usageRecord.isBilled) {
    throw new Error('Usage record already billed')
  }

  const studio = usageRecord.subscription.studio
  const plan = usageRecord.subscription.plan

  // Gerar número da fatura
  const year = usageRecord.periodEnd.getFullYear()
  const month = String(usageRecord.periodEnd.getMonth() + 1).padStart(2, '0')
  const count = await prisma.invoice.count({
    where: {
      studioId: studio.id,
      periodStart: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    }
  })
  const invoiceNumber = `INV-${year}-${month}-${String(count + 1).padStart(3, '0')}-${studio.slug.toUpperCase()}`

  // Calcular valores
  const subtotal = usageRecord.totalAmount
  const discount = new Decimal(0) // Pode ser aplicado desconto personalizado
  const tax = new Decimal(0) // Pode ser aplicado imposto
  const total = subtotal.minus(discount).plus(tax)

  // Criar itens da fatura
  const items = [
    {
      description: `${usageRecord.activeTrainers} personal${usageRecord.activeTrainers > 1 ? 's' : ''} ativo${usageRecord.activeTrainers > 1 ? 's' : ''} no período`,
      quantity: usageRecord.activeTrainers,
      unitPrice: parseFloat(usageRecord.pricePerTrainer.toString()),
      total: parseFloat(usageRecord.totalAmount.toString())
    }
  ]

  // Data de vencimento (7 dias após geração)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)

  // Criar fatura
  const invoice = await prisma.invoice.create({
    data: {
      subscriptionId: usageRecord.subscriptionId,
      studioId: studio.id,
      invoiceNumber,
      periodStart: usageRecord.periodStart,
      periodEnd: usageRecord.periodEnd,
      subtotal,
      discount,
      tax,
      total,
      items,
      status: 'PENDING',
      dueDate,
      metadata: {
        planName: plan.name,
        planTier: plan.tier,
        activeTrainers: usageRecord.activeTrainers,
        totalTrainers: usageRecord.totalTrainers,
        generatedAt: new Date().toISOString()
      }
    }
  })

  // Marcar registro de uso como faturado
  await prisma.usageRecord.update({
    where: { id: usageRecordId },
    data: {
      isBilled: true,
      invoiceId: invoice.id
    }
  })

  return invoice
}

// ============================================================================
// CALCULAR PERÍODO MENSAL ATUAL
// ============================================================================
export function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  
  return { start, end }
}

// ============================================================================
// CALCULAR PERÍODO MENSAL ANTERIOR
// ============================================================================
export function getPreviousBillingPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  
  return { start, end }
}
