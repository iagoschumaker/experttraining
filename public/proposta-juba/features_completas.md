# Kinex Performance — Mapa Completo de Features

> Sistema SaaS para Personal Trainers e Studios de Treinamento Personalizado

---

## 🏠 Dashboard

- KPIs em tempo real: total de alunos, avaliações, treinos ativos, treinos criados
- Alertas de **reavaliação pendente** (alunos que finalizaram o ciclo sem reavaliar)
- **Aniversariantes do dia** — banner com destaque para alunos fazendo aniversário hoje
- **Aniversários próximos (30 dias)** — grid com contagem regressiva
- Clientes recentes cadastrados
- Avaliações físicas recentes
- Atalhos rápidos: Novo Aluno / Nova Avaliação / Ver Treinos

---

## 👥 Alunos (Clients)

### Listagem
- Busca por nome, email ou telefone (com debounce)
- Filtros por status (ativo/inativo), nível, objetivo
- Paginação
- Cards com avatar inicial, nível, objetivo, data de nascimento

### Cadastro / Edição
- Nome, email, telefone, CPF, data de nascimento, sexo
- Foto de perfil (upload)
- Objetivos, histórico de saúde
- Nível (iniciante / intermediário / avançado)
- Fase atual de treinamento
- Gestor/personal responsável

### Perfil do Aluno
- Histórico completo de avaliações físicas
- Treinos vinculados (ativos e encerrados)
- Histórico de presença
- Gráficos de evolução: peso, % gordura, IMC, circunferências
- Check-in manual pelo personal
- Subscrição de plano (plano de aluno vinculado)

### Evolução
- Comparação entre avaliações consecutivas (delta + tendência)
- Gráfico de linha para métricas corporais
- Insights automáticos de evolução

---

## 📋 Avaliações Físicas

### Criação
- Seleção de aluno (busca com autocomplete)
- Data retroativa (para avaliações feitas fora do sistema)
- Fluxo em 5 etapas guiadas

### Etapa 1 — Queixas do Cliente
- Seleção rápida de queixas comuns (badges clicáveis)
- Campo livre para queixas customizadas

### Etapa 2 — Mapa de Dor
- 15 regiões corporais (pescoço, ombros, lombar, joelhos, etc.)
- Slider de intensidade 0–10 por região

### Etapa 3 — Testes de Movimento (FMS-like)
- 7 padrões: Agachamento, Hinge, Lunge, Empurrar, Puxar, Rotação, Marcha
- Score 0–3 por padrão (Incapaz / Compensação / Aceitável / Excelente)
- Campo de observações por teste

### Etapa 4 — Medidas Corporais *(todas opcionais)*
- **Peso e Altura** com IMC calculado automaticamente
- **Método de composição corporal:**
  - `Pollock 3 dobras` — Masculino (Peito + Abdômen + Coxa) ou Feminino (Tríceps + Suprailíaca + Coxa)
  - `Pollock 7 dobras` — 7 pontos (ambos os sexos)
  - `InBody H20` — 13 campos do aparelho de bioimpedância (gordura, água, músculo, minerais, proteína, visceral, IMC, etc.)
  - Resultado automático em tempo real (% gordura, massa gorda, massa magra)
- **🔥 Metabolismo Basal (TMB) — calculado em tempo real:**
  - Harris-Benedict (1984)
  - Mifflin-St Jeor (1990) — padrão moderno
  - Katch-McArdle — quando há massa magra disponível (Pollock ou InBody)
  - InBody H20 — TMB direta do aparelho (prioridade máxima)
  - **TDEE completo** para 5 níveis de atividade (Sedentário → Muito Intenso)
  - Classificação automática do metabolismo (Baixo / Normal / Alto / Muito Alto)
  - Comparação entre os 3 métodos calculados lado a lado
- **Circunferências (12 pontos):** Peitoral, Cintura, Abdômen, Quadril, Braços (D/E), Antebraços (D/E), Coxas (D/E), Panturrilhas (D/E)
- Campo de observações

