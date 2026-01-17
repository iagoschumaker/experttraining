'use client'

import { useState } from 'react'
import { AppSidebar, AppHeader } from '@/components/layout'
import { PWAInstallBanner } from '@/components/pwa-install-banner'

export default function AppLayout({
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
      <AppSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileOpenChange={setIsMobileMenuOpen}
      />
      
      {/* Main Content */}
      <div className="md:pl-64 transition-all duration-300">
        {/* Header */}
        <AppHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        {/* Page Content */}
        <main className="p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
