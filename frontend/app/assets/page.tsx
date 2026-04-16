"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Home, Car, CircleDollarSign, TrendingUp, Wallet,
  Smartphone, Building2, Plus, ChevronRight,
  TrendingDown, Loader2, Sparkles, Scale, X,
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MetricCard } from "@/components/dashboard/metric-card"
import { AssetAllocationChart } from "@/components/dashboard/asset-allocation-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { fetchWithAuth } from "@/lib/auth"
import { useCurrency } from "@/lib/hooks/useCurrency"
import type {
  Asset, DrilldownData, NetWorthSummary,
} from "@/lib/types/asset"
import { ASSET_TYPE_COLORS } from "@/lib/types/asset"

// ── Icon + label config per asset_type ──
const ASSET_TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  real_estate: { label: "Real Estate",    Icon: Home,              color: ASSET_TYPE_COLORS.real_estate },
  vehicle:     { label: "Vehicle",        Icon: Car,               color: ASSET_TYPE_COLORS.vehicle },
  gold:        { label: "Gold",           Icon: CircleDollarSign,  color: ASSET_TYPE_COLORS.gold },
  equity:      { label: "Equity",         Icon: TrendingUp,        color: ASSET_TYPE_COLORS.equity },
  fd:          { label: "Fixed Deposit",  Icon: Wallet,            color: ASSET_TYPE_COLORS.fd },
  gadget:      { label: "Gadget",         Icon: Smartphone,        color: ASSET_TYPE_COLORS.gadget },
  other:       { label: "Other",          Icon: Building2,         color: ASSET_TYPE_COLORS.other },
}

const LOAN_TYPE_OPTIONS = [
  "Home Loan", "Car Loan", "Personal Loan",
  "Education Loan", "Credit Card", "Business Loan", "Gold Loan", "Other",
]

// ── Helpers ──
function assetConfig(type: string) {
  return ASSET_TYPE_CONFIG[type] ?? ASSET_TYPE_CONFIG.other
}

function assetCurrentValue(a: Asset) {
  return Number(a.current_value ?? a.purchase_price ?? 0)
}

