'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Phone, Dumbbell, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function AreaAlunoPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-detecta se é e-mail ou celular
  const isEmail = identifier.includes('@')
  const digitsOnly = identifier.replace(/\D/g, '')

  // Formata celular automaticamente enquanto digita
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Se parece e-mail, não formata como telefone
    if (val.includes('@') || val.includes('.') && !val.replace(/\D/g, '').length) {
      setIdentifier(val)
    } else {
      // Tenta formatar como telefone se for só números
      const rawDigits = val.replace(/\D/g, '')
      if (rawDigits.length > 0 && !val.includes('@')) {
        setIdentifier(formatPhone(val))
      } else {
        setIdentifier(val)
      }
    }
    setError(null)
  }

  const isValidIdentifier = isEmail
    ? identifier.includes('@') && identifier.includes('.')
    : digitsOnly.length >= 10

  const isValidBirthDate = birthDate.length === 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/areaaluno/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: isEmail ? identifier.trim() : digitsOnly,
          birthDate,
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/areaaluno/treino')
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">

      {/* Glow decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">

        {/* Logo + título */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/30">
            <Dumbbell className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Área do Aluno</h1>
          <p className="text-zinc-400 text-sm mt-1">Acesse seu treino e acompanhe seu progresso</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/80 backdrop-blur shadow-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Identificador */}
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-zinc-300 text-sm flex items-center gap-2">
                  {isEmail
                    ? <Mail className="w-3.5 h-3.5 text-amber-400" />
                    : <Phone className="w-3.5 h-3.5 text-amber-400" />
                  }
                  E-mail ou Celular
                </Label>
                <Input
                  id="identifier"
                  type={isEmail ? 'email' : 'tel'}
                  placeholder="(00) 00000-0000 ou email@exemplo.com"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  className="bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 h-11 focus:border-amber-500/50 focus:ring-amber-500/20"
                  disabled={loading}
                  autoComplete="tel email"
                  inputMode={isEmail ? 'email' : 'numeric'}
                />
                <p className="text-[11px] text-zinc-500">
                  Use o mesmo cadastrado no seu studio
                </p>
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-zinc-300 text-sm flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Data de Nascimento
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value)
                    setError(null)
                  }}
                  className="bg-zinc-800/60 border-zinc-700 text-white h-11 focus:border-amber-500/50 focus:ring-amber-500/20 [color-scheme:dark]"
                  disabled={loading}
                  max={new Date().toISOString().slice(0, 10)}
                />
                <p className="text-[11px] text-zinc-500">
                  Usada para confirmar sua identidade
                </p>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Botão */}
              <Button
                type="submit"
                className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-base transition-all duration-200 shadow-lg shadow-amber-500/20"
                disabled={loading || !isValidIdentifier || !isValidBirthDate}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Acessar Treino'
                )}
              </Button>
            </form>

            {/* Dica de segurança */}
            <div className="mt-5 flex items-center gap-2 text-[11px] text-zinc-600">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Acesso seguro — nenhuma senha necessária</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
