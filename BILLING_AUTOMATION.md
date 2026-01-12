# Sistema de Cobrança Automática - Expert Training

## 🎯 Visão Geral

O sistema calcula automaticamente quanto cada studio deve pagar baseado nos **trainers ativos** no período.

## 📊 Definição de Trainer Ativo

Um trainer é considerado **ATIVO** se fez pelo menos **UMA** das seguintes ações no período:
- ✅ Iniciou uma aula (Lesson)
- ✅ Realizou uma avaliação (Assessment)  
- ✅ Criou um treino (Workout)

## 💰 Planos de Cobrança

| Plano | Preço por Trainer Ativo | Mínimo | Máximo Recomendado |
|-------|------------------------|--------|-------------------|
| **START** | R$ 150,00 | 1 | 5 |
| **PRO** | R$ 140,00 | 3 | 15 |
| **PREMIUM** | R$ 130,00 | 10 | ilimitado |

### Exemplo de Cálculo

**Studio com Plano PRO:**
- 10 trainers cadastrados
- 6 trainers ativos (fizeram aulas/avaliações/treinos)
- **Cobrança = 6 × R$ 140,00 = R$ 840,00**

## 🔄 Fluxo de Cobrança

### 1. Cálculo de Uso (Mensal)

```
Dia 1 do mês → Calcular mês anterior
```

- Sistema conta trainers ativos de cada studio
- Cria registro de uso (UsageRecord)
- Armazena detalhes da atividade

### 2. Geração de Fatura

- Cria invoice baseada no registro de uso
- Número da fatura: `INV-AAAA-MM-NNN-STUDIO`
- Data de vencimento: 7 dias após geração

### 3. Atualização do Studio

- `paymentDueDate`: Data de vencimento
- `isPaid`: false
- Status mantém "ACTIVE" até vencimento

### 4. Verificação de Pagamento

**Quando vence:**
- Se não pago → Studio entra em `GRACE_PERIOD`
- Período de graça: 7 dias (configurável)

**Após período de graça:**
- Status → `SUSPENDED`
- Acesso bloqueado
- Login retorna erro 402

## 🖥️ Como Usar (SuperAdmin)

### Cálculo Manual

1. Acesse **SuperAdmin → Pagamentos**
2. Clique em **"Calcular Cobrança"**
3. Sistema processa:
   - Calcula trainers ativos de cada studio
   - Gera faturas pendentes
   - Atualiza datas de vencimento

### Registrar Pagamento

1. Na lista de studios com pagamento pendente
2. Clique em **"Marcar Pago"**
3. Preencha:
   - Data do pagamento
   - Próximo vencimento (sugestão: +1 mês)
   - Observações (opcional)
4. Confirmar

**Efeito:**
- `isPaid` → true
- `lastPaymentDate` → data informada
- `paymentDueDate` → próximo vencimento
- Status volta para `ACTIVE`

### Bloquear Studio

1. Clique em **"Bloquear"**
2. Informe:
   - Motivo do bloqueio
   - Período de graça (0-30 dias)
3. Confirmar

**Efeito:**
- Status → `GRACE_PERIOD` (se período > 0) ou `SUSPENDED`
- `gracePeriodEnds` → data calculada
- `blockedReason` → motivo informado
- Acesso bloqueado após período

## 🤖 Automação Futura

### Cron Job Mensal

```typescript
// Executar todo dia 1 às 00:00
schedule: '0 0 1 * *'
action: 'process-all'
```

**Função:**
1. Calcular uso do mês anterior
2. Gerar faturas automaticamente
3. Enviar email de cobrança
4. Notificar SuperAdmin

### Verificação Diária

```typescript
// Executar todo dia às 09:00
schedule: '0 9 * * *'
action: 'check-overdue'
```

**Função:**
1. Verificar pagamentos vencidos
2. Aplicar período de graça
3. Bloquear studios atrasados
4. Enviar lembretes

## 📧 Notificações (Futuro)

### Para Studio

- **7 dias antes**: Lembrete de vencimento
- **No vencimento**: Fatura disponível
- **Vencido**: Aviso de atraso
- **Período de graça**: Alerta de bloqueio iminente
- **Bloqueado**: Notificação de suspensão

### Para SuperAdmin

- **Resumo mensal**: Total faturado, inadimplência
- **Alertas**: Studios bloqueados, cancelamentos

## 🔍 Consultas Úteis

### Ver Uso de um Studio

```typescript
GET /api/superadmin/billing/calculate
POST { action: 'calculate-studio', studioId: 'xxx' }
```

### Calcular Todos

```typescript
POST /api/superadmin/billing/calculate
{ action: 'calculate-all' }
```

### Gerar Faturas Pendentes

```typescript
POST /api/superadmin/billing/calculate
{ action: 'generate-invoices' }
```

### Processar Tudo

```typescript
POST /api/superadmin/billing/calculate
{ action: 'process-all' }
```

## 🗄️ Modelos de Dados

### UsageRecord

```prisma
- subscriptionId: ID da assinatura
- studioId: ID do studio
- periodStart/End: Período calculado
- activeTrainers: Quantidade de trainers ativos
- totalTrainers: Total de trainers
- trainerActivity: Detalhes de cada trainer
- totalLessons/Assessments/Workouts: Métricas
- pricePerTrainer: Preço unitário
- totalAmount: Valor total
- isBilled: Se já foi faturado
```

### Invoice

```prisma
- invoiceNumber: INV-AAAA-MM-NNN-STUDIO
- periodStart/End: Período cobrado
- subtotal/discount/tax/total: Valores
- items: Itens da fatura (JSON)
- status: PENDING/PAID/OVERDUE/CANCELED
- dueDate: Data de vencimento
- paidAt: Data do pagamento
```

### Studio (campos de pagamento)

```prisma
- isPaid: Se está pago
- lastPaymentDate: Último pagamento
- paymentDueDate: Próximo vencimento
- paymentNotes: Observações
- gracePeriodEnds: Fim do período de graça
- blockedReason: Motivo do bloqueio
- blockedAt: Data do bloqueio
```

## ✅ Checklist de Implementação

- [x] Modelos de dados (Plan, Subscription, UsageRecord, Invoice)
- [x] Cálculo de trainers ativos
- [x] Geração de faturas
- [x] Controle de pagamento manual
- [x] Bloqueio por inadimplência
- [x] Interface SuperAdmin
- [x] API de cálculo automático
- [ ] Cron job mensal
- [ ] Sistema de notificações
- [ ] Interface de billing para studio
- [ ] Integração com gateway (Stripe/Mercado Pago)
- [ ] Relatórios financeiros
- [ ] Dashboard de métricas

## 🚀 Próximos Passos

1. **Implementar Cron Jobs**
   - Usar node-cron ou Vercel Cron
   - Automatizar cálculo mensal
   - Verificação diária de vencimentos

2. **Sistema de Emails**
   - Integrar SendGrid ou AWS SES
   - Templates de notificações
   - Lembretes automáticos

3. **Gateway de Pagamento**
   - Mercado Pago (recomendado para Brasil)
   - Geração de boleto/PIX
   - Webhooks de confirmação

4. **Dashboard Financeiro**
   - Gráficos de receita
   - Taxa de inadimplência
   - Previsão de faturamento

---

**Data:** Janeiro 2026  
**Status:** Cálculo automático implementado, aguardando automação completa
