'use client'

// ============================================================================
// EXPERT TRAINING — BMR Card Component
// ============================================================================
// Exibe o resultado do Metabolismo Basal e tabela de TDEE
// Usado em: formulário de avaliação (tempo real) e detalhe de avaliação
// ============================================================================

import { AllBMRResults, BMRResult, ACTIVITY_LABELS, bmrCategory } from '@/services/bmr'
import { Flame, Info, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { useState } from 'react'

interface BMRCardProps {
  results: AllBMRResults
  gender: 'M' | 'F'
  /** Se true, mostra o painel de comparação de métodos */
  showComparison?: boolean
  /** Modo compacto (para listas) */
  compact?: boolean
}

export function BMRCard({ results, gender, showComparison = true, compact = false }: BMRCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const best = results.best
  const cat = bmrCategory(best.kcal, gender)

  const methodBadge = (method: string) => {
    switch (method) {
      case 'inbody': return <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">InBody</span>
      case 'katch': return <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">Katch-McArdle</span>
      case 'mifflin': return <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">Mifflin-St Jeor</span>
      case 'harris': return <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Harris-Benedict</span>
      default: return null
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Flame className="h-4 w-4 text-orange-500" />
        <span className="font-bold text-orange-400">{best.kcal.toLocaleString('pt-BR')} kcal/dia</span>
        {methodBadge(best.method)}
        <span className={`text-xs ${cat.color}`}>{cat.label}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="font-semibold text-foreground">Taxa Metabólica Basal (TMB)</span>
        </div>
        {methodBadge(best.method)}
      </div>

      {/* TMB principal */}
      <div className="flex items-end gap-3">
        <div>
          <div className="text-4xl font-bold text-orange-400">
            {best.kcal.toLocaleString('pt-BR')}
          </div>
          <div className="text-sm text-muted-foreground">kcal/dia em repouso</div>
        </div>
        <div className="pb-1">
          <span className={`text-sm font-semibold ${cat.color}`}>{cat.label}</span>
          <div className="text-xs text-muted-foreground">{cat.description}</div>
        </div>
      </div>

      {/* Método usado */}
      <div className="flex items-start gap-2 rounded-lg bg-background/60 p-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-orange-400" />
        <span><strong className="text-foreground">{best.methodLabel}:</strong> {best.methodDescription}</span>
      </div>

      {/* TDEE Grid */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
          <Zap className="h-3 w-3" /> Gasto Total por Nível de Atividade (TDEE)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
          {ACTIVITY_LABELS.map(({ key, label, description, icon, multiplier }) => (
            <div key={key} className="rounded-lg bg-background/80 border border-border p-2.5 text-center">
              <div className="text-lg mb-0.5">{icon}</div>
              <div className="text-xs font-medium text-foreground">{label}</div>
              <div className="text-[10px] text-muted-foreground mb-1">{description}</div>
              <div className="font-bold text-sm text-orange-400">
                {best.tdee[key].toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] text-muted-foreground">kcal/dia</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparação de métodos (opcional) */}
      {showComparison && (results.harris || results.mifflin || results.katch) && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetail(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showDetail ? 'Ocultar' : 'Ver'} comparação de métodos
          </button>

          {showDetail && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[results.harris, results.mifflin, results.katch].filter(Boolean).map((r) => {
                const isActive = r!.method === best.method
                return (
                  <div key={r!.method} className={`rounded-lg border p-3 text-center ${
                    isActive ? 'border-orange-500/50 bg-orange-500/10' : 'border-border bg-background/60'
                  }`}>
                    <div className="text-xs text-muted-foreground mb-1">{r!.methodLabel}</div>
                    <div className={`text-xl font-bold ${isActive ? 'text-orange-400' : 'text-foreground'}`}>
                      {r!.kcal.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-[10px] text-muted-foreground">kcal/dia</div>
                    {isActive && (
                      <div className="text-[10px] text-orange-400 mt-1 font-medium">✓ Método usado</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Lean mass info for Katch */}
      {best.method === 'katch' && best.leanMassKg && (
        <div className="text-xs text-muted-foreground">
          📐 Massa magra utilizada: <strong className="text-foreground">{best.leanMassKg.toFixed(1)} kg</strong>
        </div>
      )}
    </div>
  )
}
