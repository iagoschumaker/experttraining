# EXPERT PRO TRAINING — Documentação Técnica Completa

## 1. Visão Geral

**Expert Pro Training** é um sistema SaaS multi-tenant para gestão de treinamento personalizado.
Cada **Studio** (academia/personal) tem seus próprios trainers (treinadores) e clientes, com isolamento completo de dados.

**Stack:** Next.js 14 (App Router) · Prisma + PostgreSQL · JWT (cookies HttpOnly) · TypeScript
**Deploy:** VPS com PM2 · Build: `prisma generate && next build`
**Config:** `next.config.js` com `ignoreBuildErrors: true` e `puppeteer` externalizado para PDF

---

## 2. Arquitetura Multi-Tenant

```
SuperAdmin (plataforma)
  └── Studio (tenant)
        ├── Users (STUDIO_ADMIN ou TRAINER)
        ├── Clients (alunos)
        ├── Assessments (avaliações)
        ├── Workouts (treinos gerados)
        ├── Lessons (sessões de aula)
        ├── TrainingSessions (sessões iniciadas)
        └── Billing (assinatura, faturas)
```

### Hierarquia de Permissões

| Role | Escopo | Acesso |
|---|---|---|
| **SuperAdmin** | Plataforma | Tudo: studios, planos, billing, fases, backup |
| **STUDIO_ADMIN** | Studio | Gerencia tudo dentro do studio |
| **TRAINER** | Studio (parcial) | Apenas seus próprios clientes/treinos |

> **Regra:** SuperAdmin **com studioId** no token age como o role do `UserStudio` — sem privilégios especiais dentro do studio.

---

## 3. Autenticação e Segurança

### Fluxo JWT (Cookies HttpOnly)

```
POST /api/auth/login → { accessToken (cookie), refreshToken (cookie) }
GET  /api/auth/me → payload do token atual
POST /api/auth/refresh → renova access token
POST /api/auth/logout → revoga tokens
GET  /api/auth/select-studio → troca contexto de studio
```

**Arquivos:**
- `src/lib/auth/jwt.ts` — sign/verify com jsonwebtoken (server-side)
- `src/lib/auth/jwt-edge.ts` — verify com jose (middleware Edge Runtime)
- `src/lib/auth/cookies.ts` — get/set de HttpOnly cookies
- `src/lib/auth/password.ts` — bcryptjs hash/compare
- `src/lib/auth/protection.ts` — `verifyAuth()` — middleware de proteção de rotas API

**Middleware (`src/middleware.ts`):**
- Rotas públicas: `/login`, `/api/auth/*`, `/areaaluno`
- SuperAdmin: `/superadmin/*` — requer `isSuperAdmin`
- App: tudo mais — requer token com `studioId`
- Sem studio selecionado → redireciona para `/select-studio`

### Proteção de Dados (is_locked)

- Blocks e Exercises com `isLocked = true` são **imutáveis** para studios
- Apenas SuperAdmin pode criar/alterar/excluir dados protegidos
- Validado em `src/lib/auth/protection.ts`

---

## 4. Modelos de Dados (Prisma Schema)

### Principais Models

| Model | Descrição | Campos-chave |
|---|---|---|
| `User` | Usuário da plataforma | email, passwordHash, isSuperAdmin |
| `Studio` | Tenant (academia) | name, slug, planId, status, billing fields |
| `UserStudio` | Relação User↔Studio | role: STUDIO_ADMIN \| TRAINER |
| `Client` | Aluno do studio | name, level, objective, currentPhase, gestationalWeek, bodyFat, medidas |
| `Assessment` | Avaliação física | inputJson, resultJson, bodyMetricsJson, computedJson, performanceJson |
| `Workout` | Treino gerado | phase, scheduleJson, templateJson, sessionsCompleted, targetWeeks |
| `Lesson` | Sessão de aula | date, focus, workoutId, trainer↔clients (via LessonClient) |
| `TrainingSession` | Sessão iniciada ao vivo | studentsJson, finalized |
| `Block` | Bloco de exercícios (catálogo) | capacidade, nível, carga axial, isLocked |
| `Exercise` | Exercício individual | muscleGroup, equipment, blockId, isLocked |
| `Rule` | Regra de avaliação | conditionJson, allowedBlocks, blockedBlocks |
| `Plan` | Plano SaaS | pricePerTrainer, features, billingRules |
| `Subscription` | Assinatura studio | status, período, autoRenew |
| `Invoice` | Fatura | total, items, dueDate, paidAt |
| `AuditLog` | Log de auditoria | action, entity, oldData, newData |