### Etapa 5 — Nível e Processamento
- Seleção do nível: Iniciante / Intermediário / Avançado
- Resumo da avaliação antes de processar
- Botão **Processar Avaliação** (envia para IA)

### Resultado da Avaliação
- Card de nível classificatório
- **Card de Metabolismo Basal** com TMB, TDEE e comparação de métodos
- Evolução desde a última avaliação (delta por métrica)
- Evolução InBody H20 (se disponível)
- Evolução de circunferências
- Insights automáticos de comparação
- Medidas corporais completas com display InBody
- Dobras cutâneas com soma
- Dados funcionais: queixas, mapa de dor, testes de movimento com scores

---

## 🏋️ Treinos

### Listagem
- Todos os treinos do studio (admin) ou do personal (trainer)
- Filtro por aluno, status (ativo/encerrado), fase
- Indicador de progresso de cada treino

### Geração com IA
- Seleciona aluno + avaliação base
- Escolhe objetivo: Emagrecimento / Hipertrofia / Performance / Reabilitação
- Escolhe fase de treinamento:
  - Fundamento Híbrido I/II
  - Condicionamento Híbrido
  - Hipertrofia Híbrida I/II
  - Força Híbrida I/II
  - Potência Híbrida
  - Resistência/Fadiga I/II
  - Metabólico I/II
- Sessões por semana (2–7x)
- Duração em semanas
- Geração via IA com base nas restrições e testes da avaliação
- Preview e confirmação antes de salvar

### Visualização do Treino
- Estrutura completa com exercícios, séries, repetições, carga, descanso
- Agrupamento por blocos de treino
- Progresso de sessões completadas

### Área do Treino (via PDF/área do aluno)
- Geração de PDF do treino
- Templates de treino

---

## 🏃 Presença / Check-in

- Check-in com data e hora
- Histórico de presença por aluno
- Check-in manual pelo personal no perfil do aluno
- Visualização de todas as sessões abertas do dia
- Nomes dos exercícios com **tooltip** no hover (quando truncado por tamanho)

---

## 💰 Financeiro *(módulo separado, habilitado por studio)*

### Dashboard Financeiro
- KPIs: Receita do mês, Despesas do mês, Saldo, Total Vencido
- Gráfico de saldo mensal
- Contas a receber x pagar

### Lançamentos
- Criação de lançamentos manuais (Receita / Despesa / Custo)
- Vinculação opcional a aluno do studio
- Categorização via Plano de Contas
- Recorrência: mensal, trimestral, semestral, anual (com N parcelas)
- Status: Pendente / Pago / Vencido (automático) / Cancelado
- Formas de pagamento: PIX, Dinheiro, Cartão Débito, Cartão Crédito, Transferência, Boleto
- Auto-marcação de OVERDUE (lazy update a cada GET)
- Filtros por tipo, status, categoria e período
- Agrupamento por mês com saldo mensal
- Botão **Pagar** para PENDING e OVERDUE (com cor diferente)
- Ícone e cor distintos para cada tipo (verde=receita, vermelho=despesa, laranja=custo)
- Cancelamento de recorrência completa
- Reversão de pagamento (PAID → PENDING)
- Exclusão com AuditLog

### Contas a Receber
- Lista filtrada de lançamentos RECEITA pendentes/vencidos
- Marcar como recebido individual

### Contas a Pagar
- Lista filtrada de lançamentos DESPESA/CUSTO pendentes/vencidos
- Marcar como pago individual

### DRE (Demonstrativo de Resultado)
- Estrutura em árvore por categoria (RECEITA / CUSTO / DESPESA)
- Filtro por mês/ano
- Totais por categoria e subtotais de grupo
- Resultado do período (Receita − Despesas)

### Plano de Contas (Categorias)
- Hierarquia de categorias (pai/filho)
- Tipos: RECEITA, CUSTO, DESPESA
- Códigos alfanuméricos (ex: 1.1.1)
- CRUD completo (admin)

