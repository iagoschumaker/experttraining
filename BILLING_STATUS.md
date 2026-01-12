# SISTEMA DE BILLING - STATUS DE IMPLEMENTAÇÃO

## ✅ IMPLEMENTAÇÃO CONCLUÍDA

### 1. Schema e Banco de Dados
- ✅ Modelos Prisma criados (Plan, Subscription, UsageRecord, Invoice)
- ✅ Campos de controle de pagamento no Studio
- ✅ Enums (PlanTier, SubscriptionStatus, InvoiceStatus, StudioStatus)
- ✅ Migração executada com sucesso
- ✅ Seed dos 3 planos base (START: R$150, PRO: R$140, PREMIUM: R$130)

### 2. Backend / API
- ✅ Service de cálculo de uso (`src/lib/billing/usage-calculator.ts`)
  - Conta trainers ativos (quem fez aula/avaliação/treino)
  - Registra uso mensal por studio
  - Gera faturas baseadas no uso
  
- ✅ Service de verificação de pagamento (`src/lib/billing/payment-check.ts`)
  - Verifica se studio pode acessar sistema
  - Suporta período de carência
  - Bloqueio por studio (multi-tenant)
  - Funções para SuperAdmin: markStudioAsPaid, blockStudioForNonPayment
  - Listagem de studios atrasados e vencendo
  
- ✅ Integração com autenticação (`src/lib/auth/protection.ts`)
  - Middleware verifica pagamento antes de permitir acesso
  - Retorna 402 Payment Required se bloqueado
  - SuperAdmin sempre tem acesso (bypass)
  
- ✅ API de billing do studio (`src/app/api/studio/billing/route.ts`)
  - GET: Retorna uso atual, uso anterior, faturas, resumo
  
- ✅ API de planos SuperAdmin (`src/app/api/superadmin/plans/route.ts`)
  - GET: Lista planos com estatísticas
  - POST: Cria novos planos
  
- ✅ API de pagamentos SuperAdmin (`src/app/api/superadmin/payments/route.ts`)
  - POST: Marcar studio como pago
  - POST: Bloquear studio por falta de pagamento
  - GET: Lista studios atrasados
  - GET: Lista pagamentos vencendo

### 3. Frontend
- ✅ Página de gerenciamento de pagamentos (`src/app/superadmin/payments/page.tsx`)
  - Dashboard com estatísticas (ativos, carência, bloqueados)
  - Lista de studios com pagamento atrasado
  - Lista de pagamentos vencendo nos próximos 7 dias
  - Diálogos para marcar como pago ou bloquear
  
- ✅ Componente de tela bloqueada (`src/components/StudioBlockedMessage.tsx`)
  - Exibida quando studio está bloqueado
  - Diferencia bloqueio total vs período de carência
  - Mostra informações de contato
  
- ✅ Gateway de pagamento (`src/components/PaymentGateway.tsx`)
  - Intercepta erros 402
  - Exibe tela de bloqueio automaticamente

### 4. Documentação
- ✅ Documentação completa do sistema (`BILLING_SYSTEM.md`)
- ✅ Este arquivo de status

## 🟡 PENDENTE / FUTURO

### 1. Automação
- [ ] Cron job para gerar faturas automaticamente no fim do mês
- [ ] Cron job para enviar lembretes de pagamento
- [ ] Script para verificar pagamentos vencidos diariamente

### 2. Gateway de Pagamento
- [ ] Integração com Stripe ou Mercado Pago
- [ ] Webhooks de confirmação de pagamento
- [ ] Processamento automático de pagamentos

### 3. Interface do Studio
- [ ] Página de cobrança para Studio Admin
- [ ] Visualização de faturas pendentes
- [ ] Histórico de pagamentos
- [ ] Download de boletos/faturas

### 4. Relatórios e Analytics
- [ ] Dashboard financeiro para SuperAdmin
- [ ] Gráficos de receita mensal
- [ ] Previsão de faturamento
- [ ] Métricas de churn (cancelamentos)

### 5. Comunicação
- [ ] Email de lembrete de vencimento (7 dias antes)
- [ ] Email de pagamento confirmado
- [ ] Email de entrada em período de carência
- [ ] Email de bloqueio efetivado

### 6. Melhorias
- [ ] Sistema de descontos e cupons
- [ ] Planos anuais com desconto
- [ ] Trial period (período de teste)
- [ ] Upgrade/downgrade de planos

## 🎯 COMO FUNCIONA (RESUMO)

### Modelo de Cobrança
- **Por Personal Ativo**: Cobra apenas por trainers que usaram o sistema no mês
- **Personal Ativo = quem fez pelo menos 1**: aula iniciada OU avaliação criada OU treino criado
- **3 Tiers de Preço**:
  - START: R$ 150/personal (1-4 personals)
  - PRO: R$ 140/personal (5-9 personals)
  - PREMIUM: R$ 130/personal (10+ personals)

### Fluxo de Pagamento (MANUAL - Atual)
1. Fim do mês: Sistema calcula quantos personals foram ativos
2. SuperAdmin acessa `/superadmin/payments`
3. Ve lista de studios e valores devidos
4. Studio paga (boleto, PIX, transferência)
5. SuperAdmin marca como pago manualmente
6. Studio continua acessando normalmente

### Bloqueio por Falta de Pagamento
1. SuperAdmin clica em "Bloquear" no studio
2. Define período de carência (ex: 7 dias)
3. Durante carência: Studio vê aviso mas ainda acessa
4. Após carência: Bloqueio total
5. Personal vê tela: "Acesso Bloqueado - Entre em contato"

### Multi-tenant (Importante!)
- Personal pode trabalhar em múltiplos studios
- Se Studio A bloqueia: Personal não acessa Studio A
- Mas mesmo personal ainda acessa Studio B (se B está pagando)
- SuperAdmin sempre acessa tudo para gerenciar

## 🔧 COMANDOS ÚTEIS

```bash
# Ver planos no banco
npx prisma studio
# Navegar até tabela "plans"

# Re-executar seed dos planos
npx tsx prisma/seed-plans.ts

# Ver todos os studios e status de pagamento
# No Prisma Studio → tabela "studios" → ver colunas is_paid, payment_due_date

# Testar bloqueio de studio (manualmente no banco)
# UPDATE studios SET is_paid = false WHERE id = 'studio-id'
```

## 📱 TELAS DO SISTEMA

### Para SuperAdmin
- `/superadmin/payments` - Gerenciamento de pagamentos
- `/superadmin/plans` - Gerenciamento de planos

### Para Studio Admin (Futuro)
- `/studio/billing` - Ver faturas e fazer pagamentos

### Para Personal Bloqueado
- Qualquer rota → Vê tela "Acesso Bloqueado"
- Exceto se SuperAdmin → Sempre acessa

## 🚀 PRÓXIMOS PASSOS

### Curto Prazo (Manual)
1. ✅ Sistema funcionando manualmente
2. SuperAdmin marca pagamentos via interface
3. Monitorar uso e ajustar se necessário

### Médio Prazo (Semi-automático)
1. Implementar cron jobs de cálculo
2. Enviar emails de lembrete
3. Integrar boleto bancário

### Longo Prazo (Totalmente Automático)
1. Gateway de pagamento completo
2. Pagamentos recorrentes por cartão
3. Processamento automático
4. Dashboard financeiro completo
