# 🏋️ Expert Training - Método Expert

Sistema SaaS Multi-Tenant para treino funcional híbrido baseado em padrões de movimento e capacidades físicas.

> **📖 Para documentação técnica completa, consulte [CLAUDE.md](./CLAUDE.md)**

## 🎯 Sobre o Projeto

O Expert Training é um sistema completo de gerenciamento para studios de treino funcional que utiliza avaliação de padrões de movimento e um motor de decisão baseado em IA para prescrição inteligente de treinos personalizados.

### Características Principais

- ✅ **Multi-tenant**: Múltiplos studios isolados com dados segregados
- ✅ **RBAC Granular**: Controle de acesso por studio (SuperAdmin, Admin, Trainer)
- ✅ **Avaliação Funcional**: Sistema completo de avaliação de movimento
- ✅ **Motor de Decisão**: IA que analisa avaliações e sugere treinos
- ✅ **Auditoria Total**: Rastreamento de todas as ações do sistema
- ✅ **SuperAdmin**: Gestão centralizada de licenças e studios

## 🚀 Stack

- **Framework:** Next.js 14.2.20 (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma
- **Autenticação:** JWT (access + refresh tokens)
- **Estilização:** Tailwind CSS + shadcn/ui
- **Validação:** Zod
- **Estado:** React Hooks + Zustand
- **Gráficos:** Recharts

## ✨ Features Implementadas

### 🔐 Autenticação e Autorização
- [x] Sistema JWT com access e refresh tokens
- [x] Login multi-studio com seleção de contexto
- [x] RBAC completo (SuperAdmin, Studio Admin, Trainer)
- [x] Middleware de autenticação em todas as rotas
- [x] Controle de permissões por recurso

### 👥 Gestão de Alunos
- [x] CRUD completo de alunos
- [x] Dados pessoais, físicos e medidas corporais
- [x] Medidas **bilaterais**: braços, antesbraços, coxas, panturrilhas, abdômen
- [x] Histórico médico e objetivos
- [x] **Meta principal**: goalType (WEIGHT_LOSS, MUSCLE_GAIN, RECOMP, PERFORMANCE, HEALTH) + peso-meta
- [x] Atribuição de trainers responsáveis
- [x] Visualização compartilhada entre trainers
- [x] Restrições de edição e exclusão por role

### 📊 Evolução & Método Expert Training (Juba)
- [x] **Cálculo de composição corporal**: massa magra, gordura em kg e %
- [x] **Ratio lean:fat** com alvo diferenciado (homem 6:1 / mulher 4:1)
- [x] **Projeção de ganho**: meses estimados para atingir a estrutura ideal
- [x] **Dashboard Recharts**: LineChart, BarChart, RadarChart, medidas ao longo do tempo
- [x] **Card de deltas**: início vs atual (peso, % gordura, massa magra, gordura kg)
- [x] **Insights automáticos** gerados pela API
- [x] **Formulário de meta** integrado na página do aluno

### 📋 Avaliações Funcionais
- [x] Formulário multi-etapas (queixas → dor → movimentos → nível)
- [x] Mapa de dor visual com intensidade 0-10
- [x] Testes dos 7 padrões de movimento (score 0-3)
- [x] Captura de medidas corporais
- [x] Auto-atualização dos dados do cliente
- [x] Visualização formatada dos resultados

### 🧠 Motor de Decisão
- [x] Análise de queixas e dores
- [x] Análise de padrões de movimento
- [x] Determinação de foco primário e secundário
- [x] Cálculo de confiança da prescrição
- [x] Sugestão de blocos permitidos/bloqueados
- [x] Recomendações personalizadas

### 💪 Sistema de Treinos
- [x] Criação de blocos de treino
- [x] Categorização por capacidade física
- [x] Montagem de treinos com blocos
- [x] Visualização de treinos por aluno
- [x] Gestão de exercícios dentro dos blocos

### 📊 SuperAdmin
- [x] Dashboard de todos os studios
- [x] Visualização detalhada de alunos (qualquer studio)
- [x] Auditoria de avaliações e resultados
- [x] Monitoramento para licenciamento
- [x] Gestão de status dos studios

### 🔍 Auditoria
- [x] Log de todas as ações críticas
- [x] Rastreamento por usuário e studio
- [x] Histórico de alterações (oldData/newData)
- [x] Acesso diferenciado por role

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (páginas e rotas)
│   ├── (app)/             # Grupo de rotas do sistema principal
│   │   └── app/           # /app/* - Sistema dos Studios
│   ├── (superadmin)/      # Grupo de rotas do SuperAdmin
│   │   └── superadmin/    # /superadmin/* - Sistema do Juba
│   ├── login/             # /login
│   ├── select-studio/     # /select-studio
│   └── layout.tsx         # Layout raiz
├── components/
│   └── ui/                # Componentes shadcn/ui
├── hooks/                 # React hooks customizados
├── lib/                   # Utilitários e configurações
│   ├── constants.ts       # Constantes globais
│   ├── env.ts            # Variáveis de ambiente
│   ├── prisma.ts         # Cliente Prisma singleton
│   └── utils.ts          # Funções utilitárias
├── stores/               # Zustand stores
│   └── auth-store.ts     # Estado de autenticação
└── types/                # Definições TypeScript
    └── index.ts          # Tipos centralizados
```

## 🗂️ Modelo de Dados

### Regra Fundamental
- ❌ Usuário **NÃO** pertence a um único studio
- ✅ Usuário pode pertencer a **VÁRIOS** studios
- ✅ O papel (role) é **POR STUDIO**, não global

### Tabelas Principais
- `users` - Usuários do sistema
- `studios` - Studios (tenants)
- `user_studios` - **Tabela pivô** (vínculo usuário-studio com role)
- `clients` - Clientes/alunos dos studios
- `assessments` - Avaliações funcionais
- `blocks` - Blocos de treino (baseados em capacidades físicas)
- `rules` - Regras do motor de decisão (IF/THEN)
- `workouts` - Treinos montados
- `plans` - Planos de assinatura

## 🔐 Fluxo de Autenticação

```
1. LOGIN → JWT sem studioId
2. Verificação:
   - SuperAdmin? → /superadmin
   - 1 studio? → Token com studioId automático
   - +1 studio? → /select-studio
3. Token com contexto → Acesso ao sistema
```

### Estrutura do Token
```typescript
{
  userId: string
  email: string
  isSuperAdmin: boolean
  studioId?: string           // Após seleção
  studioName?: string
  role?: 'STUDIO_ADMIN' | 'TRAINER'
}
```

## 🛡️ Controle de Acesso (RBAC)

### Hierarquia
```
SUPERADMIN
├─ Acesso total ao sistema
├─ Gestão de studios e licenças
└─ Auditoria global

STUDIO_ADMIN (por studio)
├─ Gerenciar trainers e alunos
├─ Editar/Excluir qualquer recurso
└─ Relatórios do studio

TRAINER (por studio)
├─ Visualizar todos os alunos do studio
├─ Editar apenas alunos atribuídos
├─ Criar avaliações e treinos
└─ NÃO pode excluir
```

### Regras de Permissão

| Recurso | VIEW | CREATE | EDIT | DELETE |
|---------|------|--------|------|--------|
| **Alunos** | Todos | Todos | Responsável/Admin | Admin |
| **Avaliações** | Todos | Todos | Responsável/Admin | Admin |
| **Treinos** | Todos | Todos | Responsável/Admin | Admin |
| **Aulas** | Todos | Todos | Criador/Admin | Admin |

## 🛠️ Setup do Projeto

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar ambiente
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

### 3. Subir o banco PostgreSQL
```bash
# Com Docker:
docker run --name expert-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=expert_training -p 5432:5432 -d postgres:15
```

### 4. Rodar migrations e seed
```bash
npm run db:push
npm run db:seed
```

### 5. Iniciar desenvolvimento
```bash
npm run dev
```

## 📝 Credenciais de Acesso

> ⚠️ **Segurança:** As credenciais de acesso ao sistema não são documentadas aqui por questões de segurança.
> 
> Para obter acesso ao ambiente de desenvolvimento/homologação, contate o administrador do sistema.
> Em produção, utilize sempre senhas fortes e únicas — altere as senhas padrão imediatamente após o primeiro login.

## 🧠 Motor de Decisão

Sistema de IA para prescrição inteligente de treinos:

**Input da Avaliação:**
- Queixas do aluno
- Mapa de dor (0-10 por região)
- Testes de movimento (7 padrões, score 0-3)
- Nível (iniciante/intermediário/avançado)

**Processo de Análise:**
1. Identifica padrão com pior desempenho (foco primário)
2. Identifica segunda área problemática (foco secundário)
3. Calcula confiança baseada em dores e limitações
4. Sugere blocos permitidos e bloqueados
5. Gera recomendações personalizadas

**Output:**
```typescript
{
  functionalPattern: "SQUAT",
  confidence: 0.75,
  focus: {
    primary: "Squat Pattern",
    secondary: "Hip Mobility"
  },
  allowedBlocks: ["block-123", "block-456"],
  blockedBlocks: ["block-789"],
  recommendations: [
    "Trabalhar mobilidade de quadril...",
    "Evitar impacto devido a dor no joelho..."
  ]
}
```

## 📊 Modelo de Dados

### Principais Tabelas

**users** → Usuários do sistema  
**studios** → Studios (tenants)  
**user_studios** → **Tabela pivô** (usuário ↔ studio com role)  
**clients** → Alunos dos studios  
**assessments** → Avaliações funcionais  
**blocks** → Blocos de treino  
**workouts** → Treinos montados  
**audit_logs** → Auditoria de ações

> ⚠️ **Regra fundamental:** Usuários podem pertencer a múltiplos studios. O role é definido POR STUDIO na tabela `user_studios`.

### Dados do Cliente

```typescript
Client {
  // Pessoais
  name, email, phone, birthDate, gender
  
  // Físicos
  height, weight
  chest, waist, hip, arm, thigh, calf
  
  // Treino
  history, objectives, notes, goal
  trainerId  // Trainer responsável
}
```

## 📌 Status do Projeto

### ✅ Implementado
- Sistema de autenticação completo
- RBAC multi-tenant funcional
- CRUD de alunos com medidas corporais bilaterais
- Sistema de avaliação funcional
- Motor de decisão de treino
- Montagem de treinos com blocos
- SuperAdmin dashboard
- Sistema de auditoria
- Auto-atualização de dados do cliente
- **Evolução de clientes** (Jan 2026)
- **Gestão aprimorada de treinos** (Jan 2026)
- **Edição full-screen de clientes** (Jan 2026)
- **Indicadores visuais de evolução** (Jan 2026)
- **Geração de PDF profissional com Puppeteer** (Jan 2026)
- **Método Expert Training (Juba)**: composição corporal + ratio lean:fat + projeções (Fev 2026)
- **Dashboard Recharts**: linha, barra, radar, selector de medidas (Fev 2026)
- **Medidas bilaterais**: braços, antesbraços, coxas, panturrilhas, abdômen (Fev 2026)
- **Formulário de metas**: goalType + goalWeight por aluno (Fev 2026)
- **Botao de ação flutuante (FAB)**: visível em smartphone E desktop (Fev 2026)

### 🔄 Em Desenvolvimento
- Sistema completo de aulas coletivas
- Agenda de treinos
- Check-in de alunos

### 📋 Backlog
- App mobile para alunos
- Integração com wearables
- Gamificação
- Sistema de mensagens
- Pagamentos integrados

## 📚 Documentação

- **[CLAUDE.md](./CLAUDE.md)** - Documentação técnica completa para desenvolvedores e IA assistants
- **[Prisma Schema](./prisma/schema.prisma)** - Modelo de dados completo
- **APIs** - Documentadas em cada route handler

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Envie um pull request
5. **Importante:** Atualize o CLAUDE.md ao adicionar novas features

## 📞 Suporte

Para dúvidas sobre o sistema, consulte:
1. Este README para visão geral
2. [CLAUDE.md](./CLAUDE.md) para detalhes técnicos
3. Código comentado nas implementações complexas

---

**Desenvolvido para o Método Expert Training** 🎯
