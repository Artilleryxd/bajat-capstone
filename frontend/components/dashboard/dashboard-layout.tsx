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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile-only header */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-4 bg-card border-b border-border">
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
          <span className="font-semibold text-base tracking-tight">FinsightAI</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
