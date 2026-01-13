// ============================================================================
// EXPERT TRAINING - ASSESSMENT RESULTS PAGE
// ============================================================================
// Exibe os resultados da avaliação processada pelo Decision Engine
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  translateMovementPattern,
  translatePainRegion,
  translateDifficulty,
} from '@/lib/translations'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  TrendingUp,
  Activity,
  AlertCircle,
  Target,
  Printer,
} from 'lucide-react'
import Link from 'next/link'

interface AssessmentResult {
  id: string
  status: string
  confidence: number
  createdAt: string
  completedAt: string
  client: {
    id: string
    name: string
    email: string
  }
  assessor: {
    name: string
  }
  inputJson: {
    complaints: string[]
    painMap: Record<string, number>
    movementTests: Record<string, { score: number; observations: string }>
    level: string
  }
  resultJson: {
    functionalPattern: string
    primaryFocus: string
    secondaryFocus: string[]
    allowedBlocks: string[]
    blockedBlocks: string[]
    recommendations: string[]
    scoresAnalysis: any
    painAnalysis: any
  }
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null)

  useEffect(() => {
    loadResults()
  }, [params.id])

  async function loadResults() {
    try {
      const res = await fetch(`/api/studio/assessments/${params.id}`)
      const data = await res.json()

      if (data.success) {
        if (data.data.status === 'COMPLETED') {
          setAssessment(data.data)
        } else {
          setError('Avaliação ainda não foi processada')
        }
      } else {
        setError('Avaliação não encontrada')
      }
    } catch (err) {
      console.error('Error loading results:', err)
      setError('Erro ao carregar resultados')
    } finally {
      setLoading(false)
    }
  }

  function getPainColor(value: number): string {
    if (value >= 7) return 'text-red-600'
    if (value >= 4) return 'text-yellow-600'
    return 'text-green-600'
  }

  function getScoreColor(score: number): string {
    if (score >= 3) return 'text-green-600'
    if (score >= 2) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold">{error || 'Resultados não disponíveis'}</h2>
        <Link href="/assessments">
          <Button className="mt-4">Voltar</Button>
        </Link>
      </div>
    )
  }

  const { resultJson, inputJson } = assessment

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/assessments" className="no-print">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Resultados da Avaliação</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground font-medium">Cliente: {assessment.client.name}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(assessment.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => window.print()}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir PDF
            </Button>
            <Badge variant={assessment.status === 'COMPLETED' ? 'default' : 'secondary'}>
              {assessment.status === 'COMPLETED' ? 'Completa' : assessment.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="print-only print-header">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Expert Training</h1>
          <p className="text-sm text-gray-600">Sistema de Avaliação Funcional</p>
        </div>
        <div className="border-t border-b py-4 mb-6">
          <h2 className="text-xl font-bold mb-2">Resultados da Avaliação</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Cliente:</strong> {assessment.client.name}</p>
              <p><strong>Email:</strong> {assessment.client.email}</p>
            </div>
            <div>
              <p><strong>Data:</strong> {new Date(assessment.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
              <p><strong>Status:</strong> {assessment.status === 'COMPLETED' ? 'Concluída' : assessment.status}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Functional Pattern */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Padrão Funcional Identificado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{resultJson.functionalPattern}</h3>
            <p className="text-sm text-muted-foreground">Foco Primário: {resultJson.primaryFocus}</p>
          </div>
          {resultJson.secondaryFocus.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Focos Secundários:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {resultJson.secondaryFocus.map((focus: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {focus}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Allowed Blocks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Blocos Permitidos
            </CardTitle>
            <CardDescription>Blocos que podem ser utilizados no treino</CardDescription>
          </CardHeader>
          <CardContent>
            {resultJson.allowedBlocks.length > 0 ? (
              <div className="space-y-2">
                {resultJson.allowedBlocks.map((block: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm text-foreground">{block}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum bloco específico permitido</p>
            )}
          </CardContent>
        </Card>

        {/* Blocked Blocks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Blocos Bloqueados
            </CardTitle>
            <CardDescription>Blocos que devem ser evitados</CardDescription>
          </CardHeader>
          <CardContent>
            {resultJson.blockedBlocks.length > 0 ? (
              <div className="space-y-2">
                {resultJson.blockedBlocks.map((block: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-foreground">{block}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum bloco bloqueado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recomendações
          </CardTitle>
          <CardDescription>Orientações baseadas na avaliação</CardDescription>
        </CardHeader>
        <CardContent>
          {resultJson.recommendations.length > 0 ? (
            <ul className="space-y-2">
              {resultJson.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma recomendação específica</p>
          )}
        </CardContent>
      </Card>

      {/* Analysis Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pain Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Dor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(inputJson.painMap || {}).map(([region, value]) => (
                <div key={region} className="flex items-center justify-between">
                  <span className="text-sm">{translatePainRegion(region)}</span>
                  <span className={`text-sm font-semibold ${getPainColor(value as number)}`}>
                    {value}/10
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Movement Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Scores de Movimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(inputJson.movementTests || {}).map(([test, data]: [string, any]) => (
                <div key={test} className="flex items-center justify-between">
                  <span className="text-sm">{translateMovementPattern(test)}</span>
                  <span className={`text-sm font-semibold ${getScoreColor(data.score)}`}>
                    {data.score}/3
                  </span>
                </div>
              ))}
              {resultJson.scoresAnalysis?.averageScore && (
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-sm font-semibold">Média</span>
                  <span className="text-sm font-bold text-amber-500">
                    {resultJson.scoresAnalysis.averageScore.toFixed(1)}/3
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Próximo Passo</h3>
              <p className="text-sm text-muted-foreground">
                Gerar treino baseado nesta avaliação
              </p>
            </div>
            <Link href={`/workouts/generate?assessmentId=${params.id}`}>
              <Button>
                Gerar Treino
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Print Footer - Only visible when printing */}
      <div className="print-only print-footer">
        <p>Expert Training - Sistema de Avaliação Funcional | www.experttraining.com.br</p>
        <p>Documento gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  )
}
