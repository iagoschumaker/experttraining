'use client'

import { useState, useEffect } from 'react'
import { 
  BookOpen, 
  Clock, 
  Target, 
  Layers, 
  Zap, 
  Timer,
  ChevronRight,
  CheckCircle,
  Play,
  Pause
} from 'lucide-react'
import { generateDailySchedule, validateDailySchedule } from '@/lib/method-expert-training/engine'
import { DailySchedule, Assessment } from '@/lib/method-expert-training/types'

// Avaliação de exemplo para demonstração do método
const SAMPLE_ASSESSMENT: Assessment = {
  complaints: ['Dor no joelho', 'Falta de mobilidade'],
  painMap: [{ region: 'joelho', intensity: 4 }],
  movementScores: {
    squat: 2,
    hinge: 4,
    lunge: 3,
    push: 5,
    pull: 5,
    rotation: 4,
    gait: 5,
  },
  limitingCapacities: ['stability', 'mobility'],
  primaryGoal: 'saude',
  frequencyPerWeek: 3,
  level: 'intermediario',
}

export default function MetodoPage() {
  const [schedule, setSchedule] = useState<DailySchedule | null>(null)
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null)

  useEffect(() => {
    const generated = generateDailySchedule(SAMPLE_ASSESSMENT)
    setSchedule(generated)
    setValidation(validateDailySchedule(generated))
  }, [])

  if (!schedule) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-amber-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Método Expert Training
          </h1>
        </div>
        <p className="text-muted-foreground">
          Estrutura completa do cronograma diário baseado na metodologia Expert Training
        </p>
      </div>

      {/* Hierarquia do Método */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-amber-500" />
          Hierarquia do Método
        </h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="grid gap-4">
            <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold shrink-0">1</div>
              <div>
                <h3 className="font-semibold text-foreground">Preparação do Movimento</h3>
                <p className="text-sm text-muted-foreground">Mobilidade, ativação de core, estabilidade articular e ativação neuromuscular</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">2</div>
              <div>
                <h3 className="font-semibold text-foreground">3 Blocos de Treino (Obrigatórios)</h3>
                <p className="text-sm text-muted-foreground">Cada bloco: Foco Principal → Push/Pull Integrado → Core</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shrink-0">3</div>
              <div>
                <h3 className="font-semibold text-foreground">Protocolo Final</h3>
                <p className="text-sm text-muted-foreground">HIIT, regenerativo ou específico conforme objetivo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Regras de Descanso */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Timer className="h-5 w-5 text-amber-500" />
          Descansos Explícitos (Obrigatórios)
        </h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-5">
              <h3 className="font-medium text-foreground mb-3">Entre Exercícios</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Foco Principal</span>
                  <span className="font-mono text-amber-500">60-90s</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Push/Pull Integrado</span>
                  <span className="font-mono text-amber-500">40-60s</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Core</span>
                  <span className="font-mono text-amber-500">20-40s</span>
                </li>
              </ul>
            </div>
            <div className="p-5">
              <h3 className="font-medium text-foreground mb-3">Entre Blocos</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Bloco 1 → 2</span>
                  <span className="font-mono text-blue-500">90-120s</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Bloco 2 → 3</span>
                  <span className="font-mono text-blue-500">120-150s</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Após Bloco 3</span>
                  <span className="font-mono text-green-500">60-90s</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Exemplo Real de Cronograma */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-500" />
          Exemplo Real de Cronograma do Dia
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Foco do dia: <span className="text-amber-500 font-semibold">{schedule.focus}</span>
        </p>

        {/* Preparação */}
        <div className="bg-card border border-border rounded-lg mb-4">
          <div className="p-4 border-b border-border bg-amber-500/10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Play className="h-4 w-4 text-amber-500" />
                {schedule.preparation.title}
              </h3>
              <span className="text-sm text-amber-500 font-mono">{schedule.preparation.totalTime}</span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid gap-2">
              {schedule.preparation.exercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{ex.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{ex.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Blocos */}
        {schedule.blocks.map((block) => (
          <div key={block.blockIndex} className="bg-card border border-border rounded-lg mb-4">
            <div className="p-4 border-b border-border bg-blue-500/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Bloco {block.blockIndex}</h3>
                <span className="text-xs text-muted-foreground">
                  Descanso após: <span className="text-blue-500 font-mono">{block.restAfterBlock}</span>
                </span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {block.exercises.map((ex, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ex.role === 'FOCO_PRINCIPAL' 
                          ? 'bg-amber-500/20 text-amber-500' 
                          : ex.role === 'PUSH_PULL_INTEGRADO'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {ex.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      Descanso: {ex.rest}
                    </span>
                  </div>
                  <p className="font-medium text-foreground">{ex.name}</p>
                  <p className="text-sm text-muted-foreground">{ex.execution}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Protocolo Final */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border bg-green-500/10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                Protocolo Final
              </h3>
              <span className="text-sm text-green-500 font-mono">{schedule.finalProtocol.totalTime}</span>
            </div>
          </div>
          <div className="p-4">
            <p className="font-medium text-foreground">{schedule.finalProtocol.name}</p>
            {schedule.finalProtocol.structure && (
              <p className="text-sm text-muted-foreground mt-1">{schedule.finalProtocol.structure}</p>
            )}
          </div>
        </div>
      </section>

      {/* Validação */}
      {validation && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-amber-500" />
            Validação do Cronograma
          </h2>
          <div className={`p-4 rounded-lg border ${
            validation.valid 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            {validation.valid ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Cronograma válido - todas as regras atendidas</span>
              </div>
            ) : (
              <div>
                <p className="font-medium text-red-400 mb-2">Erros encontrados:</p>
                <ul className="list-disc list-inside text-sm text-red-400">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Regras Obrigatórias */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Regras Obrigatórias do Método
        </h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-foreground">Sempre 3 blocos de treino (nunca 2)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-foreground">Todos os blocos iniciam com FOCO PRINCIPAL (padrão de movimento mais deficiente)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-foreground">Descansos explícitos em todos os níveis (exercícios e blocos)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-foreground">Preparação do movimento obrigatória antes dos blocos</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-foreground">Protocolo final sempre presente após o Bloco 3</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Audit Info */}
      <section className="text-sm text-muted-foreground">
        <details className="cursor-pointer">
          <summary className="hover:text-foreground">Ver regras aplicadas pelo motor</summary>
          <div className="mt-2 p-3 bg-muted/50 rounded-lg font-mono text-xs">
            {schedule.audit.rulesTriggered.map((rule, i) => (
              <div key={i}>{rule}</div>
            ))}
          </div>
        </details>
      </section>
    </div>
  )
}
