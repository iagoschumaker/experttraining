// ============================================================================
// EXPERT TRAINING - SEED DE PLANOS
// ============================================================================
// Popula os 3 planos base do sistema
// ============================================================================

import { PrismaClient, PlanTier } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding plans...')

  // ============================================================================
  // PLANO 1: STUDIO START
  // ============================================================================
  const planStart = await prisma.plan.upsert({
    where: { slug: 'studio-start' },
    update: {},
    create: {
      name: 'EXPERT TRAINING - STUDIO START',
      slug: 'studio-start',
      tier: PlanTier.START,
      description: 'Ideal para personal trainers e studios pequenos que estão começando. Sem limite de alunos, você paga apenas pelos profissionais que utilizam o sistema.',
      pricePerTrainer: 150.00,
      minTrainers: 1,
      recommendedMax: 4,
      billingRules: {
        activeDefinition: 'at_least_one_action', // Aula OU avaliação OU treino
        gracePeriodDays: 7,
        billingCycle: 'monthly',
        minCharge: 150.00, // Cobrança mínima de 1 personal
      },
      features: [
        '✅ Avaliações funcionais ilimitadas',
        '✅ Alunos ilimitados',
        '✅ Acesso completo ao motor de decisão',
        '✅ Planilhas e blocos oficiais do método',
        '✅ Check-in com foto',
        '✅ Histórico completo',
        '✅ Auditoria ativa',
        '✅ Suporte por email',
        '💡 Paga apenas pelos personals ativos no mês',
      ],
      isActive: true,
      isVisible: true,
    },
  })
  console.log('✅ Plan created:', planStart.name)

  // ============================================================================
  // PLANO 2: STUDIO PRO
  // ============================================================================
  const planPro = await prisma.plan.upsert({
    where: { slug: 'studio-pro' },
    update: {},
    create: {
      name: 'EXPERT TRAINING - STUDIO PRO',
      slug: 'studio-pro',
      tier: PlanTier.PRO,
      description: 'Para studios médios e grandes. Desconto por volume com 5+ profissionais ativos. Tudo do plano Start com prioridade no suporte.',
      pricePerTrainer: 140.00,
      minTrainers: 5,
      recommendedMax: 9,
      billingRules: {
        activeDefinition: 'at_least_one_action',
        gracePeriodDays: 7,
        billingCycle: 'monthly',
        minCharge: 700.00, // Cobrança mínima de 5 personals
        volumeDiscount: true,
      },
      features: [
        '✅ Tudo do STUDIO START',
        '🎯 Desconto por volume (R$ 140/personal)',
        '🎯 Recomendado para 5-9 personals',
        '⚡ Prioridade no suporte',
        '⚡ Relatórios avançados',
        '⚡ Exportação de dados',
        '💡 Exemplo: 5 personals = R$ 700/mês',
        '💡 Exemplo: 10 personals = R$ 1.400/mês',
      ],
      isActive: true,
      isVisible: true,
    },
  })
  console.log('✅ Plan created:', planPro.name)

  // ============================================================================
  // PLANO 3: STUDIO PREMIUM
  // ============================================================================
  const planPremium = await prisma.plan.upsert({
    where: { slug: 'studio-premium' },
    update: {},
    create: {
      name: 'EXPERT TRAINING - STUDIO PREMIUM',
      slug: 'studio-premium',
      tier: PlanTier.PREMIUM,
      description: 'Para studios referência e redes. Maior desconto com 10+ profissionais ativos. Inclui acesso antecipado a features e possibilidade de co-branding.',
      pricePerTrainer: 130.00,
      minTrainers: 10,
      recommendedMax: null, // Sem limite
      billingRules: {
        activeDefinition: 'at_least_one_action',
        gracePeriodDays: 7,
        billingCycle: 'monthly',
        minCharge: 1300.00, // Cobrança mínima de 10 personals
        volumeDiscount: true,
        enterpriseSupport: true,
      },
      features: [
        '✅ Tudo do STUDIO PRO',
        '🏆 Melhor preço (R$ 130/personal)',
        '🏆 Recomendado para 10+ personals',
        '🏆 Suporte prioritário e dedicado',
        '🏆 Acesso antecipado a novas features',
        '🏆 Possibilidade de co-branding',
        '🏆 Gerente de conta dedicado',
        '🏆 Treinamento personalizado da equipe',
        '🏆 Relatórios customizados',
        '💡 Exemplo: 10 personals = R$ 1.300/mês',
        '💡 Exemplo: 20 personals = R$ 2.600/mês',
      ],
      isActive: true,
      isVisible: true,
    },
  })
  console.log('✅ Plan created:', planPremium.name)

  console.log('✅ Plans seeded successfully!')
  console.log('\n📊 Summary:')
  console.log(`   - ${planStart.name}: R$ ${planStart.pricePerTrainer}/personal`)
  console.log(`   - ${planPro.name}: R$ ${planPro.pricePerTrainer}/personal`)
  console.log(`   - ${planPremium.name}: R$ ${planPremium.pricePerTrainer}/personal`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
