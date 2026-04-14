'use client'

// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN — CATÁLOGO DE FASES
// ============================================================================
// Visualização de TODAS as fases e seus treinos conforme as planilhas do método.
// Substituindo a página antiga de exercícios/blocos avulsos.
// ============================================================================

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Layers, ChevronDown, ChevronRight, Dumbbell,
  Target, Zap, Heart, ArrowUpRight, Activity,
} from 'lucide-react'

// Importar dados das planilhas
import { PHASE_CATALOG, type PhaseWorkoutTemplate, type PhaseTreino, type PhaseBlock } from '@/services/phaseWorkouts'
import { PHASE_LABELS, LEVEL_LABELS, type TrainingPhase, type TrainingLevel } from '@/services/trainingPhases'

// ============================================================================
// CONSTANTES DE UI
// ============================================================================

const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  CONDICIONAMENTO: { label: 'Condicionamento', color: 'text-blue-400', icon: Heart, bg: 'bg-blue-500/10 border-blue-500/30' },
  INICIANTE: { label: 'Iniciante', color: 'text-green-400', icon: Target, bg: 'bg-green-500/10 border-green-500/30' },
  INTERMEDIARIO: { label: 'Intermediário', color: 'text-yellow-400', icon: Zap, bg: 'bg-yellow-500/10 border-yellow-500/30' },
  AVANCADO: { label: 'Avançado', color: 'text-red-400', icon: ArrowUpRight, bg: 'bg-red-500/10 border-red-500/30' },
}

const PILLAR_COLORS: Record<string, string> = {
  PERNA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  EMPURRA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PUXA: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

// ============================================================================
// ORGANIZAR FASES POR NÍVEL
// ============================================================================

function getPhasesByLevel(): Record<string, PhaseWorkoutTemplate[]> {
  const grouped: Record<string, PhaseWorkoutTemplate[]> = {
    CONDICIONAMENTO: [],
    INICIANTE: [],
    INTERMEDIARIO: [],
    AVANCADO: [],
  }

  Object.values(PHASE_CATALOG).forEach((template) => {
    const level = template.level
    if (grouped[level]) {
      grouped[level].push(template)
    }
  })

  return grouped
}

// ============================================================================
// COMPONENTES
// ============================================================================

function TreinoCard({ treino, expanded, onToggle }: {
  treino: PhaseTreino
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge className={PILLAR_COLORS[treino.pillar] || 'bg-muted'}>
            {treino.pillar}
          </Badge>
          <span className="text-sm font-medium text-foreground">{treino.pillarLabel}</span>
          <span className="text-xs text-muted-foreground">({treino.series})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {treino.blocos.length} blocos • {treino.blocos.reduce((sum, b) => sum + b.exercises.length, 0)} exercícios
          </span>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          {treino.blocos.map((bloco, bi) => (
            <div key={bi}>
              <h5 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1.5">{bloco.name}</h5>
              <div className="space-y-1">
                {bloco.exercises.map((ex, ei) => (
                  <div key={ei} className="flex items-start justify-between py-1 px-2 rounded bg-background/50">
                    <span className="text-sm text-foreground">{ex.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{ex.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {treino.protocoloFinal && (
            <div className="pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Protocolo Final:</span>{' '}
              <span className="text-xs font-medium text-amber-400">{treino.protocoloFinal}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PhaseCard({ template }: { template: PhaseWorkoutTemplate }) {
  const [expandedTreino, setExpandedTreino] = useState<number | null>(null)

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-foreground">{template.phaseLabel}</CardTitle>
            <CardDescription className="text-xs">
              {template.treinos.length} treinos • 6 semanas • Fase {PHASE_LABELS[template.phase]}
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-500/30 text-amber-500">
            {template.phase}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {template.treinos.map((treino, i) => (
          <TreinoCard
            key={i}
            treino={treino}
            expanded={expandedTreino === i}
            onToggle={() => setExpandedTreino(expandedTreino === i ? null : i)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function SuperAdminPhasesPage() {
  const phasesByLevel = getPhasesByLevel()
  const [activeLevel, setActiveLevel] = useState<string>('CONDICIONAMENTO')

  const totalPhases = Object.values(PHASE_CATALOG).length
  const totalExercises = Object.values(PHASE_CATALOG).reduce((sum, t) =>
    sum + t.treinos.reduce((s, tr) =>
      s + tr.blocos.reduce((b, bl) => b + bl.exercises.length, 0), 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Layers className="h-6 w-6 text-amber-500" />
          Catálogo de Fases
        </h1>
        <p className="text-sm text-muted-foreground">
          Templates de treino do Método Expert Training — extraídos das planilhas oficiais
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">{totalPhases}</div>
            <div className="text-xs text-muted-foreground">Templates</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{totalExercises}</div>
            <div className="text-xs text-muted-foreground">Exercícios</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">4</div>
            <div className="text-xs text-muted-foreground">Níveis</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">6</div>
            <div className="text-xs text-muted-foreground">Semanas/Fase</div>
          </CardContent>
        </Card>
      </div>

      {/* Level Tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(LEVEL_CONFIG).map(([key, config]) => {
          const Icon = config.icon
          const count = phasesByLevel[key]?.length || 0
          return (
            <Button
              key={key}
              variant={activeLevel === key ? 'default' : 'outline'}
              className={activeLevel === key ? `${config.bg} ${config.color} border` : 'border-border'}
              onClick={() => setActiveLevel(key)}
            >
              <Icon className="h-4 w-4 mr-1.5" />
              {config.label}
              <Badge variant="outline" className="ml-2 text-xs">{count}</Badge>
            </Button>
          )
        })}
      </div>

      {/* Phase Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {(phasesByLevel[activeLevel] || []).map((template, i) => (
          <PhaseCard key={i} template={template} />
        ))}

        {(!phasesByLevel[activeLevel] || phasesByLevel[activeLevel].length === 0) && (
          <div className="col-span-2 text-center py-12">
            <Dumbbell className="mx-auto h-12 w-12 text-muted" />
            <h3 className="mt-4 text-lg font-medium text-muted-foreground">Nenhuma fase encontrada</h3>
          </div>
        )}
      </div>

      {/* Info */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-amber-500 mb-1">Como funciona</p>
              <ul className="space-y-1 text-xs">
                <li>• Cada fase dura <strong>6 semanas</strong> com exercícios fixos</li>
                <li>• Os exercícios são extraídos diretamente das planilhas oficiais do método</li>
                <li>• A progressão ocorre por volume e carga (S1→S6)</li>
                <li>• Todos os alunos começam pelo <strong>Condicionamento</strong></li>
                <li>• Avançado tem 2 variações para evitar platô</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
