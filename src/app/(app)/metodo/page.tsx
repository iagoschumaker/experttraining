'use client'

// ============================================================================
// EXPERT TRAINING - MÉTODO (Informativo)
// ============================================================================
// Página que exibe como funciona o método de periodização por fases
// ============================================================================

import { useState } from 'react'
import {
  BookOpen,
  Layers,
  Target,
  Zap,
  Heart,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// DADOS DAS FASES
// ============================================================================

const LEVELS = [
  {
    key: 'CONDICIONAMENTO',
    label: 'Condicionamento',
    icon: Heart,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    description: 'Base para todos os alunos. 2 fases de adaptação e condicionamento geral.',
    phases: ['Condicionamento 1', 'Condicionamento 2'],
  },
  {
    key: 'INICIANTE',
    label: 'Iniciante',
    icon: Target,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    description: 'Hipertrofia e força com exercícios fundamentais.',
    phases: ['Hipertrofia', 'Força'],
  },
  {
    key: 'INTERMEDIARIO',
    label: 'Intermediário',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    description: 'Periodização completa com fases específicas por objetivo.',
    phases: ['Hipertrofia', 'Força', 'Potência', 'Resistência', 'Metabólico', 'Hipertrofia 2'],
  },
  {
    key: 'AVANCADO',
    label: 'Avançado',
    icon: ArrowUpRight,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    description: 'Máxima complexidade e volume. Variações para evitar platô.',
    phases: ['Hipertrofia', 'Força', 'Potência', 'Resistência', 'Metabólico', 'Hipertrofia 2', 'Força 2', 'Resistência 2', 'Metabólico 2'],
  },
]

const OBJECTIVES = [
  {
    name: 'Hipertrofia',
    icon: '💪',
    fases: ['Condicionamento', 'Hipertrofia', 'Força', 'Hipertrofia 2', 'Hipertrofia 3', 'Hipertrofia 4'],
    color: 'border-purple-500/30 bg-purple-500/5',
  },
  {
    name: 'Emagrecimento',
    icon: '🔥',
    fases: ['Condicionamento', 'Hipertrofia', 'Força', 'Resistência', 'Metabólico'],
    color: 'border-amber-500/30 bg-amber-500/5',
  },
  {
    name: 'Performance',
    icon: '⚡',
    fases: ['Condicionamento', 'Hipertrofia', 'Força', 'Potência', 'Resistência'],
    color: 'border-cyan-500/30 bg-cyan-500/5',
  },
  {
    name: 'Reabilitação',
    icon: '🩹',
    fases: ['Condicionamento', 'Hipertrofia', 'Força'],
    color: 'border-green-500/30 bg-green-500/5',
  },
]

// ============================================================================
// PÁGINA
// ============================================================================

export default function MetodoPage() {
  const [expandedLevel, setExpandedLevel] = useState<string | null>('CONDICIONAMENTO')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-amber-500" />
          Método Expert Training
        </h1>
        <p className="text-muted-foreground mt-1">
          Periodização por fases — cada fase dura 6 semanas com exercícios fixos e progressão de carga.
        </p>
      </div>

      {/* Princípios */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-500 text-sm">6 Semanas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cada fase tem duração fixa de 6 semanas (S1→S6) com exercícios idênticos.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-400 text-sm">Progressão de Carga</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Volume e intensidade aumen­tam semana a semana dentro da mesma fase.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Layers className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-400 text-sm">3 Pilares</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cada treino é dividido em <strong>Perna</strong>, <strong>Empurra</strong> e <strong>Puxa</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Níveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-5 w-5 text-amber-500" />
            Níveis de Treinamento
          </CardTitle>
          <CardDescription>Clique para expandir e ver as fases de cada nível</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {LEVELS.map((level) => {
            const Icon = level.icon
            const isExpanded = expandedLevel === level.key
            return (
              <div key={level.key} className={`rounded-lg border ${level.bg} overflow-hidden`}>
                <button
                  onClick={() => setExpandedLevel(isExpanded ? null : level.key)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${level.color}`} />
                    <div className="text-left">
                      <span className={`font-semibold ${level.color}`}>{level.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{level.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {level.phases.length} fases
                    </Badge>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {level.phases.map((phase, i) => (
                        <Badge
                          key={i}
                          className="bg-background/50 border-border text-foreground"
                        >
                          {i + 1}. {phase}
                          <span className="ml-1 text-muted-foreground text-[10px]">6 sem.</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Fases por Objetivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-amber-500" />
            Fases por Objetivo do Aluno
          </CardTitle>
          <CardDescription>
            As fases disponíveis mudam conforme o objetivo do aluno
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {OBJECTIVES.map((obj) => (
              <div key={obj.name} className={`rounded-lg border p-4 ${obj.color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{obj.icon}</span>
                  <span className="font-semibold text-foreground">{obj.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {obj.fases.map((fase, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {fase}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regras */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-5">
          <h3 className="font-semibold text-amber-500 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Regras do Método
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>Todos os alunos começam pelo <strong className="text-foreground">Condicionamento</strong>, independente do objetivo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>Todos passam pela fase de <strong className="text-foreground">Força</strong> antes de avançar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span><strong className="text-foreground">Potência</strong> está disponível somente para Performance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span><strong className="text-foreground">Metabólico</strong> está disponível somente para Emagrecimento</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span><strong className="text-foreground">Hipertrofia 2, 3, 4</strong> estão disponíveis somente para Hipertrofia</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>A avaliação física é realizada a cada <strong className="text-foreground">60 dias</strong> para reclassificar o nível</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