### Enums Importantes

```prisma
enum TrainingPhase {
  CONDICIONAMENTO_1, CONDICIONAMENTO_2,
  HIPERTROFIA, FORCA, POTENCIA, RESISTENCIA, METABOLICO,
  HIPERTROFIA_2, FORCA_2, RESISTENCIA_2, METABOLICO_2,
  GESTANTE_T1, GESTANTE_T2, GESTANTE_T3_A, GESTANTE_T3_B
}

enum ClientObjective {
  EMAGRECIMENTO, HIPERTROFIA_OBJ, PERFORMANCE, REABILITACAO, GESTANTE
}

enum UserStudioRole { STUDIO_ADMIN, TRAINER }
enum ClientStatus { ACTIVE, INACTIVE, SUSPENDED }
enum AssessmentStatus { PENDING, IN_PROGRESS, COMPLETED, ARCHIVED }
```

---


## 5. Motor de Fases (Método Expert Training)

### Regra Principal

Cada fase dura **6 semanas**. Exercícios são **fixos** durante toda a fase. Progressão é feita via carga/reps semanais (S1-S6).

### Conceito "Treino Híbrido"

O nome "Híbrido" significa que **cada sessão combina VÁRIOS padrões de movimento**:
- No **Treino PERNA**, existem complementares de PUSH (flexão) e PULL (TRX remada) + Core
- No **Treino EMPURRA**, existem complementares de LOWER (agachamento goblet, avanço) + Core
- No **Treino PUXA**, existem complementares de PUSH (press elas.) e LOWER (afundo) + Core

Isso é **intencional** — o método mescla para que cada sessão trabalhe o corpo todo, com foco principal em um pilar.

### Estrutura padrão de cada treino

Cada treino tem: **Preparação + 3 Blocos + Protocolo Final**
- **Bloco I:** Exercício principal do pilar (com progressão semanal) + complementar + core
- **Bloco II:** Exercício secundário do pilar + complementar de outro pilar + core
- **Bloco III:** Exercício terciário do pilar + complementar integrado + core

**Exceções:** Metabólico tem 2 blocos grandes (5-7 exercícios cada, circuito). Treino 3 do Metabólico é "PILARES/CÁRDIO" com 1 super-bloco intervalado 30"/10".

### Progressão semanal (weeklyReps / weeklyLoad)

Somente o exercício principal do Bloco I tem progressão definida:
- **Hipertrofia:** Reps 12→12→10→10→8→8, Carga 60%→80% (Inic.) ou 70%→85% (Inter./Avanç.)
- **Força:** Reps 5+5 fixo, Carga 85% fixo
- **Condicionamento 2:** Reps 10→10→10→8→8→8, Carga 30%→35%

Exercícios complementares e core mantêm reps fixas durante as 6 semanas.

### Rotação de pilares

3x/semana → PERNA, EMPURRA, PUXA (repete). 4x/semana → PERNA, EMPURRA, PUXA, PERNA; EMPURRA, PUXA, PERNA, EMPURRA...
`lastPillarIndex` garante continuidade entre fases.

### Fases por Objetivo

| Objetivo | Fases disponíveis (após Condicionamento 1 e 2) |
|---|---|
| Emagrecimento | Hipertrofia → Força → Resistência → Metabólico |
| Hipertrofia | Hipertrofia → Força → Hipertrofia II (só Avançado) |
| Performance | Hipertrofia → Força → Potência → Resistência |
| Reabilitação | Hipertrofia → Força |
| Gestante | Gestante T1 → T2 → T3-A → T3-B |

