// ============================================================================
// SCRIPT: Hard-delete inactive clients and their related data
// ============================================================================
// Usage (run on server):
//   cd /var/www/experttraining
//   node scripts/cleanup-inactive-clients.mjs
// ============================================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('\n🔍 Buscando clientes inativos...\n')

    // Find all inactive clients
    const inactiveClients = await prisma.client.findMany({
        where: {
            OR: [
                { status: 'INACTIVE' },
                { isActive: false },
            ],
        },
        select: {
            id: true,
            name: true,
            studioId: true,
            status: true,
            isActive: true,
            createdAt: true,
            _count: {
                select: {
                    workouts: true,
                    assessments: true,
                    lessonClients: true,
                },
            },
        },
    })

    if (inactiveClients.length === 0) {
        console.log('✅ Nenhum cliente inativo encontrado. Banco limpo!')
        return
    }

    console.log(`⚠️  Encontrados ${inactiveClients.length} cliente(s) inativo(s):\n`)

    for (const client of inactiveClients) {
        console.log(`  • ${client.name} (ID: ${client.id})`)
        console.log(`    Status: ${client.status}, isActive: ${client.isActive}`)
        console.log(`    Treinos: ${client._count.workouts}, Avaliações: ${client._count.assessments}, Aulas: ${client._count.lessonClients}`)
        console.log(`    Criado em: ${client.createdAt.toISOString()}`)
        console.log('')
    }

    console.log('🗑️  Excluindo clientes inativos e dados relacionados...\n')

    for (const client of inactiveClients) {
        try {
            // Delete in order: lessonClients -> lessons (from workouts) -> workouts -> assessments -> client

            // 1. Delete lesson-client associations
            const deletedLessonClients = await prisma.lessonClient.deleteMany({
                where: { clientId: client.id },
            })

            // 2. Delete lessons from client's workouts
            const clientWorkouts = await prisma.workout.findMany({
                where: { clientId: client.id },
                select: { id: true },
            })
            const workoutIds = clientWorkouts.map(w => w.id)

            let deletedLessons = 0
            if (workoutIds.length > 0) {
                const result = await prisma.lesson.deleteMany({
                    where: { workoutId: { in: workoutIds } },
                })
                deletedLessons = result.count
            }

            // 3. Delete workouts
            const deletedWorkouts = await prisma.workout.deleteMany({
                where: { clientId: client.id },
            })

            // 4. Delete assessments
            const deletedAssessments = await prisma.assessment.deleteMany({
                where: { clientId: client.id },
            })

            // 5. Delete the client
            await prisma.client.delete({
                where: { id: client.id },
            })

            console.log(`  ✅ ${client.name}: excluído`)
            console.log(`     - ${deletedLessonClients.count} vínculos aula-aluno`)
            console.log(`     - ${deletedLessons} aulas`)
            console.log(`     - ${deletedWorkouts.count} treinos`)
            console.log(`     - ${deletedAssessments.count} avaliações`)
        } catch (error) {
            console.error(`  ❌ Erro ao excluir ${client.name}:`, error)
        }
    }

    console.log(`\n🎉 Limpeza concluída! ${inactiveClients.length} cliente(s) removido(s) do banco.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
