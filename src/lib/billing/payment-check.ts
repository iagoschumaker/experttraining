// ============================================================================
// EXPERT TRAINING - PAYMENT CHECK MIDDLEWARE
// ============================================================================
// Verifica se o studio está com pagamento em dia
// Bloqueia acesso apenas ao studio específico, não ao usuário global
// ============================================================================

import prisma from '@/lib/prisma'

interface PaymentCheckResult {
  allowed: boolean
  studio: {
    id: string
    name: string
    status: string
    isPaid: boolean
    paymentDueDate: Date | null
    gracePeriodEnds: Date | null
  }
  blockReason?: string
  message?: string
}

// ============================================================================
// VERIFICAR SE STUDIO PODE SER ACESSADO
// ============================================================================
export async function checkStudioPayment(
  studioId: string
): Promise<PaymentCheckResult> {
  
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      id: true,
      name: true,
      status: true,
      isPaid: true,
      lastPaymentDate: true,
      paymentDueDate: true,
      gracePeriodEnds: true,
      blockedReason: true,
      blockedAt: true,
    }
  })

  if (!studio) {
    return {
      allowed: false,
      studio: null as any,
      blockReason: 'STUDIO_NOT_FOUND',
      message: 'Studio não encontrado'
    }
  }

  // 1. Se status é CANCELED, bloqueia
  if (studio.status === 'CANCELED') {
    return {
      allowed: false,
      studio,
      blockReason: 'STUDIO_CANCELED',
      message: 'Este studio foi cancelado. Entre em contato com o suporte.'
    }
  }

  // 2. Se isPaid é false, verifica período de carência
  if (!studio.isPaid) {
    const now = new Date()

    // Se tem período de carência e ainda está dentro
    if (studio.gracePeriodEnds && studio.gracePeriodEnds > now) {
      return {
        allowed: true, // PERMITE ACESSO durante carência
        studio,
        message: `⚠️ Pagamento pendente. Acesso liberado até ${studio.gracePeriodEnds.toLocaleDateString('pt-BR')}`
      }
    }

    // Período de carência expirou ou não existe
    return {
      allowed: false,
      studio,
      blockReason: 'PAYMENT_OVERDUE',
      message: studio.blockedReason || 
               'Pagamento em atraso. Entre em contato com a administração para regularizar.'
    }
  }

  // 3. Studio está pago, permite acesso
  return {
    allowed: true,
    studio,
    message: undefined
  }
}

// ============================================================================
// VERIFICAR MÚLTIPLOS STUDIOS DO USUÁRIO
// ============================================================================
export async function checkUserStudiosAccess(
  userId: string
): Promise<{
  accessibleStudios: string[]
  blockedStudios: Array<{
    studioId: string
    studioName: string
    reason: string
  }>
}> {
  
  // Buscar todos os studios do usuário
  const userStudios = await prisma.userStudio.findMany({
    where: {
      userId,
      isActive: true
    },
    include: {
      studio: {
        select: {
          id: true,
          name: true,
          status: true,
          isPaid: true,
          paymentDueDate: true,
          gracePeriodEnds: true,
          blockedReason: true,
        }
      }
    }
  })

  const accessibleStudios: string[] = []
  const blockedStudios: Array<{ studioId: string; studioName: string; reason: string }> = []

  for (const userStudio of userStudios) {
    const check = await checkStudioPayment(userStudio.studioId)
    
    if (check.allowed) {
      accessibleStudios.push(userStudio.studioId)
    } else {
      blockedStudios.push({
        studioId: userStudio.studioId,
        studioName: userStudio.studio.name,
        reason: check.message || 'Acesso bloqueado'
      })
    }
  }

  return {
    accessibleStudios,
    blockedStudios
  }
}