### 💳 Mensalidades de Alunos *(funcionalidade nova)*
- Lista todos os alunos do studio com status de adimplência:
  - ✅ **Adimplente** — mês atual pago
  - ⭐ **Adiantado** — 2+ meses pagos antecipadamente
  - ⚠️ **Inadimplente** — mensalidade vencida
  - 🕐 **Pendente** — a vencer
  - ⬜ Sem mensalidade cadastrada
- KPIs: adimplentes, inadimplentes, total a receber, total em atraso
- Busca por nome + filtro por status
- Histórico expandível por aluno (grid mensal de status)
- **Criar mensalidade** com pagamento antecipado:
  - Seleciona categoria, valor, data inicial, total de meses
  - Campo *"Já pagos agora"* — os N primeiros já ficam como PAID
  - Resumo visual do valor sendo recebido agora
- **Quitar N meses de uma vez** (botão "Receber" → modal)
  - Seleciona 1, 2, 3, 6 ou 12 meses
  - Calcula total automaticamente
  - Quita os mais antigos primeiro (OVERDUE antes de PENDING)

---

## 📚 Planos de Aluno

- CRUD de planos de serviço (ex: Personal 3x, Personal 5x, Online)
- Valor, periodicidade (mensal/trimestral/semestral/anual)
- Associação de plano ao aluno (subscrição)
- Histórico de planos por aluno

---

## 👨‍👩‍👧‍👦 Equipe

- Convite de membros via email
- Roles: STUDIO_ADMIN / TRAINER
- Listagem da equipe com status e role
- Remoção de membro

---

## ⚙️ Configurações do Studio

- Nome, logo, endereço do studio
- Upload de logotipo (exibido na barra lateral)
- Módulos habilitados (TREINO / FINANCEIRO)
- Configurações de notificação

---

## 📱 Área do Aluno *(acesso externo — link individual)*

- Autenticação própria do aluno
- Visualização do treino atual
- Marcação de sessões realizadas
- Histórico de presença próprio

---

## 🔐 Autenticação e Segurança

- Login com email/senha
- JWT com access token (curto) + refresh token (longo)
- `fetchWithAuth` — renovação automática de token sem logout
- Troca de senha autenticada
- AuditLog em todas as operações críticas (create/update/delete)
- Roles hierárquicos: SuperAdmin → StudioAdmin → Trainer → Aluno

---

## 🛡️ SuperAdmin *(painel interno)*

- Listagem e gestão de todos os studios cadastrados
- Detalhe de cada studio: alunos, planos, lançamentos
- Gestão de planos de assinatura do SaaS (billing)
- Gestão de pagamentos e cobranças
- Dashboard global do SaaS
- Backup de dados
- Migração de dados de fases

---

## 🧰 Infraestrutura Técnica

| Item | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Banco de dados | PostgreSQL via Prisma ORM |
| Autenticação | JWT (access + refresh token) |
| Estilização | Tailwind CSS + shadcn/ui |
| IA (geração de treinos) | Integração com LLM |
| Deploy | VPS + PM2 + Nginx |
| Versionamento | Git (Google Drive → GitHub → VPS) |
| PDF | Geração server-side |

---

## 📐 Serviços e Cálculos Internos

| Serviço | O que faz |
|---|---|
| `pollock.ts` | Pollock 3 e 7 dobras + equação de Siri → % gordura, massa gorda, massa magra |
| `bmr.ts` | Harris-Benedict, Mifflin-St Jeor, Katch-McArdle, InBody → TMB + TDEE 5 níveis |
| `fetchWithAuth` | Interceptor HTTP com refresh automático de JWT |
| Auto-OVERDUE | Lançamentos vencidos marcados automaticamente em cada GET financeiro |
| AuditLog | Registro de todas as mutações críticas com userId, studioId, entidade e dados |
