// ============================================================================
// EXPERT PRO TRAINING - LESSONS PAGE [DEPRECATED]
// ============================================================================
// ⚠️ FUNCIONALIDADE DESCONTINUADA
// 
// O controle por aulas foi removido do Método EXPERT PRO TRAINING.
// O sistema agora é gerenciado por:
// - Avaliações (Assessment)
// - Cronogramas/Ciclos de treino (Workout)
// - Reavaliações obrigatórias
//
// Esta página existe apenas para compatibilidade e histórico.
// ============================================================================

'use client'

import { useRouter } from 'next/navigation'
import { 
  AlertTriangle, 
  ClipboardCheck, 
  Calendar,
  ArrowRight,
  Info
} from 'lucide-react'

export default function LessonsDeprecatedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Aviso Principal */}
        <div className="bg-amber-500/10 border-2 border-amber-500 rounded-xl p-8 text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-amber-500/20 rounded-full">
              <AlertTriangle className="w-12 h-12 text-amber-500" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Funcionalidade Descontinuada
          </h1>
          
          <p className="text-lg text-muted-foreground mb-4">
            O controle por aulas foi descontinuado no Método EXPERT PRO TRAINING.
          </p>
          
          <div className="bg-card border border-border rounded-lg p-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Novo Fluxo do Método:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Realizar <strong>Avaliação</strong> do aluno</li>
                  <li>Gerar <strong>Cronograma de Treino</strong> (ciclo de 4 semanas)</li>
                  <li>Aluno executa o treino de forma autônoma</li>
                  <li>Ao finalizar o ciclo, realizar <strong>Reavaliação obrigatória</strong></li>
                </ol>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            O licenciamento agora é auditado por <strong>avaliações</strong>, não por aulas.
          </p>
        </div>

        {/* Ações Sugeridas */}
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/assessments')}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-amber-500 hover:bg-amber-500/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20">
                <ClipboardCheck className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Avaliações</p>
                <p className="text-xs text-muted-foreground">Realizar nova avaliação</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500" />
          </button>

          <button
            onClick={() => router.push('/workouts')}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-amber-500 hover:bg-amber-500/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Cronogramas</p>
                <p className="text-xs text-muted-foreground">Ver treinos ativos</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500" />
          </button>
        </div>

        {/* Link para Dashboard */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-muted-foreground hover:text-amber-500 underline"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