### Fases por Nível

| Nível | Fases existentes no catálogo |
|---|---|
| Condicionamento (todos passam) | Fundamento Híbrido I (4x), Condicionamento Híbrido (3x) |
| Iniciante | Hipertrofia (3x), Força (3-4x), Potência (3-4x), Resistência (3-4x), Metabólico (4x) |
| Intermediário | Hipertrofia (3x), Força (3-4x), Resistência (3-4x), Metabólico (4x) — **SEM Potência** |
| Avançado | Hipertrofia I+II, Força I+II, Resistência I+II, Metabólico I+II — **8 fases** |

**TODOS os clientes** começam pelo Condicionamento 1 → Condicionamento 2, independente do objetivo.

### Catálogo completo: 19 templates

| # | Chave | Nome | Séries |
|---|---|---|---|
| 1 | CONDICIONAMENTO_1 | Fundamento Híbrido I | 4x |
| 2 | CONDICIONAMENTO_2 | Condicionamento Híbrido | 3x |
| 3 | INICIANTE_HIPERTROFIA | Hipertrofia Híbrida Iniciante | 3x |
| 4 | INICIANTE_FORCA | Força Híbrida Iniciante | 3-4x |
| 5 | INICIANTE_POTENCIA | Potência Híbrida Iniciante | 3-4x |
| 6 | INICIANTE_RESISTENCIA | Resistência Fadiga Iniciante | 3-4x |
| 7 | INICIANTE_METABOLICO | Metabólico Iniciante | 4x |
| 8 | INTERMEDIARIO_HIPERTROFIA | Hipertrofia Híbrida Intermediário | 3x |
| 9 | INTERMEDIARIO_FORCA | Força Híbrida Intermediário | 3-4x |
| 10 | INTERMEDIARIO_RESISTENCIA | Resistência Fadiga Intermediário | 3-4x |
| 11 | INTERMEDIARIO_METABOLICO | Metabólico Intermediário | 4x |
| 12 | AVANCADO_HIPERTROFIA | Hipertrofia Híbrida Avançada I | 3x |
| 13 | AVANCADO_FORCA | Força Híbrida Avançada I | 3-4x |
| 14 | AVANCADO_RESISTENCIA | Resistência Fadiga Avançada I | 3-4x |
| 15 | AVANCADO_METABOLICO | Metabólico Avançado I | 4x |
| 16 | AVANCADO_HIPERTROFIA_2 | Hipertrofia Híbrida Avançada II | 3x |
| 17 | AVANCADO_FORCA_2 | Força Híbrida Avançada II | 3-4x |
| 18 | AVANCADO_RESISTENCIA_2 | Resistência Fadiga Avançada II | 3-4x |
| 19 | AVANCADO_METABOLICO_2 | Metabólico Avançado II | 3-4x |

### Protocolos Finais (15 variações)

Super Glut Mini Band · Meta Chest Elas. · Bi-Trocantério Banco · Perdigueiro · Protocolos 2-3x · HIIT Air Bike · HIIT Esteira · Leg Cranks M.B · Matrix D.B Empurra · Meta Back · Meta Chest 1.0 · Triple Threat Fit Ball · Mini Band Coxa Abdução · Super Legs · Super Legs + Meta Chest 2.0 + Meta Back

### Preparação do Movimento (3 variações, iguais para todas as fases)

| Preparação | Foco | Exercícios |
|---|---|---|
| **I** (Perna) | Mobilidade quadril + ativação glúteos | 90/90, Flex. Posterior Band, Flexão Quadril, Mini Band, Siri Lateral+Frontal |
| **II** (Empurra) | Mobilidade torácica + ativação manguito | Anjo Parede, Gato, Torácica, Manguito Elas., Press Elas. |
| **III** (Puxa) | Mobilidade rotação + ativação posterior | Semi Ajoelhado c/ Rotação, Flexão Quadril, Protocolo Elas./Super Band, Manguito 90/90 |

