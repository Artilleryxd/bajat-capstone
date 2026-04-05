"use client"

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react"
import { getToken } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/config"

interface CurrencyContextValue {
  /** ISO 4217 currency code, e.g. "INR", "USD", "EUR" */
  currencyCode: string
  /** Localized symbol, e.g. "₹", "$", "€" */
  currencySymbol: string
  /** Format a number as currency using the user's profile currency */
  formatCurrency: (amount: number | null | undefined) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

interface CurrencyProviderProps {
  children: ReactNode
  /** Optional override — if you already have the currency code, pass it directly
   *  instead of making an extra API call. */
  currencyCode?: string
}

/**
 * Resolves the currency symbol from a currency code using Intl.
 * Falls back to the code itself if Intl can't resolve it.
 */
function resolveSymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0)

    const symbolPart = parts.find((p) => p.type === "currency")
    return symbolPart?.value ?? code
  } catch {
    return code
  }
}

export function CurrencyProvider({ children, currencyCode: codeProp }: CurrencyProviderProps) {
  const [code, setCode] = useState<string>(codeProp ?? "USD")

  // If no code is provided as a prop, fetch from profile
  useEffect(() => {
    if (codeProp) {
      setCode(codeProp)
      return
    }

    async function fetchCurrency() {
      try {
        const token = getToken()
        if (!token) return

        const res = await fetch(`${API_BASE_URL}/v1/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) return

        const data = await res.json()
        if (data.currency) {
          setCode(data.currency)
        }
      } catch {
        // Silently fall back to default
      }
    }

    fetchCurrency()
  }, [codeProp])

  const value = useMemo<CurrencyContextValue>(() => {
    const currencySymbol = resolveSymbol(code)

    const formatCurrency = (amount: number | null | undefined): string => {
      if (amount == null) return ""
      try {
        return new Intl.NumberFormat("en", {
          style: "currency",
          currency: code,
          maximumFractionDigits: 0,
        }).format(amount)
      } catch {
        // Fallback if an invalid currency code somehow gets through
        return `${currencySymbol}${amount.toLocaleString()}`
      }
    }

    return {
      currencyCode: code,
      currencySymbol,
      formatCurrency,
    }
  }, [code])

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

/**
 * Hook to access the current user's currency formatting.
 * Must be used within a <CurrencyProvider>.
 */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    // Return sensible defaults if used outside provider (e.g. onboarding)
    return {
      currencyCode: "USD",
      currencySymbol: "$",
      formatCurrency: (amount) => {
        if (amount == null) return ""
        return `$${amount.toLocaleString()}`
      },
    }
  }
  return ctx
}
