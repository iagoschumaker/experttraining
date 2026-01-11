import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redireciona para login
  redirect('/login')
}