### Arquivos do Motor

| Arquivo | Responsabilidade |
|---|---|
| `src/services/trainingPhases.ts` | Regras: `getAvailablePhases()`, `getNextPhase()`, `isPhaseValid()`, `isPhaseComplete()` |
| `src/services/phaseWorkouts.ts` | **CATÁLOGO COMPLETO** — 19 templates (~1500 linhas). Chave: `{LEVEL}_{PHASE}` |
| `src/services/phaseWorkoutsGestante.ts` | Templates gestante (T1-T3B) |
| `src/services/workoutTemplate.ts` | Helpers para gerar scheduleJson |

### Constantes

```typescript
PHASE_DURATION_WEEKS = 6
DEFAULT_SESSIONS_PER_WEEK = 3
PHASE_CATALOG = Record<string, PhaseWorkoutTemplate>  // Chave: "INICIANTE_HIPERTROFIA"
```
---

## 6. Avaliação Física (Assessment)

### Fluxo Completo

```
1. Criar avaliação (POST /api/studio/assessments)
2. Preencher 5 etapas no frontend
3. Processar (POST /api/studio/assessments/[id]/process)
4. Visualizar resultado + evolução
5. Gerar treino baseado na avaliação
```

### Etapas do Input (`assessments/[id]/input/page.tsx`)

| Step | Conteúdo |
|---|---|
| 1 | Mapa de Dor — 15 regiões corporais, escala 0-10 |
| 2 | Testes de Movimento — 7 padrões (squat, hinge, lunge, push, pull, rotation, gait), score 0-3 |
| 3 | Queixas e Observações — checkboxes + texto livre |
| 4 | **Medidas Corporais** — Peso, Altura, IMC automático, toggle de Método de Composição Corporal (Pollock / InBody H20), Circunferências (12 medidas), Observações |
| 5 | Nível, Objetivo, Fase e Processamento |

### Composição Corporal — Dois Métodos

#### Pollock (Dobras Cutâneas)
- 7 dobras: peito, abdômen, coxa, tríceps, suprailíaca, subescapular, axilar médio
- Cálculo automático Pollock 3 ou 7 dobras (depende de quantas foram preenchidas)
- Resultado: % gordura, massa gorda (kg), massa magra (kg)
- Implementado em `src/services/pollock.ts`

#### InBody H20 (Bioimpedância)
- 13 campos organizados em 3 blocos:
  - **Composição:** fatPct, fatMassKg, leanMassKg, muscleMassKg
  - **Água:** totalWaterL, intracellularWaterL, extracellularWaterL, ecwRatio
  - **Metabolismo:** bmi, bmr, visceralFatLevel, proteinKg, mineralsKg
- Dados inseridos manualmente a partir do relatório do aparelho
- Resultado visual com painel InBody

#### Armazenamento

Tudo fica no campo `bodyMetricsJson` (Json livre no Assessment):

```typescript
{
  weight?: number,
  height?: number,
  bodyFat?: number,       // % calculado ou informado
  compMethod?: 'pollock' | 'inbody',
  skinfolds?: { chest, abdomen, thigh, triceps, suprailiac, subscapular, midaxillary },
  inbody?: { fatPct, fatMassKg, leanMassKg, muscleMassKg, totalWaterL, ... },
  measurements?: { chest, waist, abdomen, hip, arm_right, arm_left, ... },
  notes?: string
}
```

### Comparação / Evolução

**API:** `GET /api/studio/assessments/[id]/evolution`

Compara avaliação atual com a anterior usando `calculateDelta()`:
- **Métricas básicas:** peso, altura, bodyFat
- **Circunferências:** 6 medidas
- **InBody:** 13 campos com delta + trend (up/down/stable)
- **Nível:** detecta progressão ou regressão
- **Insights automáticos:** perda de peso significativa, redução de cintura, aumento de massa muscular (InBody), redução de gordura visceral (InBody)

