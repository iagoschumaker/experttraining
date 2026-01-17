// ============================================================================
// EXPERT PRO TRAINING - BACKUP SYSTEM
// ============================================================================
// Sistema completo de backup e restauração de dados
// ============================================================================

import prisma from '@/lib/prisma'

export interface BackupMetadata {
  id: string
  name: string
  description: string | null
  createdAt: Date
  createdBy: string
  createdByName: string
  size: number // em bytes
  tablesIncluded: string[]
  recordCounts: Record<string, number>
  version: string
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED'
  checksum: string
}

export interface BackupData {
  metadata: BackupMetadata
  data: {
    users: any[]
    studios: any[]
    userStudios: any[]
    clients: any[]
    assessments: any[]
    workouts: any[]
    blocks: any[]
    exercises: any[]
    lessons: any[]
    lessonClients: any[]
    plans: any[]
    subscriptions: any[]
    studioSubscriptions: any[]
    invoices: any[]
    usageRecords: any[]
    auditLogs: any[]
    refreshTokens: any[]
    rules: any[]
  }
}

// Generate unique backup ID
function generateBackupId(): string {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `BKP-${timestamp}-${random}`
}

// Calculate simple checksum for data integrity
function calculateChecksum(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
}

// Export all data from database
export async function createFullBackup(userId: string, userName: string, description?: string): Promise<BackupData> {
  const backupId = generateBackupId()
  const startTime = Date.now()
  
  console.log(`🔄 Iniciando backup completo: ${backupId}`)

  // Collect all data from all tables that exist in schema
  const [
    users,
    studios,
    userStudios,
    clients,
    assessments,
    workouts,
    blocks,
    exercises,
    lessons,
    lessonClients,
    plans,
    subscriptions,
    studioSubscriptions,
    invoices,
    usageRecords,
    auditLogs,
    refreshTokens,
    rules,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.studio.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.userStudio.findMany({ orderBy: { joinedAt: 'asc' } }),
    prisma.client.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.assessment.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.workout.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.block.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.exercise.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.lesson.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.lessonClient.findMany(),
    prisma.plan.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.subscription.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.studioSubscription.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.invoice.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.usageRecord.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.refreshToken.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.rule.findMany({ orderBy: { createdAt: 'asc' } }),
  ])

  const data = {
    users,
    studios,
    userStudios,
    clients,
    assessments,
    workouts,
    blocks,
    exercises,
    lessons,
    lessonClients,
    plans,
    subscriptions,
    studioSubscriptions,
    invoices,
    usageRecords,
    auditLogs,
    refreshTokens,
    rules,
  }

  const recordCounts: Record<string, number> = {
    users: users.length,
    studios: studios.length,
    userStudios: userStudios.length,
    clients: clients.length,
    assessments: assessments.length,
    workouts: workouts.length,
    blocks: blocks.length,
    exercises: exercises.length,
    lessons: lessons.length,
    lessonClients: lessonClients.length,
    plans: plans.length,
    subscriptions: subscriptions.length,
    studioSubscriptions: studioSubscriptions.length,
    invoices: invoices.length,
    usageRecords: usageRecords.length,
    auditLogs: auditLogs.length,
    refreshTokens: refreshTokens.length,
    rules: rules.length,
  }

  const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0)
  const dataString = JSON.stringify(data)
  const size = new Blob([dataString]).size

  const metadata: BackupMetadata = {
    id: backupId,
    name: `Backup Completo - ${new Date().toLocaleDateString('pt-BR')}`,
    description: description || null,
    createdAt: new Date(),
    createdBy: userId,
    createdByName: userName,
    size,
    tablesIncluded: Object.keys(data),
    recordCounts,
    version: '1.0.0',
    status: 'COMPLETED',
    checksum: calculateChecksum(dataString),
  }

  const elapsed = Date.now() - startTime
  console.log(`✅ Backup ${backupId} concluído em ${elapsed}ms - ${totalRecords} registros, ${(size / 1024).toFixed(2)}KB`)

  return { metadata, data }
}

