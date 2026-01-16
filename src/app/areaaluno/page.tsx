'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Phone, User, Dumbbell } from 'lucide-react'

interface ConfirmationOption {
  id: string
  name: string
  studio: string
}

export default function AreaAlunoPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [options, setOptions] = useState<ConfirmationOption[]>([])

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/areaaluno/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          name: needsConfirmation ? name : undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/areaaluno/treino')
      } else if (data.needsConfirmation) {
        setNeedsConfirmation(true)
        setOptions(data.options || [])
        setError(null)
      } else {
        setError(data.error || 'Erro ao acessar. Tente novamente.')
      }
    } catch (err) {
      console.error('Erro:', err)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-zinc-700 bg-zinc-800/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-2xl text-white">Área do Aluno</CardTitle>
            <CardDescription className="text-zinc-400">
              Acesse seu treino usando seu celular
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Celular */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-zinc-300 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Celular
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={handlePhoneChange}
                className="bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500 text-lg h-12"
                disabled={loading}
                autoComplete="tel"
                inputMode="numeric"
              />
            </div>

            {/* Campo Nome (apenas quando necessário confirmação) */}
            {needsConfirmation && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Seu Nome
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Digite seu nome"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError(null)
                  }}
                  className="bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500 text-lg h-12"
                  disabled={loading}
                  autoComplete="name"
                />
                {options.length > 0 && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Encontramos {options.length} cadastros com este celular. Confirme seu nome.
                  </p>
                )}
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Botão */}
            <Button
              type="submit"
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-lg"
              disabled={loading || !phone || (needsConfirmation && !name)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Acessando...
                </>
              ) : (
                'Acessar Treino'
              )}
            </Button>
          </form>

          {/* Dica */}
          <p className="text-center text-xs text-zinc-500 mt-6">
            Use o mesmo celular cadastrado no seu studio
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
