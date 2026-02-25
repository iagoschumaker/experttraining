'use client'

// ============================================================================
// EXPERT TRAINING - CLIENT GOALS FORM
// ============================================================================
// Formulário para definir meta (goalType) e peso-meta (goalWeight) do aluno
// ============================================================================

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Target, Save, Loader2, Check } from 'lucide-react'

const GOAL_OPTIONS = [
  { value: 'WEIGHT_LOSS', label: 'Emagrecimento' },
  { value: 'MUSCLE_GAIN', label: 'Ganho de Massa Muscular' },
  { value: 'RECOMP', label: 'Recomposição Corporal' },
  { value: 'PERFORMANCE', label: 'Performance Esportiva' },
  { value: 'HEALTH', label: 'Saúde e Qualidade de Vida' },
] as const

interface ClientGoalsFormProps {
  clientId: string
  initialGoalType?: string | null
  initialGoalWeight?: number | null
  onSaved?: () => void
}

export function ClientGoalsForm({
  clientId,
  initialGoalType,
  initialGoalWeight,
  onSaved,
}: ClientGoalsFormProps) {
  const [goalType, setGoalType] = useState<string>(initialGoalType ?? '')
  const [goalWeight, setGoalWeight] = useState<string>(
    initialGoalWeight != null ? String(initialGoalWeight) : ''
  )
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSave = async () => {
    try {
      setSaving(true)
      setFeedback(null)
      const body: Record<string, unknown> = {}
      if (goalType) body.goalType = goalType
      else body.goalType = null
      if (goalWeight && !isNaN(Number(goalWeight))) body.goalWeight = Number(goalWeight)
      else body.goalWeight = null

      const res = await fetch(`/api/clients/${clientId}/goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await res.json()

      if (result.success) {
        setFeedback({ type: 'success', message: 'Meta atualizada com sucesso!' })
        onSaved?.()
        setTimeout(() => setFeedback(null), 3000)
      } else {
        setFeedback({ type: 'error', message: result.error || 'Erro ao salvar. Tente novamente.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-amber-500" />
          Meta do Aluno
        </CardTitle>
        <CardDescription>
          Defina o objetivo principal e peso-meta para acompanhar a evolução
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="goalType">Objetivo</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger id="goalType">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalWeight">Peso-Meta (kg)</Label>
            <Input
              id="goalWeight"
              type="number"
              step="0.1"
              min="30"
              max="300"
              placeholder="Ex: 75.0"
              value={goalWeight}
              onChange={(e) => setGoalWeight(e.target.value)}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : feedback?.type === 'success' ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {feedback?.type === 'success' ? 'Salvo!' : 'Salvar Meta'}
          </Button>
        </div>

        {feedback && (
          <p className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {feedback.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
