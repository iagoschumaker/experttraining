import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Área do Aluno | EXPERT PRO TRAINING',
  description: 'Acesse seu treino personalizado',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
