# 🤖 CLAUDE.md - Expert Training System Documentation

> **Documentação Técnica Completa do Sistema Expert Training**  
> Este documento serve como referência para IA assistants e desenvolvedores sobre a arquitetura, implementações e decisões técnicas do sistema.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Multi-Tenant](#arquitetura-multi-tenant)
3. [Sistema de Autenticação](#sistema-de-autenticação)
4. [RBAC - Controle de Acesso](#rbac---controle-de-acesso)
5. [Modelo de Dados](#modelo-de-dados)
6. [APIs Implementadas](#apis-implementadas)
7. [Features Principais](#features-principais)
8. [Motor de Decisão de Treino](#motor-de-decisão-de-treino)
9. [SuperAdmin - Gestão Avançada](#superadmin---gestão-avançada)
10. [Melhorias Recentes (Jan 2026)](#melhorias-recentes-jan-2026)
11. [Fluxos do Sistema](#fluxos-do-sistema)
12. [Padrões e Convenções](#padrões-e-convenções)

---

## 🎯 Visão Geral

### Propósito do Sistema
Sistema SaaS multi-tenant para gerenciamento de studios de treino funcional baseado no **Método Expert Training**, que utiliza avaliação de padrões de movimento e capacidades físicas para prescrição inteligente de treinos.

### Stack Tecnológica
```
Frontend: Next.js 14.2.20 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
Backend: Next.js API Routes + Prisma ORM
Database: PostgreSQL
Auth: JWT (Access + Refresh Tokens)
Validation: Zod
State: Zustand + React Hooks
```

### Características Principais
- ✅ Multi-tenant (múltiplos studios isolados)
- ✅ RBAC por studio (SUPERADMIN, STUDIO_ADMIN, TRAINER)
- ✅ Sistema de avaliação funcional com IA
- ✅ Motor de decisão baseado em regras
- ✅ Prescrição automatizada de treinos
- ✅ Auditoria completa de ações
- ✅ SuperAdmin para gestão de licenças

---

## 🏗️ Arquitetura Multi-Tenant

### Modelo de Tenancy
```
┌─────────────────────────────────────────┐
│         Sistema Multi-Tenant            │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │ Studio A│  │ Studio B│  │ Studio C││
│  ├─────────┤  ├─────────┤  ├─────────┤│
│  │ Admins  │  │ Admins  │  │ Admins  ││
│  │ Trainers│  │ Trainers│  │ Trainers││
│  │ Alunos  │  │ Alunos  │  │ Alunos  ││
│  │ Treinos │  │ Treinos │  │ Treinos ││
│  └─────────┘  └─────────┘  └─────────┘│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      SuperAdmin (Juba)          │   │
│  │  - Gestão de Studios            │   │
│  │  - Licenciamento                │   │
│  │  - Auditoria Global             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Isolamento de Dados
- Cada studio é um tenant isolado
- Usuários podem pertencer a múltiplos studios
- Dados de clientes, avaliações e treinos são segregados por `studioId`
- Queries sempre filtram por `studioId` do contexto

### Estrutura de Pastas
```
src/app/
├── (app)/              # Sistema principal dos Studios
│   ├── clients/        # CRUD de alunos
│   ├── assessments/    # Avaliações funcionais
│   ├── workouts/       # Treinos
│   ├── lessons/        # Aulas coletivas
│   └── dashboard/      # Dashboard do studio
│
├── (superadmin)/       # Sistema do SuperAdmin (Juba)
│   └── superadmin/
│       ├── studios/    # Gestão de studios
│       ├── users/      # Gestão de usuários
│       └── audit/      # Logs de auditoria
│
├── login/              # Autenticação
├── select-studio/      # Seleção de contexto
└── api/                # API Routes
```

---

## 🔐 Sistema de Autenticação

### Fluxo Completo

```
1. LOGIN
   POST /api/auth/login { email, password }
   ↓
   Valida credenciais
   ↓
   Gera JWT SEM studioId (token de contexto)
   ↓
   Retorna { accessToken, refreshToken, needsStudioSelection }

2. VERIFICAÇÃO DE CONTEXTO
   - SuperAdmin? → Redireciona para /superadmin
   - 1 studio? → Gera token COM studioId automaticamente
   - +1 studio? → Redireciona para /select-studio

3. SELEÇÃO DE STUDIO (se necessário)
   POST /api/auth/switch-studio { studioId }
   ↓
   Gera novo JWT COM studioId e role específico do studio
   ↓
   Retorna { accessToken }

4. ACESSO AO SISTEMA
   Middleware valida token e injeta contexto em cada request
```

### Estrutura dos Tokens

**Access Token (JWT)**
```typescript
{
  userId: string
  email: string
  isSuperAdmin: boolean
  studioId?: string      // Presente após seleção de studio
  studioName?: string    // Nome do studio selecionado
  role?: 'STUDIO_ADMIN' | 'TRAINER'  // Role no studio específico
  exp: number
}
```

**Refresh Token**
- Armazenado no banco de dados
- Usado para renovar access tokens expirados
- Pode ser revogado para logout forçado

### Implementação de Segurança

**Middleware (`src/middleware.ts`)**
```typescript
- Valida access token em TODAS as rotas protegidas
- Injeta headers: x-user-id, x-studio-id, x-user-role
- Redireciona para login se não autenticado
- Redireciona para select-studio se sem contexto
```

**Auth Helpers (`src/lib/auth.ts`)**
```typescript
verifyAccessToken()      // Valida e decodifica JWT
getAccessTokenCookie()   // Lê cookie httpOnly
hasStudioContext()       // Verifica se tem studioId no token
```

---

## 🛡️ RBAC - Controle de Acesso

### Hierarquia de Roles

```
SUPERADMIN (Global)
├─ Acesso total ao sistema
├─ Gestão de studios e licenças
├─ Auditoria global
└─ Não vinculado a studios específicos

STUDIO_ADMIN (Por Studio)
├─ Acesso total ao studio
├─ Gerenciar trainers
├─ Gerenciar alunos (todos)
├─ Editar/Excluir qualquer recurso
└─ Visualizar relatórios do studio

TRAINER (Por Studio)
├─ Visualizar todos os alunos do studio
├─ Editar apenas alunos atribuídos
├─ Criar avaliações e treinos
├─ Visualizar avaliações/treinos de todos
└─ NÃO pode excluir alunos
```

### Regras de Permissão Implementadas

#### Alunos (Clients)
```typescript
VIEW:   Todos os trainers e admins veem TODOS os alunos do studio
EDIT:   Apenas trainer atribuído OU admin
DELETE: Apenas STUDIO_ADMIN
```

#### Avaliações (Assessments)
```typescript
VIEW:   Todos os trainers e admins veem TODAS as avaliações
CREATE: Qualquer trainer pode criar para qualquer aluno
EDIT:   Apenas trainer do aluno atribuído OU admin
DELETE: Apenas STUDIO_ADMIN
```

#### Treinos (Workouts)
```typescript
VIEW:   Todos os trainers e admins veem TODOS os treinos
CREATE: Qualquer trainer pode criar para qualquer aluno
EDIT:   Apenas trainer do aluno atribuído OU admin
DELETE: Apenas STUDIO_ADMIN
```

#### Aulas (Lessons)
```typescript
VIEW:   Todos veem todas as aulas
CREATE: Qualquer trainer ou admin
EDIT:   Apenas trainer criador OU admin
DELETE: Apenas STUDIO_ADMIN
```

### Implementação nas APIs

**Exemplo: `/api/clients/[id]` (route.ts)**
```typescript
// GET - Todos podem visualizar
if (!payload || !hasStudioContext(payload)) {
  return 401
}

// PUT - Apenas admin ou trainer responsável
if (payload.role === 'TRAINER' && client.trainerId !== payload.userId) {
  return 403 // "Apenas o trainer responsável pode editar"
}

// DELETE - Apenas admin
if (payload.role !== 'STUDIO_ADMIN') {
  return 403 // "Apenas administradores podem excluir"
}
```

---

## 💾 Modelo de Dados

### Tabelas Core

#### **users**
```prisma
id              String   (PK)
name            String
email           String   @unique
passwordHash    String
isSuperAdmin    Boolean  @default(false)
isActive        Boolean  @default(true)
createdAt       DateTime
updatedAt       DateTime

// Relations
studios         UserStudio[]
refreshTokens   RefreshToken[]
lessons         Lesson[]      // Aulas ministradas
clients         Client[]      @relation("ClientTrainer")
```

#### **studios**
```prisma
id          String       (PK)
name        String
slug        String       @unique
status      StudioStatus @default(ACTIVE)
planId      String?
logoUrl     String?
settings    Json?
createdAt   DateTime
updatedAt   DateTime

// Relations
users       UserStudio[]
clients     Client[]
blocks      Block[]
rules       Rule[]
lessons     Lesson[]
```

#### **user_studios** (Tabela Pivô - CRUCIAL)
```prisma
id          String   (PK)
userId      String   (FK → users)
studioId    String   (FK → studios)
role        Role     (STUDIO_ADMIN | TRAINER)
isActive    Boolean  @default(true)
joinedAt    DateTime @default(now())
updatedAt   DateTime

@@unique([userId, studioId])
@@index([userId])
@@index([studioId])
```

#### **clients** (Alunos)
```prisma
id          String   (PK)
studioId    String   (FK → studios)
trainerId   String?  (FK → users)  // Trainer responsável
name        String
email       String?
phone       String?
birthDate   DateTime?
gender      String?  (M, F, O)

// Dados físicos
height      Decimal?
weight      Decimal?
chest       Decimal?  // Medidas corporais
waist       Decimal?
hip         Decimal?
arm         Decimal?
thigh       Decimal?
calf        Decimal?

// Histórico
history     String?   @db.Text
objectives  String?   @db.Text
notes       String?   @db.Text
goal        String?   // HYPERTROPHY, STRENGTH, etc.

// Status
status      ClientStatus  @default(ACTIVE)
isActive    Boolean       @default(true)
createdAt   DateTime
updatedAt   DateTime

// Relations
studio      Studio
trainer     User?         @relation("ClientTrainer")
assessments Assessment[]
workouts    Workout[]
```

#### **assessments** (Avaliações)
```prisma
id              String   (PK)
clientId        String   (FK → clients)
status          AssessmentStatus
confidence      Float?
functionalPattern String?

// Dados JSON
inputJson       Json?    // Queixas, dor, testes
resultJson      Json?    // Resultado da IA
bodyMetricsJson Json?    // Peso, altura, medidas

createdAt       DateTime
completedAt     DateTime?
updatedAt       DateTime

// Relations
client          Client
```

#### **blocks** (Blocos de Treino)
```prisma
id              String   (PK)
studioId        String   (FK → studios)
name            String
description     String?
category        BlockCategory
capacity        PhysicalCapacity
pattern         FunctionalPattern?
isActive        Boolean
createdAt       DateTime

// Relations
studio          Studio
exercises       Exercise[]
```

#### **workouts** (Treinos)
```prisma
id              String   (PK)
clientId        String   (FK → clients)
createdById     String   (FK → users)
name            String
description     String?
blocksJson      Json     // Array de blocos selecionados
isActive        Boolean
createdAt       DateTime

// Relations
client          Client
createdBy       User
```

#### **lessons** (Aulas / Eventos Operacionais)
```prisma
id          String   (PK)
studioId    String   (FK → studios)
trainerId   String   (FK → users)
startedAt   DateTime
photoUrl    String   // Obrigatório - anti-burla
createdAt   DateTime

// Relations
studio      Studio
trainer     User
clients     LessonClient[]  // Pivot com alunos presentes
```

#### **lesson_clients** (Pivot Aula ↔ Alunos)
```prisma
id          String   (PK)
lessonId    String   (FK → lessons)
clientId    String   (FK → clients)

@@unique([lessonId, clientId])
@@index([lessonId])
@@index([clientId])
```

> **⚠️ Regra de Ouro:**  
> O sistema audita **presença, avaliações e uso do método**,  
> não a execução detalhada de exercícios.

### Enums Importantes

```typescript
enum Role {
  STUDIO_ADMIN
  TRAINER
}

enum StudioStatus {
  ACTIVE
  SUSPENDED
  TRIAL
}

enum ClientStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum AssessmentStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  ARCHIVED
}

enum PhysicalCapacity {
  STRENGTH        // Força
  POWER          // Potência
  RESISTANCE     // Resistência
  MOBILITY       // Mobilidade
  STABILITY      // Estabilidade
  COORDINATION   // Coordenação
}

enum FunctionalPattern {
  SQUAT          // Agachamento
  HINGE          // Dobradiça
  LUNGE          // Afundo
  PUSH           // Empurrar
  PULL           // Puxar
  ROTATION       // Rotação
  GAIT           // Marcha
}

enum BlockCategory {
  WARMUP         // Aquecimento
  MAIN           // Principal
  ACCESSORY      // Acessório
  CONDITIONING   // Condicionamento
  COOLDOWN       // Volta à calma
}
```

---

## 🔌 APIs Implementadas

### Autenticação

**POST `/api/auth/login`**
```typescript
Body: { email: string, password: string }
Response: {
  success: boolean
  accessToken: string
  refreshToken: string
  needsStudioSelection: boolean
  studios?: Array<{ id, name, role }>
}
```

**POST `/api/auth/switch-studio`**
```typescript
Body: { studioId: string }
Response: {
  success: boolean
  accessToken: string  // Novo token com contexto do studio
}
```

**GET `/api/auth/me`**
```typescript
Response: {
  success: boolean
  data: {
    user: { id, name, email, isSuperAdmin }
    studios: Array<UserStudioLink>
    currentStudio: { studioId, studioName, role } | null
  }
}
```

**POST `/api/auth/logout`**
```typescript
Response: { success: boolean }
// Revoga refresh token e limpa cookies
```

### Clientes (Alunos)

**GET `/api/clients`**
```typescript
Query: { search?, page?, pageSize?, trainerId? }
Response: {
  success: boolean
  data: {
    items: Client[]
    total: number
    page: number
    totalPages: number
  }
}
// Todos os trainers veem todos os alunos do studio
```

**POST `/api/clients`**
```typescript
Body: {
  name: string
  email?: string
  phone?: string
  birthDate?: string
  gender?: 'M' | 'F' | 'O'
  height?: number
  weight?: number
  chest?: number
  waist?: number
  hip?: number
  arm?: number
  thigh?: number
  calf?: number
  history?: string
  objectives?: string
  notes?: string
  goal?: string
}
Response: { success: boolean, data: Client }
```

**GET `/api/clients/[id]`**
```typescript
Response: {
  success: boolean
  data: Client & {
    trainer?: { id, name }
    assessments: Assessment[]
    workouts: Workout[]
  }
}
```

**PUT `/api/clients/[id]`**
```typescript
Body: Partial<Client>
Response: { success: boolean, data: Client }
// Apenas trainer responsável ou admin pode editar
```

**DELETE `/api/clients/[id]`**
```typescript
Response: { success: boolean }
// Apenas STUDIO_ADMIN pode excluir
```

### Avaliações

**GET `/api/assessments`**
```typescript
Query: { search?, page?, pageSize?, status? }
Response: {
  success: boolean
  data: {
    items: Assessment[]
    total: number
    totalPages: number
  }
}
```

**POST `/api/assessments`**
```typescript
Body: {
  clientId: string
  inputJson: {
    complaints: string[]
    painMap: Record<string, number>
    movementTests: {
      squat: { score: 0-3, observations: string }
      hinge: { score: 0-3, observations: string }
      // ... outros padrões
    }
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  }
  bodyMetrics?: {
    weight?: number
    height?: number
    measurements?: { chest, waist, hip, arm, thigh, calf }
  }
}
Response: { success: boolean, data: Assessment }
```

**PUT `/api/assessments/[id]`**
```typescript
Body: {
  inputJson?: object
  bodyMetrics?: object
  status?: AssessmentStatus
}
Response: { success: boolean, data: Assessment }
// Auto-atualiza dados do cliente se bodyMetrics fornecido
```

**POST `/api/assessments/[id]/process`**
```typescript
// Processa avaliação através do motor de decisão
Response: {
  success: boolean
  data: {
    functionalPattern: string
    confidence: number
    allowedBlocks: string[]
    blockedBlocks: string[]
    recommendations: string[]
    focus: { primary: string, secondary: string }
  }
}
```

### Treinos

**GET `/api/studio/workouts`**
```typescript
Query: { search?, page?, pageSize?, clientId? }
Response: {
  success: boolean
  data: {
    items: Workout[]
    total: number
  }
}
```

**POST `/api/studio/workouts`**
```typescript
Body: {
  clientId: string
  name: string
  description?: string
  blocks: Array<{
    blockId: string
    order: number
    sets?: number
    reps?: string
    rest?: string
    notes?: string
  }>
}
Response: { success: boolean, data: Workout }
```

### Blocos de Treino

**GET `/api/studio/blocks`**
```typescript
Query: { category?, capacity?, pattern?, isActive? }
Response: {
  success: boolean
  data: Block[]
}
```

**POST `/api/studio/blocks`**
```typescript
Body: {
  name: string
  description?: string
  category: BlockCategory
  capacity: PhysicalCapacity
  pattern?: FunctionalPattern
  exercises: Array<{
    name: string
    description?: string
    videoUrl?: string
    order: number
  }>
}
Response: { success: boolean, data: Block }
```

### SuperAdmin

**GET `/api/superadmin/studios`**
```typescript
Response: {
  success: boolean
  data: Studio[] & {
    _count: { users, clients, assessments }
  }
}
// Apenas SuperAdmin
```

**GET `/api/superadmin/studios/[id]/alunos/[alunoId]`**
```typescript
Response: {
  success: boolean
  data: Client & {
    assessments: Array<{
      inputJson, resultJson, bodyMetricsJson
    }>
    workouts: Workout[]
  }
}
// Para auditoria e licenciamento
```

---

## ⚙️ Features Principais

### 1. Sistema de Avaliação Funcional

> **⚠️ Regra Fundamental:** Avaliações são **IMUTÁVEIS** após processamento.  
> Uma vez que o motor de decisão gera o resultado, a avaliação vira histórico permanente.  
> Novas avaliações devem ser criadas para capturar evolução.

**Componentes:**
- Formulário multi-etapas (queixas → dor → movimentos → nível)
- Mapa de dor visual com intensidade 0-10
- Testes de movimento com scores 0-3
- Captura de medidas corporais

**Dados Coletados:**
```typescript
{
  complaints: string[]           // Queixas do aluno
  painMap: {                     // Mapa de dor por região
    "lower_back": 7,
    "right_knee": 5,
    // ...
  }
  movementTests: {               // Testes de movimento
    squat: { score: 2, observations: "..." }
    hinge: { score: 1, observations: "..." }
    lunge: { score: 3, observations: "..." }
    push: { score: 2, observations: "..." }
    pull: { score: 2, observations: "..." }
    rotation: { score: 1, observations: "..." }
    gait: { score: 3, observations: "..." }
  }
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
}
```

**Auto-atualização de Cliente:**
Quando uma avaliação é salva com novos dados de peso/altura/medidas, o sistema automaticamente atualiza os dados do cliente.

### 2. Motor de Decisão de Treino

**Algoritmo:**
```
1. Análise de Queixas e Dor
   - Identifica regiões problemáticas
   - Calcula intensidade média de dor

2. Análise de Padrões de Movimento
   - Scores dos 7 padrões funcionais
   - Identifica padrão com menor score (pior)
   - Identifica padrão com maior score (melhor)

3. Determinação de Foco
   - PRIMARY FOCUS: Padrão com pior score
   - SECONDARY FOCUS: Segunda pior área

4. Seleção de Blocos
   - PERMITIDOS: Blocos que trabalham o foco primário
   - BLOQUEADOS: Blocos que podem agravar dores

5. Cálculo de Confiança
   - Base: 0.6 (60%)
   - +10% se nível INTERMEDIATE
   - +20% se nível ADVANCED
   - -5% para cada ponto de dor acima de 7
   - -5% se mais de 3 queixas

6. Recomendações
   - Baseadas em dores e limitações
   - Sugestões de progressão
   - Alertas de segurança
```

**Resultado:**
```typescript
{
  functionalPattern: "SQUAT",      // Padrão primário a trabalhar
  confidence: 0.75,                // 75% de confiança
  focus: {
    primary: "Squat Pattern",
    secondary: "Hip Mobility"
  },
  allowedBlocks: ["block-123", "block-456"],
  blockedBlocks: ["block-789"],
  recommendations: [
    "Trabalhar mobilidade de quadril antes de cargas altas",
    "Evitar exercícios com impacto devido a dor no joelho",
    "Progressão gradual no padrão de agachamento"
  ]
}
```

### 3. Montagem de Treinos

**Fluxo:**
1. Trainer acessa perfil do aluno
2. Visualiza última avaliação e recomendações
3. Sistema sugere blocos permitidos
4. Trainer monta sequência de blocos
5. Sistema salva treino com JSON dos blocos

**Estrutura do Treino:**
```typescript
{
  name: "Treino A - Hipertrofia Inferior",
  clientId: "...",
  blocks: [
    {
      blockId: "block-warmup-1",
      order: 1,
      category: "WARMUP",
      sets: 1,
      duration: "10min"
    },
    {
      blockId: "block-squat-main",
      order: 2,
      category: "MAIN",
      sets: 4,
      reps: "8-12",
      rest: "90s",
      notes: "Focar na técnica"
    },
    // ...
  ]
}
```

### 4. Sistema de Auditoria

**Todas as ações são registradas:**
```typescript
{
  userId: string
  studioId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SWITCH_STUDIO'
  entity: 'Client' | 'Assessment' | 'Workout' | 'Block'
  entityId: string
  oldData?: any
  newData?: any
  timestamp: DateTime
}
```

**Acessível por:**
- SuperAdmin: Auditoria global de todos os studios
- Studio Admin: Auditoria do próprio studio

### 5. Sistema de Aulas (Evento Operacional)

> ⚠️ **Importante:** No Expert Training, **aula NÃO é treino**.

A aula é um **evento operacional** utilizado para:
- Registrar presença real de alunos
- Comprovar utilização do método
- Auditar uso do sistema para fins de licenciamento

**Características:**
- Aula pode ser individual ou em grupo
- Não exige registro de exercícios executados
- Não substitui o treino prescrito
- Serve exclusivamente como prova de atendimento

**Estrutura de uma Aula:**
```typescript
{
  id: string
  studioId: string
  trainerId: string
  startedAt: DateTime
  photoUrl: string          // Obrigatório - anti-burla
  clients: Client[]         // Alunos presentes
}
```

### 6. Check-in de Presença com Foto (Anti-Burla)

Toda aula exige obrigatoriamente:
- ✅ Registro de data e hora
- ✅ Identificação do trainer responsável
- ✅ Captura de **foto no início da aula**

**Regras:**
- A foto é vinculada à aula, não ao treino
- Não há registro de execução de exercícios
- A foto serve apenas como comprovação de presença
- Acesso restrito a:
  - STUDIO_ADMIN
  - SUPERADMIN

**Finalidade:**
- Prevenção de burla de licenciamento
- Auditoria de uso real do sistema
- Evidência operacional de atendimento

**Implementação:**
```typescript
// Ao iniciar uma aula
POST /api/lessons
{
  trainerId: string
  clientIds: string[]
  photo: File  // Upload obrigatório
}

// Sistema valida:
- Foto presente e válida
- Trainer ativo no studio
- Clientes existentes
```

### 7. SuperAdmin Dashboard (Auditoria Avançada)

O SuperAdmin possui **visão completa e hierárquica** do sistema:

**Níveis de Visualização:**
```
Global
├─ Studios
│  ├─ Trainers
│  │  ├─ Alunos Atendidos
│  │  ├─ Aulas Ministradas
│  │  └─ Avaliações Realizadas
│  └─ Métricas do Studio
└─ Auditoria Global
```

**Funcionalidades:**
- ✅ Entrar em qualquer studio (drill-down hierárquico)
- ✅ Visualizar trainers vinculados ao studio
- ✅ Visualizar alunos por studio ou por trainer
- ✅ Auditar aulas registradas (com foto de presença)
- ✅ Monitorar avaliações realizadas (dados completos)
- ✅ Identificar padrões de subutilização do sistema
- ✅ Gerenciar status dos studios (ACTIVE, SUSPENDED)

**Navegação Hierárquica:**
```
1. SuperAdmin Dashboard
   → Lista todos os studios

2. Studio Detail
   → Trainers + Alunos + Estatísticas

3. Trainer Detail
   → Alunos atribuídos + Aulas + Avaliações

4. Aluno Detail (Qualquer Studio)
   → Histórico completo de avaliações
   → Presença em aulas
   → Treinos prescritos
   → Dados de evolução
```

**Objetivo:**
- Proteger o licenciamento
- Garantir uso real do método
- Detectar inconsistências operacionais
- Base para modelo de precificação

**Importante para Licenciamento:**
- Conta quantos alunos cada studio tem
- Monitora quantidade de aulas realizadas (com foto)
- Rastreia quantidade de avaliações realizadas
- Identifica trainers ativos vs inativos
- Detecta possíveis fraudes

---

## 🔄 Fluxos do Sistema

### Fluxo de Cadastro de Aluno

```
1. Trainer acessa /clients/new
2. Preenche formulário:
   - Dados pessoais (nome, email, telefone, nascimento, gênero)
   - Dados físicos (altura, peso)
   - Medidas corporais (peitoral, cintura, quadril, braço, coxa, panturrilha)
   - Histórico médico
   - Objetivos
   - Meta principal (hipertrofia, força, etc.)
3. Sistema salva no banco
4. Se trainer: trainerId = userId automaticamente
5. Se admin: pode escolher qual trainer atribuir
6. Redireciona para perfil do aluno
```

### Fluxo de Avaliação Funcional

```
1. Trainer acessa /assessments/new?clientId=xxx
2. ETAPA 1: Queixas
   - Seleciona queixas do aluno (checkboxes)
3. ETAPA 2: Mapa de Dor
   - Clica nas regiões do corpo
   - Define intensidade 0-10 para cada
4. ETAPA 3: Testes de Movimento
   - Para cada padrão funcional:
     * Score 0-3
     * Observações
5. ETAPA 4: Nível e Medidas
   - Nível do aluno
   - Peso atual
   - Medidas corporais (opcional)
6. Sistema salva avaliação com status PENDING
7. Trainer clica "Processar Avaliação"
8. Motor de decisão analisa dados
9. Sistema atualiza com resultJson
10. Status muda para COMPLETED
11. Dados de peso/medidas atualizam automaticamente o cadastro do cliente
```

### Fluxo de Montagem de Treino

```
1. Trainer acessa perfil do aluno
2. Visualiza última avaliação e recomendações
3. Clica em "Criar Treino"
4. Sistema mostra blocos sugeridos (allowedBlocks)
5. Trainer seleciona blocos e define ordem
6. Para cada bloco define:
   - Séries
   - Repetições/tempo
   - Descanso
   - Observações
7. Salva treino
8. Treino fica disponível para o aluno executar
```

### Fluxo de Registro de Aula (Evento Operacional)

```
1. Trainer inicia uma nova aula
2. Sistema solicita:
   - Foto obrigatória (anti-burla)
   - Seleção de alunos presentes
3. Trainer tira foto no momento do início
4. Seleciona alunos que estão presentes
5. Sistema registra:
   - Data/hora do início
   - Trainer responsável
   - Foto com timestamp
   - Lista de alunos presentes
6. Aula é registrada para auditoria
7. Contabilizada para fins de licenciamento
```

**Importante:**
- Aula ≠ Treino executado
- Não há registro de exercícios realizados
- Foco é em presença e utilização do método
- Base para modelo de precificação por uso real

---

## � Conceitos Fundamentais

### Separação: Treino × Aula × Execução

**É fundamental entender a diferença:**

| Conceito | O que é | Quando ocorre | Registro |
|----------|---------|---------------|----------|
| **Treino (Workout)** | Prescrição de exercícios | Criado pelo trainer | Blocos, séries, reps |
| **Aula (Lesson)** | Evento de atendimento | No momento do atendimento | Foto + presença |
| **Execução** | Realização dos exercícios | Durante a aula | NÃO registrado |

**Regra de Ouro:**
```
Treino = O QUE fazer (prescrição)
Aula = QUANDO foi feito (comprovação)
Execução = Detalhes de como foi feito (NÃO rastreado)
```

**Por que não rastrear execução?**
1. **Foco operacional:** Sistema audita método, não microgerencia
2. **Proteção jurídica:** Evita responsabilidade sobre execução
3. **Praticidade:** Trainer foca no atendimento, não em burocracia
4. **Licenciamento:** Apenas uso real importa para cobrança

**Implicações técnicas:**
- Aula não tem referência a workout específico
- Foto da aula é evidência suficiente
- Trainer pode prescrever treino sem registrar aula
- Aula pode acontecer sem treino prescrito (avaliação, orientação)

---

## �📐 Padrões e Convenções

### Estrutura de Arquivos

**APIs:**
```
/api/
  entity/
    route.ts          → GET /api/entity, POST /api/entity
    [id]/
      route.ts        → GET, PUT, DELETE /api/entity/[id]
      action/
        route.ts      → POST /api/entity/[id]/action
```

**Páginas:**
```
/(app)/
  entity/
    page.tsx          → Lista
    new/
      page.tsx        → Criar
    [id]/
      page.tsx        → Visualizar
      edit/
        page.tsx      → Editar
```

### Nomenclatura

**Variáveis e Funções:**
- camelCase para variáveis e funções
- PascalCase para componentes React
- UPPER_CASE para constantes

**Banco de Dados:**
- snake_case para colunas
- camelCase no Prisma schema
- Prefixo `is` para booleanos: `isActive`, `isSuperAdmin`

**APIs:**
- RESTful quando possível
- Verbos HTTP corretos (GET, POST, PUT, DELETE)
- Retorno sempre: `{ success: boolean, data?: any, error?: string }`

### Validação

**Todas as APIs usam Zod:**
```typescript
const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido').optional(),
  // ...
})

const validation = schema.safeParse(body)
if (!validation.success) {
  return error(validation.error.errors[0].message)
}
```

### Tratamento de Erros

```typescript
try {
  // operação
  return NextResponse.json({ success: true, data })
} catch (error) {
  console.error('Operation error:', error)
  return NextResponse.json(
    { success: false, error: 'Erro interno' },
    { status: 500 }
  )
}
```

### Auditoria

**Sempre criar log após operações importantes:**
```typescript
await prisma.auditLog.create({
  data: {
    userId: payload.userId,
    studioId: payload.studioId,
    action: 'UPDATE',
    entity: 'Client',
    entityId: client.id,
    oldData: existingClient,
    newData: updatedClient,
  },
})
```

---

## 🎨 UI/UX Patterns

### Componentes shadcn/ui Utilizados

- `Button` - Ações principais
- `Input` - Campos de texto
- `Textarea` - Textos longos
- `Select` - Seleções com opções
- `Card` - Containers de conteúdo
- `Dialog` - Modals
- `Table` - Listagens
- `Badge` - Status e tags
- `Skeleton` - Loading states
- `Progress` - Barras de progresso
- `Tabs` - Navegação em abas

### Feedback Visual

**Estados:**
- Loading: Skeleton ou spinner
- Success: Alert verde com mensagem
- Error: Alert vermelho com mensagem
- Empty: Mensagem amigável com ação

**Badges:**
- Status: ACTIVE (verde), INACTIVE (cinza), SUSPENDED (vermelho)
- Role: ADMIN (azul), TRAINER (roxo)
- Level: BEGINNER (verde), INTERMEDIATE (amarelo), ADVANCED (vermelho)

---

## 🔍 Debugging e Logs

### Logs do Prisma

```env
# .env
DATABASE_URL="..."
DEBUG="prisma:query"  # Ver todas as queries SQL
```

### Console Logs nas APIs

Todas as APIs têm:
```typescript
console.error('Operation error:', error)
```

### Middleware Logs

```typescript
console.log('🔒 Middleware check for:', pathname)
console.log('🔓 Token verified: VALID')
```

---

## 🚀 Deploy e Ambiente

### Variáveis de Ambiente Obrigatórias

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
NEXT_PUBLIC_API_URL="http://localhost:3000"
NODE_ENV="development"
```

### Scripts Úteis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run start        # Servidor produção
npm run db:push      # Sync schema com DB
npm run db:seed      # Popular dados iniciais
npm run db:studio    # UI do Prisma
```

---

## 📊 Métricas e Monitoramento

### KPIs do Sistema

**Por Studio:**
- Total de alunos ativos
- Total de avaliações realizadas
- Total de treinos criados
- Trainers ativos
- Taxa de uso do sistema

**Global (SuperAdmin):**
- Total de studios ativos
- Total de usuários
- Total de avaliações processadas
- Uptime do sistema

---

## 🔮 Próximas Features

### Em Desenvolvimento
- [ ] Sistema de aulas coletivas completo
- [ ] Agenda de treinos
- [ ] Check-in de alunos
- [ ] Relatórios de evolução

---

## 🚀 SuperAdmin - Gestão Avançada

O módulo SuperAdmin foi completamente aprimorado em Janeiro 2026 para fornecer controle total sobre exercícios e regras do sistema.

### Exercícios SuperAdmin

#### Funcionalidades Implementadas
- **Campos de Prescrição**: type, defaultSets, defaultReps, defaultTime, defaultRest
- **Notas Técnicas**: Campo technicalNotes para instruções detalhadas
- **Ordenação por Bloco**: Campo orderInBlock para sequenciamento
- **Visualização por Bloco**: Filtros e agrupamento por bloco de treino
- **Importação em Lote**: Upload de CSV com validação completa
- **Estatísticas Avançadas**: Métricas de uso e popularidade

#### API Enhancements
```typescript
// Novos campos no modelo Exercise
interface Exercise {
  type: 'strength' | 'cardio' | 'flexibility' | 'functional'
  defaultSets?: number
  defaultReps?: number
  defaultTime?: number
  defaultRest?: number
  technicalNotes?: string
  orderInBlock?: number
  // ... outros campos existentes
}
```

### Regras SuperAdmin

#### Motor de Decisão Avançado
- **Condições Múltiplas**: Suporte a AND/OR com validação
- **Campos de Assessment**: 19 campos disponíveis (idade, IMC, objetivos, etc.)
- **Operadores Avançados**: Comparações numéricas, arrays, objetos
- **Teste ao Vivo**: Endpoint para testar regras com dados mock
- **Prioridades Drag & Drop**: Reordenação visual de prioridades

#### Campos de Assessment Disponíveis
```typescript
const ASSESSMENT_FIELDS = [
  'age', 'gender', 'experienceLevel', 'fitnessGoal',
  'trainingFrequency', 'preferredDuration', 'bmi',
  'bodyFatPercentage', 'vo2Max', 'restingHeartRate',
  'maxHeartRate', 'bloodPressure', 'injuries',
  'medications', 'sleepQuality', 'stressLevel',
  'motivationLevel', 'availableEquipment', 'limitations'
]
```

#### Operadores por Tipo
- **Numérico**: ==, !=, >, >=, <, <=
- **Select**: ==, !=
- **Array**: includes, not_includes, any_of, none_of, length_eq, length_gt
- **Objeto**: has_property, property_equals, property_gt, property_lt

---

## 🆕 Melhorias Recentes (Jan 2026)

### 1. API de Exercícios Aprimorada

#### Novos Endpoints
```typescript
// GET /api/exercises - Estatísticas incluídas
{
  exercises: Exercise[],
  stats: {
    totalExercises: number,
    exercisesByType: Record<string, number>,
    avgUsagePerExercise: number,
    mostUsedExercise: {
      name: string,
      usageCount: number
    }
  }
}

// Validações adicionadas
- Verificação de códigos de bloco válidos
- Validação de valores padrão de prescrição
- Notas técnicas obrigatórias para exercícios complexos
```

### 2. Sistema de Regras Revolucionado

#### Novo Modelo de Regra
```typescript
interface Rule {
  id: string
  name: string
  description?: string
  conditions: RuleCondition[]
  thenAction: {
    type: 'SET_NEXT_BLOCK'
    blockCode: string
  }
  isActive: boolean
  priority: number
  tags?: string[]
  usageCount?: number
  lastUsed?: string
}

interface RuleCondition {
  id: string
  field: string
  operator: string
  value: string | number
  logicalOperator?: 'AND' | 'OR'
}
```

#### API de Teste de Regras
```typescript
// POST /api/superadmin/rules/test
{
  age: 25,
  gender: 'M',
  experienceLevel: 'beginner',
  fitnessGoal: 'muscle_gain',
  // ... outros campos
}

// Response
{
  results: [{
    ruleId: string,
    ruleName: string,
    matched: boolean,
    conditions: [{
      field: string,
      expected: any,
      actual: any,
      matched: boolean
    }],
    nextBlockCode?: string
  }]
}
```

### 3. RuleConditionBuilder Component

Componente standalone para construção visual de condições:

#### Características
- **Validação em Tempo Real**: Feedback instantâneo sobre condições
- **Expansão/Contração**: Interface limpa com detalhes sob demanda
- **Exemplos Contextuais**: Sugestões de valores para cada campo
- **Preview da Regra**: Visualização textual das condições
- **Operadores Inteligentes**: Operadores disponíveis baseados no tipo do campo

```typescript
// Uso do componente
<RuleConditionBuilder 
  conditions={ruleConditions}
  onChange={setRuleConditions}
/>
```

### 4. Interface Drag & Drop para Prioridades

#### Implementação
- Biblioteca: @hello-pangea/dnd
- Endpoint: PUT /api/superadmin/rules/priorities
- Funcionalidade: Reordenação visual de regras por prioridade

### 5. Sistema de Estatísticas Avançado

#### Métricas de Exercícios
- Total de exercícios por tipo
- Uso médio por exercício
- Exercício mais utilizado
- Distribuição por blocos

#### Métricas de Regras
- Taxa de ativação de regras
- Uso médio por regra
- Atividade recente
- Análise de performance

### 6. Validações e Auditoria

#### Validações Implementadas
```typescript
// Validação de condições de regra
const validateCondition = (condition: RuleCondition) => {
  // Verifica campo obrigatório
  // Valida operador para tipo do campo
  // Confirma formato do valor
  // Testa consistência lógica
}

// Validação de bloco existente
const validateBlockCode = async (blockCode: string) => {
  // Confirma existência do bloco
  // Verifica se bloco está ativo
  // Valida permissões de acesso
}
```

#### Auditoria Completa
- Log de criação/edição/exclusão de regras
- Histórico de alterações de prioridades
- Rastreamento de uso de regras
- Métricas de performance do motor de decisão

### 7. Melhorias na UX/UI

#### Exercícios
- **Interface Tabbed**: Separação clara entre listagem, estatísticas e importação
- **Filtros Avançados**: Por tipo, bloco, status de atividade
- **Cards de Estatísticas**: Visão geral rápida dos dados
- **Formulário Aprimorado**: Campos de prescrição organizados em grupos lógicos

#### Regras
- **Construtor Visual**: Interface intuitiva para criação de condições
- **Teste Integrado**: Sheet lateral para teste de regras com dados mock
- **Análises**: Dashboard completo com métricas e gráficos
- **Gestão de Prioridades**: Drag & drop para reordenação

---

### Arquivos Importantes Adicionados/Modificados (Jan 2026)
```
src/app/api/exercises/route.ts - API aprimorada com prescrições
src/app/api/exercises/[id]/route.ts - CRUD com validações
src/app/api/superadmin/rules/route.ts - Sistema de regras completo
src/app/api/superadmin/rules/test/route.ts - Teste de regras
src/app/api/superadmin/rules/priorities/route.ts - Gestão de prioridades
src/app/(superadmin)/superadmin/exercises/page.tsx - Interface redesenhada
src/app/(superadmin)/superadmin/rules/page.tsx - Interface completamente nova
src/components/RuleConditionBuilder.tsx - Componente standalone
```

### 8. Sistema de Evolução de Clientes (Jan 2026)

#### Funcionalidades Implementadas
- **API de Evolução**: `/api/studio/clients/[id]/evolution`
- **Cálculo de Deltas**: Comparação baseline vs atual para todas as métricas
- **Nível de Condicionamento**: Tradução e exibição de níveis (Iniciante, Intermediário, Avançado)
- **Indicadores Visuais**: Cores neutras (ciano) para métricas ambíguas
- **Período de Acompanhamento**: Exibição em dias ou semanas
- **Insights Automáticos**: Análise de tendências e recomendações

#### Estrutura de Dados
```typescript
interface EvolutionData {
  hasEvolution: boolean
  baseline: { date: string, assessmentId: string }
  current: { date: string, assessmentId: string }
  period: {
    daysBetween: number
    weeksBetween: number
    totalAssessments: number
  }
  body: {
    weight: MetricEvolution
    height: MetricEvolution
    bodyFat: MetricEvolution
    measurements: {
      chest: MetricEvolution
      waist: MetricEvolution
      hip: MetricEvolution
      arm: MetricEvolution
      thigh: MetricEvolution
      calf: MetricEvolution
    }
  }
  level: {
    baseline: string
    current: string
    improved: boolean
    regressed: boolean
  }
  insights: string[]
}
```

#### Lógica de Cores
- **Verde/Vermelho**: Apenas para cintura (redução = positivo)
- **Ciano (Neutro)**: Todas as outras circunferências (pode ser gordura ou massa)
- **Peso/Gordura**: Cores interpretativas baseadas no objetivo

### 9. Gestão de Treinos Aprimorada (Jan 2026)

#### Melhorias Implementadas
- **Botões de Ação na Listagem**: Download PDF e Excluir diretamente da lista
- **Hard Delete**: Exclusão permanente do banco de dados (não soft delete)
- **Refresh Automático**: Atualização da lista após exclusão
- **Confirmação de Segurança**: Aviso de ação irreversível
- **Download PDF**: Abertura em nova aba para impressão

#### Endpoints Modificados
```typescript
// DELETE /api/studio/workouts/[id]
// Antes: UPDATE isActive = false (soft delete)
// Agora: DELETE FROM workouts (hard delete)

// GET /api/workouts
// Antes: Filtrava por isActive = true
// Agora: Sem filtro (hard delete elimina registros)
```

#### Componentes Atualizados
```
src/app/(app)/workouts/page.tsx - Botões de ação na listagem
src/app/api/studio/workouts/[id]/route.ts - Hard delete
src/app/api/workouts/route.ts - Remoção de filtro isActive
```

### 10. Edição de Clientes Melhorada (Jan 2026)

#### Funcionalidades
- **Página de Edição Full-Screen**: Substituição de modal por página dedicada
- **Seleção de Personal Responsável**: Dropdown para atribuir/alterar trainer
- **Exibição de Meta**: Meta principal visível nos detalhes do aluno
- **Botão WhatsApp**: Link direto para contato via WhatsApp
- **Sincronização de Dados**: Atualização automática de medidas corporais

#### Arquivos Modificados
```
src/app/(app)/clients/[id]/page.tsx - Exibição de meta e WhatsApp
src/app/(app)/clients/[id]/edit/page.tsx - Seleção de trainer
src/app/api/studio/users/route.ts - Lista de trainers
```

### Backlog
- [ ] App mobile para alunos
- [ ] Integração com wearables
- [ ] Gamificação
- [ ] Sistema de mensagens
- [ ] Pagamentos integrados
- [ ] Exportação de relatórios em PDF
- [ ] API GraphQL para consultas complexas
- [ ] Sistema de notificações push
- [ ] Integração com calendários externos

---

## 📚 Recursos Adicionais

### Documentação Relacionada
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Zod](https://zod.dev)
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)

### Convenções do Projeto
- Sempre atualizar este documento ao adicionar features
- Comentar código complexo com JSDoc
- Criar testes para lógica crítica
- Documentar mudanças no schema no Prisma
- Usar TypeScript strict mode
- Seguir padrões do shadcn/ui para componentes

---

**Última Atualização:** Janeiro 2026  
**Versão do Sistema:** 2.0.0 - SuperAdmin Enhanced  
**Status:** ✅ Todas as melhorias implementadas e testadas
**Mantido por:** Time Expert Training
