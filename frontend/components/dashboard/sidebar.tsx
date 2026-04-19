"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Receipt,
  Calculator,
  Landmark,
  Scale,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout, getToken } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/config"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/expenses", icon: Receipt, label: "Expense Tracking" },
  { href: "/budget", icon: Calculator, label: "Smart Budget Planner" },
  { href: "/loans", icon: Landmark, label: "Loan Optimization" },
  { href: "/assets", icon: Scale, label: "Assets & Liabilities" },
  { href: "/investments", icon: TrendingUp, label: "Investment Strategy" },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState("User")
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    const fetchUser = async () => {
      const token = getToken()
      if (!token) return
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        if (payload.email) setUserEmail(payload.email)
      } catch {}
      try {
        const res = await fetch(`${API_BASE_URL}/v1/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const profile = await res.json()
          if (profile.full_name) setUserName(profile.full_name)
        }
      } catch {}
    }
    fetchUser()
  }, [])

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header — logo + avatar */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: "linear-gradient(135deg, #E8357A, #7B5EA7)" }}>
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M2 12 L5.5 7.5 L8.5 9.5 L13 3" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-display font-extrabold text-base tracking-tight truncate text-foreground">FinSight AI</span>
          </div>
        )}

        {/* Avatar with dropdown — always visible */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full shrink-0 hover:bg-sidebar-accent",
                collapsed && "mx-auto"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" alt={userName} />
                <AvatarFallback className="text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #E8357A, #7B5EA7)" }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{userName}</span>
                <span className="text-xs font-normal text-muted-foreground truncate">
                  {userEmail || "Loading…"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer gap-2">
              <UserCircle className="w-4 h-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive cursor-pointer gap-2 focus:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "text-white"
                      : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  style={isActive ? {
                    background: "rgba(232,53,122,0.1)",
                    borderLeft: "3px solid #E8357A",
                    paddingLeft: 9,
                    boxShadow: "inset 0 0 20px rgba(232,53,122,0.05)",
                  } : { borderLeft: "3px solid transparent", paddingLeft: 9 }}
                >
                  <item.icon className="w-5 h-5 shrink-0" style={isActive ? { color: "#E8357A" } : {}} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