### Método Juba

`src/services/jubaMethod.ts` — Cálculo de composição corporal e estimativa de meses para atingir meta. Usado no processamento da avaliação para definir recomendações de objetivo.

---

## 7. Geração de Treino

### Fluxo

```
1. Selecionar avaliação processada
2. Escolher fase (validada por nível + objetivo)
3. POST /api/studio/workouts/generate
4. Sistema monta treino a partir do template do catálogo
5. Cria Workout com scheduleJson e templateJson
6. Treino antigo é desativado automaticamente
```

### Arquivo principal: `src/app/api/studio/workouts/generate/route.ts`

**Lógica:**
1. Valida fase para nível/objetivo via `isPhaseValid()`
2. Se levelUp=true, promove cliente para próximo nível
3. **Ramo GESTANTE:** usa `getGestanteWorkout()` e lógica trimestral específica
4. **Ramo EXPERT PRO:** usa `getPhaseWorkout(level, phase)` do catálogo
5. Monta `scheduleJson` com blocos, exercícios, séries, reps, progressão
6. Desativa treino anterior do mesmo cliente
7. Atualiza `client.currentPhase` e `client.lastPillarIndex`
8. Cria `AuditLog`

### Estrutura do scheduleJson

```javascript
{
  treinos: [
    {
      name: "Treino 1: Perna",
      preparation: { mobilidade: [...], ativação: [...] },
      blocks: [
        {
          name: "Bloco I",
          exercises: [
            { name, sets, reps, load, rest, icon, notes }
          ]
        }
      ],
      protocoloFinal: { name, description }
    }
  ],
  weeklyProgression: { reps: [...], load: [...] }
}
```

---

## 8. Sessões de Treinamento (TrainingSession)

### Conceito

Uma **TrainingSession** é uma sessão ao vivo onde o trainer atende múltiplos alunos simultaneamente.

```
POST /api/studio/training-sessions → criar sessão
PUT  /api/studio/training-sessions/[id] → atualizar (adicionar alunos, selecionar treino)
DELETE /api/studio/training-sessions/[id] → excluir
```

**`studentsJson`** armazena array de alunos vinculados:
```json
[{ "clientId": "...", "workoutId": "...", "clientName": "..." }]
```

**Ao finalizar**, o sistema cria `Lesson` para cada aluno e incrementa `workout.sessionsCompleted`.

---

## 9. Sistema de Presença (Check-in / Calendário)

### Frontend: `src/app/(app)/clients/[id]/page.tsx`

- **Calendário interativo** mensal com indicadores visuais de presença
- **CRUD completo:** criar, editar, excluir check-ins manuais
- **API:** `POST/PUT/DELETE /api/studio/clients/[id]/manual-checkin`
- Cada check-in tem: data, horário, treino do dia (opcional)
- **Estatísticas:** sessões feitas/restantes, frequência %, meta semanal
- **Filtros por fase/nível:** resumo de quantas sessões em cada fase

### Dados de presença

Presença é calculada a partir das `Lesson` do cliente (via `LessonClient`):
- `attendedDates` — array de datas que o aluno compareceu
- Fonte: `Lesson.date` onde `LessonClient.attended = true`

---

## 10. Área do Aluno

### Páginas
- `/areaaluno` — Login do aluno (nome + data nascimento)
- `/areaaluno/treino` — Visualização do treino ativo
- **API:** `POST /api/areaaluno/auth`, `GET /api/areaaluno/treino`

Funcionalidade:
- Aluno vê seu treino atual com exercícios, séries, reps, carga
- Sem capacidade de edição — apenas visualização
- Autenticação simplificada (sem email/senha)

---

## 11. SuperAdmin

### Páginas (`/superadmin/*`)

