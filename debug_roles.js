
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Inspecting last 3 studios...')
  
  const studios = await prisma.studio.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
        users: {
            include: {
                user: true
            }
        }
    }
  })

  for (const studio of studios) {
      console.log(`\nStudio: ${studio.name} (${studio.id})`)
      console.log(`Plan: ${studio.planId}`)
      
      studio.users.forEach(u => {
          console.log(` - ${u.user.name} -> Role: ${u.role}, Active: ${u.isActive}`)
      })

      const trainerCount = await prisma.userStudio.count({
        where: {
          studioId: studio.id,
          isActive: true,
          role: 'TRAINER'
        }
      })
      
      console.log(`Count (TRAINER only): ${trainerCount}`)
  }
  process.exit(0)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
