'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui'
import { Loader2, AlertCircle, Dumbbell } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    console.log('📧 Sending login request with email:', normalizedEmail)
    console.log('📱 User agent:', navigator.userAgent)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })

      const data = await response.json()
      console.log('Login response:', data)

      if (!data.success) {
        setError(data.error || 'Erro ao fazer login')
        setIsLoading(false)
        return
      }

      // Always go to select-studio page first - it handles both SuperAdmin and regular users
      // Pass the original redirect as query param so select-studio can use it after studio selection
      const selectStudioUrl = redirectTo 
        ? `/select-studio?redirect=${encodeURIComponent(redirectTo)}`
        : '/select-studio'
      
      console.log('Login successful, redirecting to:', selectStudioUrl)
      
      // Force redirect
      window.location.replace(selectStudioUrl)
      return // Stop execution
    } catch (err) {
      console.error('Login error:', err)
      setError('Erro de conexão. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Logo */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-6 shadow-lg shadow-primary/50">
          <Dumbbell className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Expert Training
        </h1>
        <p className="text-muted-foreground">
          Método de treino funcional híbrido
        </p>
      </div>

      {/* Login Card */}
      <Card className="border-border shadow-2xl">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl text-center">Bem-vindo</CardTitle>
          <CardDescription className="text-center">
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                disabled={isLoading}
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="h-11"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/30" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Ao entrar, você concorda com nossos termos de uso
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Expert Training. Todos os direitos reservados.
      </p>
    </div>
  )
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-md space-y-8 animate-pulse">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6 mx-auto" />
        <div className="h-8 bg-muted rounded w-48 mx-auto mb-2" />
        <div className="h-4 bg-muted rounded w-64 mx-auto" />
      </div>
      <div className="bg-card rounded-lg p-6 shadow-2xl border border-border">
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-transparent to-muted/30" />
      </div>
      
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <Suspense fallback={<LoginSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
