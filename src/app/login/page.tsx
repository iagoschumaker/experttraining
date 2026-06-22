'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input, Label } from '@/components/ui'
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { KinexLogo } from '@/components/kinex-logo'
import { useTheme } from '@/contexts/ThemeContext'

/* ─── Partículas douradas ─── */
function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    interface Particle { x: number; y: number; size: number; speedY: number; speedX: number; opacity: number; life: number; maxLife: number }

    const particles: Particle[] = []

    const spawn = (): Particle => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      size: Math.random() * 2.5 + 0.5,
      speedY: Math.random() * 0.8 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: 0,
      life: 0,
      maxLife: Math.random() * 200 + 120,
    })

    for (let i = 0; i < 35; i++) {
      const p = spawn()
      p.y = Math.random() * canvas.height
      p.life = Math.random() * p.maxLife
      particles.push(p)
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.life++
        p.y -= p.speedY
        p.x += p.speedX
        const ratio = p.life / p.maxLife
        p.opacity = ratio < 0.1 ? ratio * 6 : ratio > 0.9 ? (1 - ratio) * 6 : 0.6
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212, 168, 48, ${p.opacity})`
        ctx.fill()
        if (p.life >= p.maxLife || p.y < -10) particles[i] = spawn()
      }
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

/* ─── Formulário ─── */
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const normalizedEmail = email.trim().toLowerCase()

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Erro ao fazer login')
        setIsLoading(false)
        return
      }

      const selectStudioUrl = redirectTo
        ? `/select-studio?redirect=${encodeURIComponent(redirectTo)}`
        : '/select-studio'

      window.location.replace(selectStudioUrl)
    } catch (err) {
      console.error('Login error:', err)
      setError('Erro de conexão. Tente novamente.')
      setIsLoading(false)
    }
  }

  // Cores adaptadas ao tema
  const cardBg    = isDark ? 'rgba(22,22,22,0.75)'   : 'rgba(255,255,255,0.92)'
  const cardBorder = isDark ? '#222222'               : '#e5e5e5'
  const titleColor = isDark ? '#ffffff'               : '#111111'
  const subColor   = isDark ? '#9a9a9a'               : '#6b6b6b'
  const labelColor = isDark ? '#f0f0f0'               : '#111111'
  const inputBg    = isDark ? '#111111'               : '#f9f9f9'
  const inputBorder = isDark ? '#222222'              : '#e0e0e0'
  const inputColor = isDark ? '#f0f0f0'               : '#111111'
  const footerColor = isDark ? '#6b6b6b'              : '#9a9a9a'

  return (
    <div
      className="w-full max-w-sm space-y-8"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      {/* Logo apenas — sem texto */}
      <div className="flex justify-center">
        <div style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.92)',
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
        }}>
          <KinexLogo height={72} />
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          background: cardBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${cardBorder}`,
          borderRadius: '16px',
          padding: '2rem',
          transition: 'border-color 300ms ease, box-shadow 300ms ease',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transitionDelay: '0.15s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,168,48,0.35)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 40px rgba(212,168,48,0.08)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = cardBorder
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        }}
      >
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1" style={{ color: titleColor }}>Bem-vindo</h1>
          <p className="text-sm" style={{ color: subColor }}>Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Erro */}
          {error && (
            <div className="flex items-center gap-3 p-3 text-sm rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium" style={{ color: labelColor }}>Email</Label>
            <Input
              id="email" type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="off" autoCapitalize="none" autoCorrect="off"
              spellCheck={false} disabled={isLoading} className="h-11"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}
            />
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: labelColor }}>Senha</Label>
              <a
                href="https://wa.me/5517997141326?text=Olá,%20esqueci%20minha%20senha%20do%20Kinex%20Performance"
                target="_blank" rel="noopener noreferrer"
                className="text-xs transition-colors"
                style={{ color: '#d4a830' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f0d060')}
                onMouseLeave={e => (e.currentTarget.style.color = '#d4a830')}
              >
                Esqueci a senha
              </a>
            </div>
            <div className="relative">
              <Input
                id="password" type={showPassword ? 'text' : 'password'}
                placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password" disabled={isLoading}
                className="h-11 pr-10"
                style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#6b6b6b' }}
                onMouseEnter={e => (e.currentTarget.style.color = labelColor)}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b6b6b')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão — igual proposta */}
          <button
            type="submit" disabled={isLoading}
            className="w-full h-12 rounded-lg font-bold text-sm uppercase tracking-[0.06em] transition-all relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #d4a830 0%, #f0d060 50%, #d4a830 100%)',
              backgroundSize: '200% 200%',
              color: '#0a0a0a',
              boxShadow: '0 4px 20px rgba(212,168,48,0.25)',
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!isLoading) {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(212,168,48,0.35)'
              }
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(212,168,48,0.25)'
            }}
          >
            {isLoading
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Entrando...</span>
              : 'Entrar'
            }
          </button>

          <p className="text-xs text-center" style={{ color: footerColor }}>
            Ao entrar, você concorda com nossos termos de uso
          </p>
        </form>
      </div>

      <p className="text-center text-xs" style={{ color: footerColor }}>
        © {new Date().getFullYear()} Kinex Performance. Todos os direitos reservados.
      </p>
    </div>
  )
}

/* ─── Skeleton ─── */
function LoginSkeleton() {
  return (
    <div className="w-full max-w-sm space-y-8 animate-pulse">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-white/5" />
      </div>
      <div className="rounded-2xl p-8 space-y-4" style={{ background: 'rgba(22,22,22,0.75)', border: '1px solid #222' }}>
        <div className="h-5 bg-white/5 rounded w-32" />
        <div className="h-11 bg-white/5 rounded" />
        <div className="h-11 bg-white/5 rounded" />
        <div className="h-12 bg-white/5 rounded" />
      </div>
    </div>
  )
}

/* ─── Page ─── */
export default function LoginPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: isDark ? '#0a0a0a' : '#f5f5f5' }}
    >
      {/* Gradiente animado */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 20% 50%, rgba(212,168,48,0.06) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(212,168,48,0.04) 0%, transparent 50%),
          radial-gradient(circle at 50% 80%, rgba(212,168,48,0.03) 0%, transparent 50%)
        `,
        animation: 'hero-float 25s ease-in-out infinite',
      }} />

      {/* Partículas */}
      <GoldParticles />

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 w-full flex justify-center">
        <Suspense fallback={<LoginSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>

      <style>{`
        @keyframes hero-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(20px, -15px) scale(1.02); }
          66%       { transform: translate(-15px, 10px) scale(0.98); }
        }
      `}</style>
    </div>
  )
}
