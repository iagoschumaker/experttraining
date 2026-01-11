// Script para verificar usuário no banco
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      isSuperAdmin: true,
      isActive: true,
      passwordHash: true,
    }
  })
  
  console.log('Usuários no banco:')
  users.forEach(u => {
    console.log(`- ${u.email} | SuperAdmin: ${u.isSuperAdmin} | Active: ${u.isActive} | Hash: ${u.passwordHash.substring(0, 20)}...`)
  })
  
  // Testar verificação de senha
  const bcrypt = require('bcryptjs')
  const juba = users.find(u => u.email === 'juba@experttraining.com.br')
  if (juba) {
    const testPassword = 'super123'
    const isValid = await bcrypt.compare(testPassword, juba.passwordHash)
    console.log(`\nTeste de senha para juba: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
