import { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Área do Aluno | EXPERT PRO TRAINING',
  description: 'Acesse seu treino personalizado',
}

export default function AreaAlunoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-900">
      {children}
    </div>
  )
}
