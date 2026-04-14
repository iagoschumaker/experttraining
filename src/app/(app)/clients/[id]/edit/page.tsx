'use client'

// ============================================================================
// EXPERT TRAINING - EDIT CLIENT PAGE
// ============================================================================
// Página de edição de cliente — SOMENTE dados pessoais.
// Medidas corporais e dobras cutâneas ficam APENAS na avaliação.
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save } from 'lucide-react'

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trainers, setTrainers] = useState<Array<{ userId: string; name: string }>>([])

  function formatDate(value: string) {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 4) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2)
    } else {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4) + '/' + numbers.slice(4, 8)
    }
  }

  function handleDateChange(value: string) {
    const formatted = formatDate(value)
    setFormData({ ...formData, birthDate: formatted })
  }

  function convertDateToISO(dateStr: string): string | null {
    if (!dateStr) return null
    if (dateStr.includes('-') && dateStr.length === 10) {
      return dateStr
    }
    const parts = dateStr.split('/')
    if (parts.length === 3 && parts[2].length === 4) {
      const [day, month, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return null
  }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    objectives: '',
    history: '',
    birthDate: '',
    gender: '',
    height: '',
    weight: '',
    notes: '',
    goal: '',
    trainerId: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientRes = await fetch(`/api/clients/${clientId}`)
        const clientData = await clientRes.json()

        if (clientData.success) {
          const client = clientData.data
          setFormData({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            objectives: client.objectives || '',
            history: client.history || '',
            birthDate: client.birthDate ? client.birthDate.split('T')[0] : '',
            gender: client.gender || '',
            height: client.height ? String(client.height) : '',
            weight: client.weight ? String(client.weight) : '',
            notes: client.notes || '',
            goal: client.goal || '',
            trainerId: client.trainerId || '',
          })

          if (client.studioId) {
            const trainersRes = await fetch(`/api/superadmin/studios/${client.studioId}/trainers`)
            const trainersData = await trainersRes.json()
            if (trainersData.success) {
              const trainersFormatted = trainersData.data.items.map((t: any) => ({
                userId: t.oddsId,
                name: t.name
              }))
              setTrainers(trainersFormatted)
            }
          }
        } else {
          alert('Cliente não encontrado')
          router.push('/clients')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        alert('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [clientId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        objectives: formData.objectives || null,
        history: formData.history || null,
        notes: formData.notes || null,
        goal: formData.goal || null,
        trainerId: formData.trainerId || null,
        gender: formData.gender || null,
        birthDate: formData.birthDate ? convertDateToISO(formData.birthDate) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
      }

      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await res.json()

      if (data.success) {
        alert('Cliente atualizado com sucesso!')
        router.push(`/clients/${clientId}`)
      } else {
        alert(data.error || 'Erro ao atualizar cliente')
      }
    } catch (error) {
      console.error('Error updating client:', error)
      alert('Erro ao atualizar cliente')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/clients/${clientId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar Aluno</h1>
          <p className="text-sm text-gray-500">Atualize as informações do aluno</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Aluno</CardTitle>
            <CardDescription>
              Preencha os dados do aluno. Medidas corporais e dobras cutâneas são preenchidas na avaliação física.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados Pessoais</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento</Label>
                  <Input
                    id="birthDate"
                    type="text"
                    value={formData.birthDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className="md:hidden"
                  />
                  <Input
                    id="birthDate-desktop"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                    className="hidden md:block"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <select
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                  >
                    <option value="" className="bg-background text-foreground">Selecione</option>
                    <option value="M" className="bg-background text-foreground">Masculino</option>
                    <option value="F" className="bg-background text-foreground">Feminino</option>
                    <option value="O" className="bg-background text-foreground">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainerId">Personal Responsável</Label>
                  <select
                    id="trainerId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.trainerId}
                    onChange={(e) =>
                      setFormData({ ...formData, trainerId: e.target.value })
                    }
                  >
                    <option value="" className="bg-background text-foreground">Nenhum</option>
                    {trainers.map((trainer) => (
                      <option key={trainer.userId} value={trainer.userId} className="bg-background text-foreground">
                        {trainer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dados Físicos — apenas altura e peso */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados Físicos</h3>
              <p className="text-sm text-muted-foreground">
                Apenas altura e peso. Medidas detalhadas, dobras cutâneas e % de gordura são preenchidas na <strong>avaliação física</strong>.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    value={formData.height}
                    onChange={(e) =>
                      setFormData({ ...formData, height: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Objetivos e Histórico */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Objetivos e Histórico</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objectives">Objetivos</Label>
                  <Textarea
                    id="objectives"
                    rows={3}
                    value={formData.objectives}
                    onChange={(e) =>
                      setFormData({ ...formData, objectives: e.target.value })
                    }
                    placeholder="Ex: Ganhar massa muscular, melhorar condicionamento..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history">Histórico Médico</Label>
                  <Textarea
                    id="history"
                    rows={3}
                    value={formData.history}
                    onChange={(e) =>
                      setFormData({ ...formData, history: e.target.value })
                    }
                    placeholder="Lesões, patologias, cirurgias anteriores..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal">Meta Principal</Label>
                  <select
                    id="goal"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.goal}
                    onChange={(e) =>
                      setFormData({ ...formData, goal: e.target.value })
                    }
                  >
                    <option value="" className="bg-background text-foreground">Selecione uma meta</option>
                    <option value="HYPERTROPHY" className="bg-background text-foreground">Hipertrofia</option>
                    <option value="STRENGTH" className="bg-background text-foreground">Força</option>
                    <option value="CONDITIONING" className="bg-background text-foreground">Condicionamento</option>
                    <option value="WEIGHT_LOSS" className="bg-background text-foreground">Emagrecimento</option>
                    <option value="REHABILITATION" className="bg-background text-foreground">Reabilitação</option>
                    <option value="PERFORMANCE" className="bg-background text-foreground">Performance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Notas adicionais sobre o aluno..."
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Link href={`/clients/${clientId}`}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
