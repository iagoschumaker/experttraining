'use client'

import { useState } from 'react'
import { SuperAdminSidebar, SuperAdminHeader } from '@/components/layout'
import { PWAInstallBanner } from '@/components/pwa-install-banner'
import { Toaster } from 'sonner'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* PWA Install Banner */}
      <PWAInstallBanner />
      
      {/* Sidebar */}
      <SuperAdminSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileOpenChange={setIsMobileMenuOpen}
      />
      
      {/* Main Content */}
      <div className="md:pl-64 transition-all duration-300">
        {/* Header */}
        <SuperAdminHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        
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