| Página | Descrição |
|---|---|
| `/dashboard` | Visão geral: studios ativos, clientes, treinos, status do sistema |
| `/studios` | CRUD de studios, status, alunos, trainers |
| `/studios/[id]` | Detalhes do studio com sub-rotas para alunos e trainers |
| `/users` | Gestão de usuários da plataforma |
| `/plans` | CRUD de planos SaaS |
| `/payments` | Gestão financeira |
| `/phases` | Visualização das fases disponíveis no catálogo |
| `/backup` | Backup/restore do banco de dados |

### APIs SuperAdmin (`/api/superadmin/*`)

- `dashboard` — métricas globais
- `studios/[id]` — CRUD com sub-rotas para alunos/trainers
- `plans/[id]` — CRUD de planos
- `billing/studios` — gestão financeira
- `backup/[id]/download`, `backup/[id]/restore` — backup e restore
- `migrate-phase-data` — migração de dados de fases
- `clients/[id]` — edição direta de clientes (cross-studio)

---

## 12. Billing (Faturamento)

### Modelo

```
Studio → Subscription → Plan
                      → UsageRecord (por período)
                      → Invoice (fatura)
```

**Preço:** `Plan.pricePerTrainer × trainers ativos`

### Arquivos
- `src/lib/billing/payment-check.ts` — `checkStudioPayment()` verifica se studio está em dia
- `src/app/api/studio/billing/route.ts` — API de billing do studio
- `src/app/api/superadmin/billing/route.ts` — gestão global

### Status do Studio
- `ACTIVE` — operacional
- `GRACE_PERIOD` — atrasado mas ainda funcional
- `SUSPENDED` — bloqueado (middleware impede acesso)
- `CANCELED` — cancelado

---

## 13. API Routes Completa

### Auth (`/api/auth/*`)
```
POST /login, /logout, /refresh, /refresh-redirect, /change-password
GET  /me, /select-studio
```

### Studio (`/api/studio/*`)
```
# Clients
GET/POST   /clients
GET/PUT/DELETE /clients/[id]
GET        /clients/[id]/evolution
POST/PUT/DELETE /clients/[id]/manual-checkin
GET        /clients/[id]/progress
GET        /clients/[id]/workouts

# Assessments
GET/POST   /assessments
GET        /assessments/[id]
POST       /assessments/[id]/process
GET        /assessments/[id]/evolution

# Workouts
GET/POST   /workouts
GET/PUT    /workouts/[id]
POST       /workouts/[id]/edit
POST       /workouts/[id]/exercise-weight
POST       /workouts/[id]/next-session
POST       /workouts/generate
GET        /workouts/phases
GET        /workouts/template

# Training Sessions
GET/POST   /training-sessions
GET/PUT/DELETE /training-sessions/[id]
GET        /training-sessions/active-clients

# Lessons
GET/POST   /lessons
GET/PUT/DELETE /lessons/[id]

# Other
GET/PUT    /settings
POST       /logo
GET        /dashboard, /metrics, /billing
POST       /change-password
GET        /users, /users/[id], /users/check-email
```

### Public (`/api/*`)
```
GET  /blocks
GET  /exercises, /exercises/[id]
GET  /clients/[id], /clients/[id]/evolution, /clients/[id]/goals
GET  /assessments/[id]
POST /assessments/[id]/process
GET  /workouts/[id]
POST /pdf/treino — geração de PDF do treino
```

### Área Aluno (`/api/areaaluno/*`)
```
POST /auth — login simplificado
GET  /treino — treino ativo do aluno
```

---

## 14. Frontend — Páginas do App

### Layout: `(app)/layout.tsx`
Sidebar com navegação por seções. Requer autenticação + studio selecionado.

### Páginas

