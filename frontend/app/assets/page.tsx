"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AssetItem } from "@/components/dashboard/asset-item"
import { AssetAllocationChart } from "@/components/dashboard/asset-allocation-chart"
import { MetricCard } from "@/components/dashboard/metric-card"
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
} from "lucide-react"

const assets = [
  {
    id: "1",
    name: "Primary Residence",
    type: "property" as const,
    value: 450000,
    purchasePrice: 380000,
    purchaseDate: "June 2020",
    category: "asset" as const,
    appreciation: 5.2,
  },
  {
    id: "2",
    name: "Investment Portfolio",
    type: "investment" as const,
    value: 125000,
    purchasePrice: 85000,
    purchaseDate: "January 2019",
    category: "asset" as const,
    appreciation: 8.5,
  },
  {
    id: "3",
    name: "Tesla Model 3",
    type: "vehicle" as const,
    value: 32000,
    purchasePrice: 45000,
    purchaseDate: "March 2022",
    category: "asset" as const,
    appreciation: -12,
  },
  {
    id: "4",
    name: "Emergency Savings",
    type: "cash" as const,
    value: 25000,
    purchasePrice: 25000,
    purchaseDate: "Ongoing",
    category: "asset" as const,
    appreciation: 4.5,
  },
  {
    id: "5",
    name: "Rolex Submariner",
    type: "luxury" as const,
    value: 18000,
    purchasePrice: 12000,
    purchaseDate: "December 2021",
    category: "asset" as const,
    appreciation: 10,
  },
  {
    id: "6",
    name: "401(k) Retirement",
    type: "investment" as const,
    value: 95000,
    purchasePrice: 72000,
    purchaseDate: "January 2018",
    category: "asset" as const,
    appreciation: 7.2,
  },
]

const liabilities = [
  {
    id: "7",
    name: "Mortgage",
    type: "property" as const,
    value: 285000,
    purchasePrice: 350000,
    purchaseDate: "June 2020",
    category: "liability" as const,
    appreciation: 0,
  },
  {
    id: "8",
    name: "Car Loan",
    type: "vehicle" as const,
    value: 18000,
    purchasePrice: 32000,
    purchaseDate: "March 2022",
    category: "liability" as const,
    appreciation: 0,
  },
  {
    id: "9",
    name: "Student Loans",
    type: "other" as const,
    value: 35000,
    purchasePrice: 50000,
    purchaseDate: "September 2015",
    category: "liability" as const,
    appreciation: 0,
  },
  {
    id: "10",
    name: "Credit Card Balance",
    type: "other" as const,
    value: 8500,
    purchasePrice: 8500,
    purchaseDate: "Various",
    category: "liability" as const,
    appreciation: 0,
  },
]

const allocationData = [
  { name: "Real Estate", value: 450000, color: "hsl(var(--chart-1))" },
  { name: "Investments", value: 220000, color: "hsl(var(--primary))" },
  { name: "Vehicles", value: 32000, color: "hsl(var(--chart-2))" },
  { name: "Cash", value: 25000, color: "hsl(var(--chart-3))" },
  { name: "Luxury Items", value: 18000, color: "hsl(var(--chart-4))" },
]

const totalAssets = assets.reduce((sum, a) => sum + a.value, 0)
const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0)
const netWorth = totalAssets - totalLiabilities

export default function AssetsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assets & Liabilities</h1>
            <p className="text-muted-foreground">
              Track your possessions and financial obligations
            </p>
          </div>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Assets"
            value={`$${totalAssets.toLocaleString()}`}
            change={8.4}
            icon={TrendingUp}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Total Liabilities"
            value={`$${totalLiabilities.toLocaleString()}`}
            change={-5.2}
            icon={TrendingDown}
            iconColor="bg-destructive/10 text-destructive"
          />
          <MetricCard
            title="Net Worth"
            value={`$${netWorth.toLocaleString()}`}
            change={12.5}
            icon={Wallet}
            iconColor="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Debt Ratio"
            value={`${((totalLiabilities / totalAssets) * 100).toFixed(1)}%`}
            icon={Scale}
            iconColor="bg-chart-2/10 text-chart-2"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Asset Allocation Chart */}
          <AssetAllocationChart data={allocationData} />

          {/* Assets List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  Assets
                </CardTitle>
                <span className="text-lg font-bold text-success">
                  ${totalAssets.toLocaleString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {assets.map((asset) => (
                <AssetItem key={asset.id} item={asset} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Liabilities List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                Liabilities
              </CardTitle>
              <span className="text-lg font-bold text-destructive">
                ${totalLiabilities.toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {liabilities.map((liability) => (
                <AssetItem key={liability.id} item={liability} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Net Worth Summary */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Scale className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Net Worth</p>
                  <p className="text-3xl font-bold text-primary">
                    ${netWorth.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-sm text-muted-foreground">Year-over-Year Growth</p>
                <p className="text-xl font-bold text-success">+$21,500 (+12.5%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
