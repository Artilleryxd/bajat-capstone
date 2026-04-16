"use client"

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react"
import { getToken } from "@/lib/auth"
import {
  getCurrencyCode,
  getCurrencySymbolFromCode,
} from "@/lib/utils/countryToCurrency"

interface CurrencyContextValue {
  /** ISO 4217 currency code, e.g. "INR", "USD", "EUR" */
  currencyCode: string
  /** Localized symbol, e.g. "₹", "$", "€" */
  currencySymbol: string
  /** Format a number as currency using the user's profile currency */
  formatCurrency: (amount: number | null | undefined) => string
  /** Format a number as compact currency (e.g. $12K, EUR 1.2M) */
  formatCompactCurrency: (amount: number | null | undefined) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

interface CurrencyProviderProps {
  children: ReactNode
  /** Optional override — if you already have the currency code, pass it directly
   *  instead of making an extra API call. */
  currencyCode?: string
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

        const res = await fetch("/api/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) return

        const data = await res.json()
        // Prefer explicit profile currency; derive from country code as fallback.
        const resolvedCode =
          typeof data.currency === "string" && data.currency.trim().length > 0
            ? data.currency.trim().toUpperCase()
            : getCurrencyCode(typeof data.country === "string" ? data.country : "")

        setCode(resolvedCode)
      } catch {
        // Silently fall back to default
      }
    }

    fetchCurrency()
  }, [codeProp])

  const value = useMemo<CurrencyContextValue>(() => {
    const currencySymbol = getCurrencySymbolFromCode(code)

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

    const formatCompactCurrency = (amount: number | null | undefined): string => {
      if (amount == null) return ""
      try {
        return new Intl.NumberFormat("en", {
          style: "currency",
          currency: code,
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(amount)
      } catch {
        return formatCurrency(amount)
      }
    }

    return {
      currencyCode: code,
      currencySymbol,
      formatCurrency,
      formatCompactCurrency,
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
      currencySymbol: getCurrencySymbolFromCode("USD"),
      formatCurrency: (amount) => {
        if (amount == null) return ""
        return `${getCurrencySymbolFromCode("USD")}${amount.toLocaleString()}`
      },
      formatCompactCurrency: (amount) => {
        if (amount == null) return ""
        try {
          return new Intl.NumberFormat("en", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(amount)
        } catch {
          return `${getCurrencySymbolFromCode("USD")}${amount.toLocaleString()}`
        }
      },
    }
  }
  return ctx
}
