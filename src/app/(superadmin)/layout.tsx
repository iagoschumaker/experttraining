'use client'

import { SuperAdminSidebar, SuperAdminHeader } from '@/components/layout'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar */}
      <SuperAdminSidebar />
      
      {/* Main Content */}
      <div className="pl-64 transition-all duration-300">
        {/* Header */}
        <SuperAdminHeader />
        
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
