"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Receipt,
  Calculator,
  Landmark,
  Scale,
  TrendingUp,
  Settings,
  Sparkles,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/expenses", icon: Receipt, label: "Expense Tracking" },
  { href: "/budget", icon: Calculator, label: "Smart Budget Planner" },
  { href: "/loans", icon: Landmark, label: "Loan Optimization" },
  { href: "/assets", icon: Scale, label: "Assets & Liabilities" },
  { href: "/investments", icon: TrendingUp, label: "Investment Strategy" },
  { href: "/settings", icon: Settings, label: "Settings" },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-lg tracking-tight">FinanceAI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