| Rota | Descrição |
|---|---|
| `/dashboard` | Dashboard do studio com métricas |
| `/clients` | Lista de clientes com busca e filtros |
| `/clients/[id]` | **Perfil do cliente** — dados, calendário de presença, treino ativo, medidas, avaliações |
| `/clients/[id]/edit` | Edição de dados do cliente |
| `/clients/new` | Cadastro de novo cliente |
| `/assessments` | Lista de avaliações |
| `/assessments/new` | Criar nova avaliação |
| `/assessments/[id]/input` | **Formulário de avaliação** (5 etapas com toggle Pollock/InBody) |
| `/assessments/[id]` | **Resultado da avaliação** com evolução, medidas, insights |
| `/workouts` | Lista de treinos |
| `/workouts/generate` | Gerar treino (selecionar fase, nível) |
| `/workouts/[id]` | Detalhes do treino com exercícios |
| `/lessons` | Gestão de aulas/sessões |
| `/presenca` | Painel de presença geral |
| `/team` | Gestão de equipe (trainers) |
| `/settings/studio` | Configurações do studio (logo, nome) |
| `/metodo` | Documentação do método Expert Training |
| `/results` | Resultados e métricas |

---

## 15. Componentes e UI

### Biblioteca de Componentes: `src/components/ui/`
Componentes customizados baseados em Radix UI / shadcn:
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`
- `Button`, `Input`, `Label`, `Select`, `Badge`
- `Dialog`, `Skeleton`, `StatsCard`, `StatsGrid`
- E mais

### Layout: `src/components/layout/`
- Sidebar responsiva com navegação contextual

### Client-specific: `src/components/clients/`
- Componentes reutilizáveis para perfil de cliente

---

## 16. PDF Generation

**Arquivos:**
- `src/lib/pdf-generator.ts` — Geração de PDF do treino usando Puppeteer
- `src/lib/pdf-helper.ts` — Helpers de formatação
- **API:** `POST /api/pdf/treino`

Gera PDF com layout do treino incluindo:
- Dados do aluno (nome, fase, nível)
- Blocos de exercícios com séries/reps/carga
- Preparação/mobilidade
- Protocolo final

---

## 17. Catálogo de Exercícios

**Arquivo:** `src/lib/exerciseCatalog.ts`

Catálogo estático de exercícios pré-definidos com:
- Nome, grupo muscular, equipamento
- Padrão de movimento, complexidade
- Notas técnicas
- Usado como referência no formulário de avaliação e geração de treinos

---

## 18. Stores e Context

### Zustand Stores: `src/stores/`
- State management para dados client-side

### React Context: `src/contexts/`
- Provider de autenticação e studio selecionado

### Hooks: `src/hooks/`
- Hooks customizados para dados reutilizáveis

---

## 19. Gestante (Treinamento Gestacional)

### Fases Gestacionais

| Fase | Período | Características |
|---|---|---|
| GESTANTE_T1 | 1º Trimestre (0-13 sem) | Adaptação, exercícios seguros |
| GESTANTE_T2 | 2º Trimestre (14-27 sem) | Progressão moderada |
| GESTANTE_T3_A | 3º Trimestre A (28-35 sem) | Manutenção, ajustes posturais |
| GESTANTE_T3_B | 3º Trimestre B (36-40 sem) | Preparação parto, exercícios leves |

### Detecção automática
- `getRecommendedGestantePhase(gestationalWeek)` sugere fase baseada na semana gestacional
- `isGestantePhase(phase)` verifica se é fase gestante
- Templates em `src/services/phaseWorkoutsGestante.ts`

### Campos específicos do Client
- `gestationalWeek: Int?` — semana gestacional atual
- `dueDate: DateTime?` — data prevista do parto
- `objective: GESTANTE` — define o ramo gestante

---

## 20. Convenções de Código

### Padrões

1. **APIs:** Sempre usar `verifyAuth()` como primeiro passo. Retorna `{userId, studioId, role}` ou `{error, status}`
2. **Prisma:** Campos com `@map("snake_case")` mas acesso em camelCase no TypeScript
3. **JSON livre:** `inputJson`, `resultJson`, `bodyMetricsJson`, `computedJson`, `scheduleJson`, `templateJson` — todos são `Json?` no schema, tipados localmente via interfaces TypeScript
4. **Audit:** Operações destrutivas (DELETE, UPDATE importante) criam `AuditLog`
5. **is_locked:** Dados do método (blocks, exercises) são protegidos com `isLocked`

### Tipo `as any` (Prisma out of sync)

Quando o Prisma client não foi regenerado com `prisma generate`, campos novos do schema dão erro de tipo. Nesses casos usamos `data: { ... } as any` temporariamente. Solução definitiva: `npx prisma generate` no servidor.

### Build

```bash
npm run build  # = prisma generate && next build
npm run dev    # = next dev (dev server)
```

### Deploy (VPS)

```bash
git pull
npm run build
pm2 restart all
```

---

## 21. Variáveis de Ambiente

Definidas em `src/lib/env.ts`:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Segredo para tokens JWT
- `NEXT_PUBLIC_*` — Variáveis públicas do frontend

---

## 22. Estrutura de Diretórios

```
src/
├── app/
│   ├── (app)/              # Rotas autenticadas do studio
│   │   ├── assessments/    # Avaliações (list, input, result)
│   │   ├── clients/        # Clientes (list, profile, edit, new)
│   │   ├── dashboard/      # Dashboard do studio
│   │   ├── lessons/        # Aulas
│   │   ├── metodo/         # Documentação do método
│   │   ├── presenca/       # Presença
│   │   ├── settings/       # Configurações
│   │   ├── team/           # Equipe
│   │   └── workouts/       # Treinos (list, detail, generate)
│   ├── (superadmin)/       # Rotas SuperAdmin
│   │   └── superadmin/
│   │       ├── dashboard/  # Dashboard global
│   │       ├── studios/    # Gestão de studios
│   │       ├── users/      # Gestão de usuários
│   │       ├── plans/      # Planos SaaS
│   │       ├── phases/     # Visualizador de fases
│   │       ├── payments/   # Pagamentos
│   │       └── backup/     # Backup/restore
│   ├── api/                # API Routes
│   │   ├── auth/           # Autenticação
│   │   ├── studio/         # APIs do studio (scoped)
│   │   ├── superadmin/     # APIs SuperAdmin
│   │   ├── areaaluno/      # APIs da área do aluno
│   │   ├── blocks/         # Blocos de exercícios
│   │   ├── exercises/      # Exercícios
│   │   ├── clients/        # APIs públicas de clientes
│   │   ├── assessments/    # APIs públicas de avaliações
│   │   ├── workouts/       # APIs públicas de treinos
│   │   └── pdf/            # Geração de PDF
│   ├── areaaluno/          # Frontend área do aluno
│   ├── login/              # Página de login
│   └── select-studio/      # Seleção de studio
├── components/
│   ├── ui/                 # Componentes base (Button, Card, etc.)
│   ├── layout/             # Layout (Sidebar)
│   └── clients/            # Componentes específicos de clientes
├── contexts/               # React Context providers
├── hooks/                  # Custom hooks
├── lib/
│   ├── auth/               # Módulo de autenticação
│   ├── backup/             # Módulo de backup
│   ├── billing/            # Módulo de faturamento
│   ├── assessment-constants.ts  # Campos de avaliação
│   ├── constants.ts        # Constantes globais (COOKIES, ROUTES)
│   ├── exerciseCatalog.ts  # Catálogo de exercícios
│   ├── fetchWithAuth.ts    # fetch wrapper com refresh automático
│   ├── pdf-generator.ts    # Geração de PDF
│   ├── prisma.ts           # Instância Prisma singleton
│   ├── translations.ts     # Traduções pt-BR
│   └── utils.ts            # Utilitários gerais
├── services/
│   ├── trainingPhases.ts   # Regras de fases (disponibilidade, progressão)
│   ├── phaseWorkouts.ts    # Catálogo de templates (19 fases × nível)
│   ├── phaseWorkoutsGestante.ts  # Templates gestante
│   ├── pollock.ts          # Cálculo Pollock (3 e 7 dobras)
│   ├── jubaMethod.ts       # Método Juba (composição corporal + metas)
│   └── workoutTemplate.ts  # Helpers de template
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```
