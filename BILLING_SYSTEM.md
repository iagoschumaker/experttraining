# 💰 Sistema de Cobrança - Expert Training

## 📋 Visão Geral

O Expert Training utiliza um modelo de cobrança **baseado em uso real**, cobrando apenas pelos **personals ativos** no mês.

### 🎯 Definição de "Personal Ativo"

Um personal trainer é considerado **ATIVO** no mês se ele executou **pelo menos UMA** das seguintes ações:

- ✅ Iniciou uma aula (`Lesson.startedAt`)
- ✅ Realizou uma avaliação (`Assessment.createdAt`)
- ✅ Criou um treino (`Workout.createdAt`)

**Importante:** Apenas cadastrar um trainer NO SISTEMA não gera cobrança. Ele precisa **usar o sistema ativamente**.

---

## 🏆 Planos Disponíveis

### 1. **STUDIO START**
- 💰 **R$ 150/personal ativo**
- 🎯 Ideal para: Personal trainers e studios pequenos
- 📊 Mínimo: 1 personal
- 📊 Recomendado até: 4 personals
- ✨ **Exemplo**: 3 personals ativos = **R$ 450/mês**

### 2. **STUDIO PRO**
- 💰 **R$ 140/personal ativo** (desconto de R$ 10)
- 🎯 Ideal para: Studios médios e grandes
- 📊 Mínimo: 5 personals
- 📊 Recomendado até: 9 personals
- ✨ **Exemplo**: 7 personals ativos = **R$ 980/mês**

### 3. **STUDIO PREMIUM**
- 💰 **R$ 130/personal ativo** (desconto de R$ 20)
- 🎯 Ideal para: Studios referência e redes
- 📊 Mínimo: 10 personals
- 📊 Recomendado: Sem limite
- ✨ **Exemplo**: 15 personals ativos = **R$ 1.950/mês**

---

## 🔄 Ciclo de Cobrança

### 1. **Durante o Mês**
O sistema monitora continuamente as atividades de cada trainer:
```typescript
// O que é monitorado:
- Lessons started (aulas iniciadas)
- Assessments created (avaliações feitas)  
- Workouts created (treinos criados)
```

### 2. **Final do Mês**
No último dia do mês (automatizado via cron job):

1. Sistema calcula quantos trainers foram ativos
2. Cria um `UsageRecord` com os detalhes
3. Gera uma `Invoice` (fatura)
4. Envia notificação para o Studio Admin

### 3. **Pagamento**
- **Prazo**: 7 dias após emissão da fatura
- **Métodos**: PIX, Cartão, Boleto
- **Status**: PENDING → PAID ou OVERDUE

---

## 🗂️ Estrutura de Dados

### **UsageRecord** (Registro de Uso)
```json
{
  "periodStart": "2026-01-01T00:00:00Z",
  "periodEnd": "2026-01-31T23:59:59Z",
  "activeTrainers": 5,
  "totalTrainers": 8,
  "trainerActivity": {
    "trainer_id_1": {
      "name": "João Silva",
      "lessonsStarted": 20,
      "assessmentsCreated": 5,
      "workoutsCreated": 12,
      "isActive": true
    },
    "trainer_id_2": {
      "name": "Maria Santos",
      "lessonsStarted": 0,
      "assessmentsCreated": 0,
      "workoutsCreated": 0,
      "isActive": false // NÃO É COBRADO
    }
  },
  "pricePerTrainer": 150.00,
  "totalAmount": 750.00 // 5 ativos × R$ 150
}
```

### **Invoice** (Fatura)
```json
{
  "invoiceNumber": "INV-2026-01-001-STUDIO-ABC",
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "items": [
    {
      "description": "5 personals ativos no período",
      "quantity": 5,
      "unitPrice": 150.00,
      "total": 750.00
    }
  ],
  "subtotal": 750.00,
  "discount": 0.00,
  "tax": 0.00,
  "total": 750.00,
  "status": "PENDING",
  "dueDate": "2026-02-07"
}
```