// ============================================================================
// MARCAR STUDIO COMO PAGO (MANUAL - SUPERADMIN)
// ============================================================================
export async function markStudioAsPaid(
  studioId: string,
  options: {
    paidBy: string // userId do SuperAdmin que marcou como pago
    paymentDate: Date
    nextDueDate: Date
    notes?: string
  }
): Promise<void> {
  
  await prisma.studio.update({
    where: { id: studioId },
    data: {
      isPaid: true,
      status: 'ACTIVE',
      lastPaymentDate: options.paymentDate,
      paymentDueDate: options.nextDueDate,
      paymentNotes: options.notes,
      gracePeriodEnds: null,
      blockedReason: null,
      blockedAt: null,
    }
  })

  // Log de auditoria
  await prisma.auditLog.create({
    data: {
      userId: options.paidBy,
      studioId,
      action: 'UPDATE',
      entity: 'Studio',
      entityId: studioId,
      newData: {
        action: 'PAYMENT_CONFIRMED',
        paymentDate: options.paymentDate,
        nextDueDate: options.nextDueDate,
        notes: options.notes,
      }
    }
  })
}

// ============================================================================
// BLOQUEAR STUDIO POR FALTA DE PAGAMENTO (MANUAL - SUPERADMIN)
// ============================================================================
export async function blockStudioForNonPayment(
  studioId: string,
  options: {
    blockedBy: string // userId do SuperAdmin
    reason: string
    graceDays?: number // Dias de carência antes de bloquear
  }
): Promise<void> {
  
  const now = new Date()
  const gracePeriodEnds = options.graceDays 
    ? new Date(now.getTime() + options.graceDays * 24 * 60 * 60 * 1000)
    : null

  const status = gracePeriodEnds ? 'GRACE_PERIOD' : 'SUSPENDED'

  await prisma.studio.update({
    where: { id: studioId },
    data: {
      isPaid: false,
      status,
      blockedReason: options.reason,
      blockedAt: gracePeriodEnds ? null : now,
      gracePeriodEnds,
    }
  })

  // Log de auditoria
  await prisma.auditLog.create({
    data: {
      userId: options.blockedBy,
      studioId,
      action: 'UPDATE',
      entity: 'Studio',
      entityId: studioId,
      newData: {
        action: 'BLOCKED_FOR_NON_PAYMENT',
        reason: options.reason,
        graceDays: options.graceDays,
        gracePeriodEnds,
        status,
      }
    }
  })
}

// ============================================================================
// VERIFICAR STUDIOS COM PAGAMENTO VENCENDO
// ============================================================================
export async function getStudiosWithUpcomingPayments(
  daysAhead: number = 7
): Promise<Array<{
  id: string
  name: string
  paymentDueDate: Date
  daysUntilDue: number
  lastPaymentDate: Date | null
}>> {
  
  const now = new Date()
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const studios = await prisma.studio.findMany({
    where: {
      isPaid: true,
      paymentDueDate: {
        gte: now,
        lte: futureDate
      }
    },
    select: {
      id: true,
      name: true,
      paymentDueDate: true,
      lastPaymentDate: true,
    },
    orderBy: {
      paymentDueDate: 'asc'
    }
  })

  return studios.map(studio => ({
    id: studio.id,
    name: studio.name,
    paymentDueDate: studio.paymentDueDate!,
    daysUntilDue: Math.ceil(
      (studio.paymentDueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ),
    lastPaymentDate: studio.lastPaymentDate,
  }))
}

// ============================================================================
// VERIFICAR STUDIOS COM PAGAMENTO ATRASADO
// ============================================================================
export async function getOverdueStudios(): Promise<Array<{
  id: string
  name: string
  paymentDueDate: Date
  daysOverdue: number
  gracePeriodEnds: Date | null
  isInGracePeriod: boolean
}>> {
  
  const now = new Date()

  const studios = await prisma.studio.findMany({
    where: {
      OR: [
        {
          isPaid: false,
          paymentDueDate: { lt: now }
        },
        {
          status: 'GRACE_PERIOD'
        },
        {
          status: 'SUSPENDED'
        }
      ]
    },
    select: {
      id: true,
      name: true,
      paymentDueDate: true,
      gracePeriodEnds: true,
      status: true,
    },
    orderBy: {
      paymentDueDate: 'asc'
    }
  })

  return studios.map(studio => {
    const daysOverdue = studio.paymentDueDate
      ? Math.ceil((now.getTime() - studio.paymentDueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const isInGracePeriod = 
      studio.gracePeriodEnds !== null && 
      studio.gracePeriodEnds > now

    return {
      id: studio.id,
      name: studio.name,
      paymentDueDate: studio.paymentDueDate || now,
      daysOverdue,
      gracePeriodEnds: studio.gracePeriodEnds,
      isInGracePeriod,
    }
  })
}
