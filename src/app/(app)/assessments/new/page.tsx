'use client'

// ============================================================================
// EXPERT PRO TRAINING - NEW ASSESSMENT PAGE
// ============================================================================
// Formulário para criar nova avaliação - Seleciona cliente
// ============================================================================

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { ArrowLeft, ClipboardCheck, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  email: string | null
}

function NewAssessmentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('clientId')

  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Carregar cliente pré-selecionado
  useEffect(() => {
    if (preselectedClientId) {
      fetchClientById(preselectedClientId)
    }
  }, [preselectedClientId])

  const fetchClientById = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`)
      const data = await res.json()
      if (data.success) {
        setSelectedClient(data.data)
        setSearchTerm(data.data.name)
      }
    } catch (error) {
      console.error('Error fetching client:', error)
    }
  }

  // Buscar clientes com debounce
  useEffect(() => {
    if (searchTerm.length < 2) {
      setClients([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true)
        const res = await fetch(`/api/clients?search=${encodeURIComponent(searchTerm)}&pageSize=20`)
        const data = await res.json()
        if (data.success) {
          setClients(data.data.items)
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Create assessment and redirect to input page
  const handleCreate = async () => {
    if (!selectedClient) {
      alert('Selecione um aluno')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          inputJson: {
            complaints: [],
            painMap: {},
            movementTests: {
              squat: { score: 0, observations: '' },
              hinge: { score: 0, observations: '' },
              lunge: { score: 0, observations: '' },
              push: { score: 0, observations: '' },
              pull: { score: 0, observations: '' },
              rotation: { score: 0, observations: '' },
              gait: { score: 0, observations: '' },
            },
            level: 'BEGINNER',
          },
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/assessments/${data.data.id}/input`)
      } else {
        alert(data.error || 'Erro ao criar avaliação')
      }
    } catch (error) {
      console.error('Error creating assessment:', error)
      alert('Erro ao criar avaliação')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client)
    setSearchTerm(client.name)
    setShowSuggestions(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/assessments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nova Avaliação</h1>
          <p className="text-sm text-gray-500">
            Inicie uma avaliação funcional para um cliente
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle>Selecione o Aluno</CardTitle>
              <CardDescription>
                Busque e escolha o aluno para iniciar a avaliação
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 relative">
            <Label htmlFor="client">Aluno *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="client"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (!e.target.value) {
                    setSelectedClient(null)
                  }
                }}
                onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                placeholder="Digite o nome do aluno para buscar..."
                className="pl-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Sugestões */}
            {showSuggestions && clients.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className="w-full px-4 py-2 text-left hover:bg-accent transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="font-medium">{client.name}</div>
                    {client.email && (
                      <div className="text-sm text-gray-500">{client.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Cliente selecionado */}
            {selectedClient && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{selectedClient.name}</div>
                  {selectedClient.email && (
                    <div className="text-sm text-muted-foreground">{selectedClient.email}</div>
                  )}
                </div>
              </div>
            )}

            {searchTerm.length > 0 && searchTerm.length < 2 && (
              <p className="text-sm text-muted-foreground">Digite pelo menos 2 caracteres para buscar</p>
            )}
          </div>

          <div className="flex gap-3">
            <Link href="/assessments" className="flex-1">
              <Button variant="outline" className="w-full">
                Cancelar
              </Button>
            </Link>
            <Button
              onClick={handleCreate}
              disabled={!selectedClient || saving}
              className="flex-1"
            >
              {saving ? 'Criando...' : 'Iniciar Avaliação'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewAssessmentPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewAssessmentForm />
    </Suspense>
  )
}