// Validate backup data integrity
export function validateBackup(backup: BackupData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check metadata
  if (!backup.metadata) {
    errors.push('Metadata ausente')
    return { valid: false, errors }
  }

  if (!backup.metadata.id || !backup.metadata.checksum) {
    errors.push('ID ou checksum ausente')
  }

  // Check data structure
  if (!backup.data) {
    errors.push('Dados ausentes')
    return { valid: false, errors }
  }

  const requiredTables = ['users', 'studios', 'plans', 'blocks']
  for (const table of requiredTables) {
    if (!Array.isArray((backup.data as any)[table])) {
      errors.push(`Tabela ${table} ausente ou inválida`)
    }
  }

  // Validate checksum
  const dataString = JSON.stringify(backup.data)
  const calculatedChecksum = calculateChecksum(dataString)
  if (backup.metadata.checksum !== calculatedChecksum) {
    errors.push(`Checksum inválido: esperado ${backup.metadata.checksum}, calculado ${calculatedChecksum}`)
  }

  return { valid: errors.length === 0, errors }
}

// Restore data from backup (with transaction for safety)
export async function restoreFromBackup(
  backup: BackupData, 
  options: { 
    clearExisting?: boolean
    skipUsers?: boolean
    skipAuditLogs?: boolean
  } = {}
): Promise<{ success: boolean; restored: Record<string, number>; errors: string[] }> {
  const errors: string[] = []
  const restored: Record<string, number> = {}

  // Validate backup first
  const validation = validateBackup(backup)
  if (!validation.valid) {
    return { success: false, restored, errors: validation.errors }
  }

  console.log(`🔄 Iniciando restauração do backup ${backup.metadata.id}`)

  try {
    await prisma.$transaction(async (tx) => {
      // Order matters due to foreign key constraints
      // Delete in reverse order of dependencies
      if (options.clearExisting) {
        console.log('🗑️ Limpando dados existentes...')
        
        // Delete in correct order (children first)
        await tx.lessonClient.deleteMany()
        await tx.lesson.deleteMany()
        await tx.workout.deleteMany()
        await tx.assessment.deleteMany()
        await tx.client.deleteMany()
        await tx.usageRecord.deleteMany()
        await tx.invoice.deleteMany()
        await tx.subscription.deleteMany()
        await tx.studioSubscription.deleteMany()
        await tx.userStudio.deleteMany()
        await tx.studio.deleteMany()
        await tx.plan.deleteMany()
        await tx.rule.deleteMany()
        await tx.exercise.deleteMany()
        await tx.block.deleteMany()
        if (!options.skipAuditLogs) await tx.auditLog.deleteMany()
        await tx.refreshToken.deleteMany()
        if (!options.skipUsers) await tx.user.deleteMany()
      }

      // Restore in correct order (parents first)
      
      // 1. Users (if not skipping)
      if (!options.skipUsers && backup.data.users?.length > 0) {
        for (const user of backup.data.users) {
          await tx.user.upsert({
            where: { id: user.id },
            create: user,
            update: user,
          })
        }
        restored.users = backup.data.users.length
      }

      // 2. Plans
      if (backup.data.plans?.length > 0) {
        for (const plan of backup.data.plans) {
          await tx.plan.upsert({
            where: { id: plan.id },
            create: plan,
            update: plan,
          })
        }
        restored.plans = backup.data.plans.length
      }

      // 3. Studios
      if (backup.data.studios?.length > 0) {
        for (const studio of backup.data.studios) {
          await tx.studio.upsert({
            where: { id: studio.id },
            create: studio,
            update: studio,
          })
        }
        restored.studios = backup.data.studios.length
      }

      // 4. UserStudios
      if (backup.data.userStudios?.length > 0) {
        for (const us of backup.data.userStudios) {
          await tx.userStudio.upsert({
            where: { id: us.id },
            create: us,
            update: us,
          })
        }
        restored.userStudios = backup.data.userStudios.length
      }

      // 5. Blocks
      if (backup.data.blocks?.length > 0) {
        for (const block of backup.data.blocks) {
          await tx.block.upsert({
            where: { id: block.id },
            create: block,
            update: block,
          })
        }
        restored.blocks = backup.data.blocks.length
      }

      // 6. Exercises
      if (backup.data.exercises?.length > 0) {
        for (const exercise of backup.data.exercises) {
          await tx.exercise.upsert({
            where: { id: exercise.id },
            create: exercise,
            update: exercise,
          })
        }
        restored.exercises = backup.data.exercises.length
      }

      // 7. Rules
      if (backup.data.rules?.length > 0) {
        for (const rule of backup.data.rules) {
          await tx.rule.upsert({
            where: { id: rule.id },
            create: rule,
            update: rule,
          })
        }
        restored.rules = backup.data.rules.length
      }

      // 8. Clients
      if (backup.data.clients?.length > 0) {
        for (const client of backup.data.clients) {
          await tx.client.upsert({
            where: { id: client.id },
            create: client,
            update: client,
          })
        }
        restored.clients = backup.data.clients.length
      }

      // 9. Assessments
      if (backup.data.assessments?.length > 0) {
        for (const assessment of backup.data.assessments) {
          await tx.assessment.upsert({
            where: { id: assessment.id },
            create: assessment,
            update: assessment,
          })
        }
        restored.assessments = backup.data.assessments.length
      }

      // 10. Workouts
      if (backup.data.workouts?.length > 0) {
        for (const workout of backup.data.workouts) {
          await tx.workout.upsert({
            where: { id: workout.id },
            create: workout,
            update: workout,
          })
        }
        restored.workouts = backup.data.workouts.length
      }

      // 11. Lessons
      if (backup.data.lessons?.length > 0) {
        for (const lesson of backup.data.lessons) {
          await tx.lesson.upsert({
            where: { id: lesson.id },
            create: lesson,
            update: lesson,
          })
        }
        restored.lessons = backup.data.lessons.length
      }

      // 12. LessonClients
      if (backup.data.lessonClients?.length > 0) {
        for (const lc of backup.data.lessonClients) {
          await tx.lessonClient.upsert({
            where: { id: lc.id },
            create: lc,
            update: lc,
          })
        }
        restored.lessonClients = backup.data.lessonClients.length
      }

      // 13. Subscriptions
      if (backup.data.subscriptions?.length > 0) {
        for (const sub of backup.data.subscriptions) {
          await tx.subscription.upsert({
            where: { id: sub.id },
            create: sub,
            update: sub,
          })
        }
        restored.subscriptions = backup.data.subscriptions.length
      }

      // 13b. StudioSubscriptions
      if (backup.data.studioSubscriptions?.length > 0) {
        for (const ss of backup.data.studioSubscriptions) {
          await tx.studioSubscription.upsert({
            where: { id: ss.id },
            create: ss,
            update: ss,
          })
        }
        restored.studioSubscriptions = backup.data.studioSubscriptions.length
      }

      // 14. Invoices
      if (backup.data.invoices?.length > 0) {
        for (const invoice of backup.data.invoices) {
          await tx.invoice.upsert({
            where: { id: invoice.id },
            create: invoice,
            update: invoice,
          })
        }
        restored.invoices = backup.data.invoices.length
      }

      // 15. UsageRecords
      if (backup.data.usageRecords?.length > 0) {
        for (const ur of backup.data.usageRecords) {
          await tx.usageRecord.upsert({
            where: { id: ur.id },
            create: ur,
            update: ur,
          })
        }
        restored.usageRecords = backup.data.usageRecords.length
      }

      // 16. AuditLogs (if not skipping)
      if (!options.skipAuditLogs && backup.data.auditLogs?.length > 0) {
        for (const log of backup.data.auditLogs) {
          await tx.auditLog.upsert({
            where: { id: log.id },
            create: log,
            update: log,
          })
        }
        restored.auditLogs = backup.data.auditLogs.length
      }

    }, {
      timeout: 300000, // 5 minutes for large backups
    })

    const totalRestored = Object.values(restored).reduce((a, b) => a + b, 0)
    console.log(`✅ Restauração concluída: ${totalRestored} registros restaurados`)

    return { success: true, restored, errors }

  } catch (error) {
    console.error('❌ Erro na restauração:', error)
    errors.push(error instanceof Error ? error.message : 'Erro desconhecido')
    return { success: false, restored, errors }
  }
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
