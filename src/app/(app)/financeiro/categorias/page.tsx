'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

export default function CategoriasPage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/financeiro'), 3000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <div className="p-4 rounded-full bg-muted/50">
        <Lock className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Acesso Restrito</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        O Plano de Contas é gerenciado globalmente pelo administrador do sistema.
        Redirecionando para o financeiro...
      </p>
    </div>
  )
}
