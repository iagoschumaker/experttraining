'use client'

import { SuperAdminSidebar, SuperAdminHeader } from '@/components/layout'
import { Toaster } from 'sonner'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <SuperAdminSidebar />
      
      {/* Main Content */}
      <div className="md:pl-64 transition-all duration-300">
        {/* Header */}
        <SuperAdminHeader />
        
        {/* Page Content */}
        <main className="p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}