// ── Main page ──
export default function AssetsPage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()

  // Data
  const [assets, setAssets]       = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<any[]>([])
  const [netWorth, setNetWorth]   = useState<NetWorthSummary | null>(null)
  const [loading, setLoading]     = useState(true)

  // Drill-down sheet
  const [sheetOpen, setSheetOpen]         = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [drilldown, setDrilldown]         = useState<DrilldownData | null>(null)
  const [drillLoading, setDrillLoading]   = useState(false)

  // Add-item modal
  const [modalOpen, setModalOpen]   = useState(false)
  const [addStep, setAddStep]       = useState<"choose" | "asset" | "liability">("choose")
  const [submitting, setSubmitting] = useState(false)

  // Asset form
  const [assetName, setAssetName]         = useState("")
  const [assetDesc, setAssetDesc]         = useState("")
  const [assetPrice, setAssetPrice]       = useState("")
  const [assetDate, setAssetDate]         = useState("")

  // Liability form
  const [liabType, setLiabType]           = useState("")
  const [liabLender, setLiabLender]       = useState("")
  const [liabPrincipal, setLiabPrincipal] = useState("")
  const [liabRate, setLiabRate]           = useState("")
  const [liabEmi, setLiabEmi]             = useState("")
  const [liabEmis, setLiabEmis]           = useState("")

  // ── Fetch all data ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [assetsRes, liabRes, nwRes] = await Promise.all([
        fetchWithAuth("/api/assets/all"),
        fetchWithAuth("/api/assets/liabilities"),
        fetchWithAuth("/api/assets/networth"),
      ])

      if (assetsRes.ok) {
        const d = await assetsRes.json()
        setAssets(d.assets ?? [])
      }
      if (liabRes.ok) {
        const d = await liabRes.json()
        setLiabilities(d.liabilities ?? [])
      }
      if (nwRes.ok) {
        const d = await nwRes.json()
        setNetWorth(d)
      }
    } catch {
      toast.error("Failed to load asset data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Drill-down ──
  const openDrilldown = async (asset: Asset) => {
    setSelectedAsset(asset)
    setDrilldown(null)
    setSheetOpen(true)
    setDrillLoading(true)
    try {
      const res = await fetchWithAuth(`/api/assets/drilldown/${asset.id}`)
      if (!res.ok) throw new Error("Drilldown fetch failed")
      setDrilldown(await res.json())
    } catch {
      toast.error("Could not load asset details")
      setSheetOpen(false)
    } finally {
      setDrillLoading(false)
    }
  }

  // ── Add asset ──
  const handleAddAsset = async () => {
    if (!assetName.trim() || !assetPrice) {
      toast.error("Name and purchase price are required")
      return
    }
    const price = parseFloat(assetPrice)
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid purchase price")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetchWithAuth("/api/assets/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: assetName.trim(),
          description: assetDesc.trim() || undefined,
          purchase_price: price,
          purchase_date: assetDate || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail?.message ?? "Failed to add asset")
      }
      toast.success("Asset added! AI has estimated its current value.")
      resetModal()
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add asset")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Add liability ──
  const handleAddLiability = async () => {
    if (!liabType || !liabPrincipal || !liabRate || !liabEmi || !liabEmis) {
      toast.error("All required fields must be filled")
      return
    }
    const principal = parseFloat(liabPrincipal)
    const rate      = parseFloat(liabRate)
    const emi       = parseFloat(liabEmi)
    const emis      = parseInt(liabEmis, 10)
    if ([principal, rate, emi].some(isNaN) || isNaN(emis) || principal <= 0 || emi <= 0 || emis <= 0) {
      toast.error("Enter valid positive values")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetchWithAuth("/api/assets/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_type: liabType,
          lender: liabLender.trim() || undefined,
          principal_outstanding: principal,
          interest_rate: rate,
          emi_amount: emi,
          emis_remaining: emis,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail?.message ?? "Failed to add liability")
      }
      toast.success("Liability added and visible in the Loans section too.")
      resetModal()
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add liability")
    } finally {
      setSubmitting(false)
    }
  }

  const resetModal = () => {
    setModalOpen(false)
    setAddStep("choose")
    setAssetName(""); setAssetDesc(""); setAssetPrice(""); setAssetDate("")
    setLiabType(""); setLiabLender(""); setLiabPrincipal("")
    setLiabRate(""); setLiabEmi(""); setLiabEmis("")
  }

  // ── Derived values ──
  const totalAssets      = netWorth?.total_assets ?? assets.reduce((s, a) => s + assetCurrentValue(a), 0)
  const totalLiabilities = netWorth?.total_liabilities ?? liabilities.reduce((s: number, l: any) => s + Number(l.principal_outstanding ?? 0), 0)
  const netWorthVal      = totalAssets - totalLiabilities
  const debtRatio        = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0

  // Allocation chart data grouped by asset type
  const allocationData = (() => {
    const map: Record<string, { name: string; value: number; color: string }> = {}
    for (const a of assets) {
      const cfg = assetConfig(a.asset_type)
      if (!map[a.asset_type]) map[a.asset_type] = { name: cfg.label, value: 0, color: cfg.color }
      map[a.asset_type].value += assetCurrentValue(a)
    }
    return Object.values(map).filter(d => d.value > 0)
  })()

  // Projection chart data for the drill-down sheet
  const projectionChartData = (() => {
    if (!drilldown) return []
    const proj = drilldown.ai_projection?.projections ?? drilldown.projections
    return [
      { year: "Now",  value: drilldown.current_value },
      ...([1, 2, 3, 4, 5] as const).map(y => ({
        year: `Yr ${y}`,
        value: Math.round(proj[String(y)] ?? 0),
      })),
    ]
  })()

  // ── Loading ──
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assets &amp; Liabilities</h1>
            <p className="text-muted-foreground">Track your net worth with AI-powered valuations</p>
          </div>
          <Button onClick={() => { setModalOpen(true); setAddStep("choose") }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* ── Metric cards ── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Assets"
            value={formatCurrency(totalAssets)}
            change={undefined}
            icon={TrendingUp}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Total Liabilities"
            value={formatCurrency(totalLiabilities)}
            change={undefined}
            icon={TrendingDown}
            iconColor="bg-destructive/10 text-destructive"
          />
          <MetricCard
            title="Net Worth"
            value={formatCurrency(netWorthVal)}
            change={undefined}
            icon={Wallet}
            iconColor="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Debt Ratio"
            value={`${debtRatio.toFixed(1)}%`}
            change={undefined}
            icon={Scale}
            iconColor="bg-chart-2/10 text-chart-2"
          />
        </div>

        {/* ── Allocation chart + Assets list ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {allocationData.length > 0 ? (
            <AssetAllocationChart data={allocationData} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
                No assets yet
              </CardContent>
            </Card>
          )}

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  Assets
                </CardTitle>
                <span className="text-lg font-bold text-success">{formatCurrency(totalAssets)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {assets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No assets added yet. Click &quot;Add Item&quot; to get started.
                </p>
              ) : (
                assets.map(asset => {
                  const cfg = assetConfig(asset.asset_type)
                  const cv = assetCurrentValue(asset)
                  const pp = Number(asset.purchase_price ?? 0)
                  const gainPct = pp > 0 ? ((cv - pp) / pp) * 100 : 0
                  const isUp = gainPct >= 0
                  return (
                    <Card
                      key={asset.id}
                      className="cursor-pointer transition-colors hover:bg-secondary/50"
                      onClick={() => openDrilldown(asset)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-success/10 text-success">
                            <cfg.Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">{cfg.label}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(cv)}</p>
                            <p className={cn("text-xs flex items-center justify-end gap-0.5",
                              isUp ? "text-success" : "text-destructive")}>
                              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {isUp ? "+" : ""}{gainPct.toFixed(1)}%
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Liabilities list ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                Liabilities
              </CardTitle>
              <span className="text-lg font-bold text-destructive">{formatCurrency(totalLiabilities)}</span>
            </div>
          </CardHeader>
          <CardContent>
            {liabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No liabilities. Use &quot;Add Item&quot; to add a loan or liability.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {liabilities.map((l: any) => (
                  <Card key={l.id} className="bg-destructive/5">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{l.loan_type}</p>
                          {l.lender && <p className="text-xs text-muted-foreground">{l.lender}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-destructive">{formatCurrency(l.principal_outstanding)}</p>
                          <p className="text-xs text-muted-foreground">EMI {formatCurrency(l.emi_amount)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{l.emis_remaining} EMIs left</span>
                        <span>·</span>
                        <span>{l.interest_rate}% p.a.</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Net worth summary ── */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Scale className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Net Worth</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(netWorthVal)}</p>
                </div>
              </div>
              {netWorth?.approx_net_worth && (
                <div className="text-center sm:text-right">
                  <p className="text-sm text-muted-foreground">AI Estimate</p>
                  <p className="text-xl font-bold">{formatCurrency(netWorth.approx_net_worth)}</p>
                  {netWorth.approx_confidence && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round(netWorth.approx_confidence * 100)}% confidence
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ──────────────────────────────────────────────
          Add Item Modal
      ────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) resetModal(); else setModalOpen(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addStep === "choose" ? "What are you adding?" :
               addStep === "asset" ? "Add Asset" : "Add Liability"}
            </DialogTitle>
            <DialogDescription>
              {addStep === "choose"
                ? "Assets appreciate in value; liabilities are loans or debts you owe."
                : addStep === "asset"
                ? "AI will automatically categorize and estimate the current value."
                : "This will also appear in your Loans section."}
            </DialogDescription>
          </DialogHeader>

          {/* ── Step 1: choose ── */}
          {addStep === "choose" && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => setAddStep("asset")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-success/30 bg-success/5 hover:bg-success/10 transition-colors"
              >
                <TrendingUp className="w-8 h-8 text-success" />
                <div className="text-center">
                  <p className="font-semibold">Asset</p>
                  <p className="text-xs text-muted-foreground">Property, gold, investments…</p>
                </div>
              </button>
              <button
                onClick={() => setAddStep("liability")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors"
              >
                <TrendingDown className="w-8 h-8 text-destructive" />
                <div className="text-center">
                  <p className="font-semibold">Liability</p>
                  <p className="text-xs text-muted-foreground">Loans, credit card debt…</p>
                </div>
              </button>
            </div>
          )}

          {/* ── Step 2a: asset form ── */}
          {addStep === "asset" && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label>Asset Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. 2BHK Apartment Powai, Honda City 2020"
                  value={assetName}
                  onChange={e => setAssetName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description <span className="text-muted-foreground text-xs">(helps AI value it accurately)</span></Label>
                <Input
                  placeholder="e.g. 950 sq ft, west-facing, near metro"
                  value={assetDesc}
                  onChange={e => setAssetDesc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Purchase Price <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={assetPrice}
                    onChange={e => setAssetPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={assetDate}
                    onChange={e => setAssetDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setAddStep("choose")} disabled={submitting}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleAddAsset} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {submitting ? "Saving…" : "Add Asset"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2b: liability form ── */}
          {addStep === "liability" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Loan Type <span className="text-destructive">*</span></Label>
                  <Select value={liabType} onValueChange={setLiabType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {LOAN_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Lender</Label>
                  <Input placeholder="e.g. HDFC Bank" value={liabLender} onChange={e => setLiabLender(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Outstanding Balance <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="0" min={0} value={liabPrincipal} onChange={e => setLiabPrincipal(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Interest Rate (%) <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="0" min={0} max={100} step={0.01} value={liabRate} onChange={e => setLiabRate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>EMI Amount <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="0" min={0} value={liabEmi} onChange={e => setLiabEmi(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>EMIs Remaining <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="0" min={1} value={liabEmis} onChange={e => setLiabEmis(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setAddStep("choose")} disabled={submitting}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleAddLiability} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {submitting ? "Saving…" : "Add Liability"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────
          Drill-down Sheet (AI-powered)
      ────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedAsset && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10 text-success">
                    {(() => { const Ic = assetConfig(selectedAsset.asset_type).Icon; return <Ic className="w-5 h-5" /> })()}
                  </div>
                  <div>
                    <SheetTitle className="text-left">{selectedAsset.name}</SheetTitle>
                    <SheetDescription className="text-left">
                      {assetConfig(selectedAsset.asset_type).label}
                      {selectedAsset.purchase_date && ` · Purchased ${selectedAsset.purchase_date}`}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {drillLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">AI is analysing your asset…</p>
                </div>
              ) : drilldown ? (
                <div className="space-y-5">

                  {/* Price summary 2×2 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                      <p className="text-lg font-bold">{formatCurrency(drilldown.current_value)}</p>
                      {drilldown.ai_projection && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Sparkles className="w-3 h-3 text-primary" /> AI estimated
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-xs text-muted-foreground mb-1">Purchase Price</p>
                      <p className="text-lg font-bold">{formatCurrency(drilldown.purchase_price)}</p>
                      {selectedAsset.purchase_date && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{selectedAsset.purchase_date}</p>
                      )}
                    </div>
                  </div>

                  {/* Gain / Loss */}
                  {drilldown.purchase_price > 0 && (() => {
                    const gain = drilldown.current_value - drilldown.purchase_price
                    const isUp = gain >= 0
                    return (
                      <div className={cn("rounded-lg border p-3", isUp ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
                        <p className="text-xs text-muted-foreground mb-1">Total Gain / Loss</p>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-xl font-bold", isUp ? "text-success" : "text-destructive")}>
                            {isUp ? "+" : "−"}{formatCurrency(Math.abs(gain))}
                          </span>
                          <Badge variant="outline" className={cn("text-sm", isUp
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-destructive/10 text-destructive border-destructive/20")}>
                            {isUp ? "+" : ""}{drilldown.appreciation_pct.toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(drilldown.appreciation_rate * 100).toFixed(1)}% annual rate
                        </p>
                      </div>
                    )
                  })()}

                  {/* AI reasoning for current value */}
                  {drilldown.ai_projection?.current_reasoning && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{drilldown.ai_projection.current_reasoning}</span>
                    </div>
                  )}

                  {/* 5-year projection chart */}
                  <div>
                    <p className="text-sm font-semibold mb-3">5-Year Projection</p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectionChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis
                            tickFormatter={v => formatCurrency(v).replace(/\.00$/, "")}
                            tick={{ fontSize: 10 }}
                            width={70}
                          />
                          <RechartsTooltip
                            formatter={(v: number) => [formatCurrency(v), "Est. Value"]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#projGrad)"
                            dot={{ r: 4, fill: "hsl(var(--primary))" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Year breakdown table */}
                    <div className="mt-3 divide-y divide-border rounded-lg border overflow-hidden">
                      {projectionChartData.slice(1).map(({ year, value }) => (
                        <div key={year} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="text-muted-foreground">{year}</span>
                          <span className="font-medium">{formatCurrency(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI projection reasoning */}
                  {drilldown.ai_projection?.projection_reasoning && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{drilldown.ai_projection.projection_reasoning}</span>
                    </div>
                  )}

                </div>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>

    </DashboardLayout>
  )
}
