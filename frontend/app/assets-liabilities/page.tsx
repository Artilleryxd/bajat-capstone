"use client"

import { useState } from "react"
import { format } from "date-fns"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Plus, TrendingUp, TrendingDown, CalendarIcon, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/useCurrency"

type ItemType = "asset" | "liability"
type Outlook = "increase" | "decrease"

interface FinancialItem {
  id: string
  type: ItemType
  name: string
  value: number
  description: string
  outlook: Outlook
  dateAdded: Date
}

export default function AssetsLiabilitiesPage() {
  const { formatCurrency } = useCurrency()
  const [items, setItems] = useState<FinancialItem[]>([
    {
      id: "1",
      type: "asset",
      name: "Primary Residence",
      value: 450000,
      description: "My main home in the city suburbs.",
      outlook: "increase",
      dateAdded: new Date(2023, 5, 15),
    },
    {
      id: "2",
      type: "liability",
      name: "Car Loan",
      value: 12500,
      description: "Loan for the Tesla Model 3.",
      outlook: "decrease",
      dateAdded: new Date(2024, 2, 10),
    }
  ])

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newItemType, setNewItemType] = useState<ItemType>("asset")
  const [newItemName, setNewItemName] = useState("")
  const [newItemValue, setNewItemValue] = useState("")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [newItemOutlook, setNewItemOutlook] = useState<Outlook>("increase")
  const [newItemDate, setNewItemDate] = useState<Date | undefined>(new Date())

  const handleAddItem = () => {
    if (!newItemName || !newItemValue || !newItemDate) return

    const newItem: FinancialItem = {
      id: Math.random().toString(36).substring(7),
      type: newItemType,
      name: newItemName,
      value: parseFloat(newItemValue),
      description: newItemDescription,
      outlook: newItemOutlook,
      dateAdded: newItemDate,
    }

    setItems((prev) => [...prev, newItem])
    setIsDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setNewItemType("asset")
    setNewItemName("")
    setNewItemValue("")
    setNewItemDescription("")
    setNewItemOutlook("increase")
    setNewItemDate(new Date())
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assets & Liabilities</h1>
            <p className="text-muted-foreground mt-1">
              Track what you own and what you owe to monitor your net worth.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto shadow-md transition-transform hover:scale-105" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] backdrop-blur-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Add New Financial Item</DialogTitle>
                <DialogDescription>
                  Enter the details of your new asset or liability here.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {/* Type Toggle */}
                <div className="flex flex-col gap-2">
                  <Label>Item Type</Label>
                  <Tabs value={newItemType} onValueChange={(v) => setNewItemType(v as ItemType)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="asset" className="data-[state=active]:bg-success/10 data-[state=active]:text-success data-[state=active]:font-semibold">
                        Asset
                      </TabsTrigger>
                      <TabsTrigger value="liability" className="data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive data-[state=active]:font-semibold">
                        Liability
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Name & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Savings Account" 
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="value">Net Value</Label>
                    <Input 
                      id="value" 
                      type="number" 
                      placeholder="0.00" 
                      value={newItemValue}
                      onChange={(e) => setNewItemValue(e.target.value)}
                    />
                  </div>
                </div>

                {/* Date Added */}
                <div className="flex flex-col gap-2">
                  <Label>Date Added</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newItemDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newItemDate ? format(newItemDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newItemDate}
                        onSelect={setNewItemDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Outlook Select */}
                <div className="flex flex-col gap-2">
                  <Label>Future Outlook</Label>
                  <Select value={newItemOutlook} onValueChange={(v) => setNewItemOutlook(v as Outlook)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outlook trend" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2 text-emerald-500" />
                          <span>Appreciate (Value will Increase)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="decrease">
                        <div className="flex items-center">
                          <TrendingDown className="w-4 h-4 mr-2 text-red-500" />
                          <span>Depreciate (Value will Decrease)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Description & Notes</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Add any extra details about this item..."
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="resize-none h-24"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleAddItem} disabled={!newItemName || !newItemValue || !newItemDate}>
                  Save Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Data Display section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Your Financial Portfolio</CardTitle>
            <CardDescription>
              A detailed view of all your tracked assets and liabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/20 border-dashed">
                <Minus className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No items yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Click 'Add New Item' to start tracking your assets and liabilities.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead>Description & Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border",
                            item.type === "asset" 
                              ? "bg-success/10 text-success border-success/20" 
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className={cn(
                          "font-medium",
                          item.type === "asset" ? "text-success" : "text-destructive"
                        )}>
                          {formatCurrency(item.value)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(item.dateAdded, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 text-sm text-muted-foreground">
                              {item.description || "—"}
                            </div>
                            <div className="flex-shrink-0" title={item.outlook === "increase" ? "Expected to increase in value" : "Expected to decrease in value"}>
                              {item.outlook === "increase" 
                                ? <TrendingUp className="w-5 h-5 text-emerald-500" />
                                : <TrendingDown className="w-5 h-5 text-red-500" />
                              }
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
