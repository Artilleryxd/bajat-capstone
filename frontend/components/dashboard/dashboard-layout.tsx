"use client"

import { Sidebar } from "./sidebar"
import { MobileNav } from "./mobile-nav"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background app-grid-bg relative">
      {/* Background glow blobs */}
      <div className="fixed pointer-events-none z-0"
           style={{ top: "5%", right: "15%", width: 600, height: 600,
             background: "radial-gradient(circle, rgba(232,53,122,0.08) 0%, transparent 65%)" }} />
      <div className="fixed pointer-events-none z-0"
           style={{ bottom: "10%", left: "10%", width: 500, height: 500,
             background: "radial-gradient(circle, rgba(123,94,167,0.09) 0%, transparent 65%)" }} />
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile-only header */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-4"
          style={{ background: "rgba(7,9,12,.9)", borderBottom: "1px solid rgba(255,255,255,.07)", backdropFilter: "blur(12px)" }}>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <MobileNav />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                 style={{ background: "linear-gradient(135deg, #E8357A, #7B5EA7)" }}>
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                <path d="M2 12 L5.5 7.5 L8.5 9.5 L13 3" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-display font-extrabold text-base tracking-tight text-white">FinSight AI</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