---

## 📊 APIs Disponíveis

### **Para Studios** (Studio Admin / Trainer)

#### `GET /api/studio/billing`
Retorna uso atual, faturas e histórico.

**Response:**
```typescript
{
  success: true,
  data: {
    subscription: {
      plan: { name, tier, pricePerTrainer },
      nextBillingDate,
      status
    },
    currentUsage: {
      activeTrainers: 5,
      totalTrainers: 8,
      trainerActivity: {...},
      estimatedTotal: 750.00
    },
    previousUsage: {...},
    invoices: [...],
    summary: {
      totalPaid: 2250.00,
      totalPending: 750.00,
      totalOverdue: 0.00
    }
  }
}
```

---

### **Para SuperAdmin**

#### `GET /api/superadmin/plans`
Lista todos os planos com estatísticas.

#### `POST /api/superadmin/plans`
Cria novo plano personalizado.

#### `GET /api/superadmin/billing/studios`
Lista cobrança de todos os studios.

#### `POST /api/superadmin/billing/generate-invoices`
Gera faturas manualmente para todos os studios.

---

## 🛠️ Serviços Disponíveis

### **UsageCalculator Service**
Localização: `src/lib/billing/usage-calculator.ts`

```typescript
import { 
  calculateStudioUsage,
  recordStudioUsage,
  generateInvoiceFromUsage,
  getCurrentBillingPeriod 
} from '@/lib/billing/usage-calculator'

// Calcular uso de um studio
const usage = await calculateStudioUsage(
  studioId,
  new Date('2026-01-01'),
  new Date('2026-01-31')
)

// Registrar uso no banco
const record = await recordStudioUsage(
  studioId,
  periodStart,
  periodEnd
)

// Gerar fatura
const invoice = await generateInvoiceFromUsage(recordId)
```

---

## 🔐 Regras Anti-Burla

### 1. **Atividade Real**
Apenas ações reais no sistema contam:
- ✅ Check-in de aula (com foto)
- ✅ Avaliação completa criada
- ✅ Treino montado para cliente

### 2. **Auditoria**
Todas as ações são registradas com:
- Timestamp preciso
- IP do usuário
- ID do trainer
- Relacionamento com entidades (Lesson, Assessment, Workout)

### 3. **Transparência Total**
O Studio Admin pode visualizar:
- Quem está ativo
- Quantas ações cada trainer fez
- Primeira e última atividade do mês
- Detalhamento completo da cobrança

---

## 🚀 Implementação em Produção

### **1. Migration do Banco**
```bash
npm run prisma:migrate
npm run seed:plans
```

### **2. Cron Job (Geração Automática)**
Configurar job diário para rodar no último dia do mês:

```typescript
// Exemplo com node-cron
import cron from 'node-cron'
import { generateMonthlyInvoices } from '@/lib/billing/cron'

// Executa dia 1 de cada mês às 00:00 (processa mês anterior)
cron.schedule('0 0 1 * *', async () => {
  console.log('🔄 Gerando faturas mensais...')
  await generateMonthlyInvoices()
})
```

### **3. Webhooks de Pagamento**
Integrar com gateway de pagamento (Stripe, Mercado Pago, etc):

```typescript
// POST /api/webhooks/payment
// Atualiza status da invoice quando pagamento é confirmado
```

---

## 💡 Posicionamento de Vendas

### **Frase-chave:**
> "Você não paga por aluno.  
> Você paga por profissional autorizado a aplicar o método."

### **Benefícios:**
- ✅ Sem limite de alunos
- ✅ Cobrança justa (paga quem usa)
- ✅ Transparência total
- ✅ Escalável (quanto mais cresce, mais desconto)
- ✅ Sem surpresas na fatura

---

## 📞 Suporte

Para dúvidas sobre cobrança:
- **Studio Admin**: Acesse `/billing` no sistema
- **SuperAdmin**: Acesse `/superadmin/billing`
- **Email**: billing@experttraining.com.br
