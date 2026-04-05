"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PenLine, FileSpreadsheet, FileText, Camera, Upload, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { getToken } from "@/lib/auth"
import { useCurrency } from "@/lib/hooks/useCurrency"
import type { ParsedExpense, ExpenseCategory } from "@/lib/types/expense"

interface ExpenseInputProps {
  className?: string
  onManualAdded?: () => void
  onParseComplete?: (expenses: ParsedExpense[]) => void
}

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error"

export function ExpenseInput({ className, onManualAdded, onParseComplete }: ExpenseInputProps) {
  const { currencySymbol } = useCurrency()

  // Manual form state
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<ExpenseCategory | "">("")
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState("")

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadFileName, setUploadFileName] = useState("")

  const handleManualSubmit = async () => {
    if (!amount || !description) return
    setManualLoading(true)
    setManualError("")

    try {
      const token = getToken()
      const res = await fetch("/api/expenses/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          category: category || "needs",
          expense_date: new Date().toISOString().split("T")[0],
        }),
      })

      if (!res.ok) throw new Error("Failed to add expense")

      setAmount("")
      setDescription("")
      setCategory("")
      onManualAdded?.()
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to add expense")
    } finally {
      setManualLoading(false)
    }
  }

  const handleFileUpload = useCallback(
    async (file: File, fileType: string) => {
      setUploadStatus("uploading")
      setUploadFileName(file.name)
      setUploadMessage("Uploading file...")

      try {
        const token = getToken()
        const formData = new FormData()
        formData.append("file", file)
        formData.append("file_type", fileType)

        setUploadStatus("processing")
        setUploadMessage("AI is parsing and categorizing your expenses...")

        const res = await fetch("/api/expenses/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || errData.detail?.message || "Upload failed")
        }

        const data = await res.json()
        const expenses: ParsedExpense[] = (data.expenses || []).map(
          (e: Record<string, unknown>) => ({
            id: e.id as string,
            description: e.description as string,
            amount: e.amount as number,
            date: (e.date as string) || "",
            category: (e.category as ExpenseCategory) || null,
            subcategory: (e.subcategory as string) || null,
            confidence: (e.confidence as number) || null,
            merchant: (e.merchant as string) || null,
            source: (e.source as string) || fileType,
            user_override: false,
          })
        )

        setUploadStatus("done")
        setUploadMessage(`Parsed ${expenses.length} transactions`)
        onParseComplete?.(expenses)

        // Reset after 3 seconds
        setTimeout(() => {
          setUploadStatus("idle")
          setUploadMessage("")
          setUploadFileName("")
        }, 3000)
      } catch (err) {
        setUploadStatus("error")
        setUploadMessage(err instanceof Error ? err.message : "Upload failed")
      }
    },
    [onParseComplete]
  )

  const csvDropzone = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDrop: (files) => {
      if (files[0]) {
        const ext = files[0].name.split(".").pop()?.toLowerCase()
        handleFileUpload(files[0], ext === "csv" ? "csv" : "excel")
      }
    },
  })

  const pdfDropzone = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDrop: (files) => {
      if (files[0]) handleFileUpload(files[0], "pdf")
    },
  })

  const imageDropzone = useDropzone({
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDrop: (files) => {
      if (files[0]) handleFileUpload(files[0], "image")
    },
  })

  const statusIcon = {
    idle: null,
    uploading: <Loader2 className="w-5 h-5 animate-spin text-primary" />,
    processing: <Sparkles className="w-5 h-5 animate-pulse text-amber-500" />,
    done: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-destructive" />,
  }

  const renderDropZone = (
    dropzone: ReturnType<typeof useDropzone>,
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    buttonLabel: string
  ) => (
    <div
      {...dropzone.getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
        "hover:border-primary/50 hover:bg-primary/5",
        dropzone.isDragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border"
      )}
    >
      <input {...dropzone.getInputProps()} />

      {uploadStatus !== "idle" && uploadFileName ? (
        <div className="flex flex-col items-center gap-3">
          {statusIcon[uploadStatus]}
          <p className="text-sm font-medium">{uploadFileName}</p>
          <p className="text-xs text-muted-foreground">{uploadMessage}</p>
        </div>
      ) : (
        <>
          <div className="mx-auto mb-4 text-muted-foreground">{icon}</div>
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
          <Button variant="outline" type="button" onClick={(e) => e.stopPropagation()}>
            <Upload className="w-4 h-4 mr-2" />
            {buttonLabel}
          </Button>
        </>
      )}
    </div>
  )

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-base">Add Expense</CardTitle>
        <CardDescription>
          Enter expenses manually or upload documents for AI categorization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Spreadsheet</span>
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Receipt</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <Input
                    id="expense-amount"
                    type="number"
                    placeholder="0.00"
                    className="pl-7"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                  <SelectTrigger id="expense-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="needs">Needs</SelectItem>
                    <SelectItem value="wants">Wants</SelectItem>
                    <SelectItem value="desires">Desires</SelectItem>
                    <SelectItem value="investments">Investments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-description">Description</Label>
              <Input
                id="expense-description"
                placeholder="e.g., Grocery shopping at BigBazaar"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {manualError && (
              <p className="text-sm text-destructive">{manualError}</p>
            )}
            <Button
              onClick={handleManualSubmit}
              disabled={!amount || !description || manualLoading}
              className="w-full sm:w-auto"
            >
              {manualLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {manualLoading ? "Adding..." : "Add Expense"}
            </Button>
          </TabsContent>

          <TabsContent value="spreadsheet">
            {renderDropZone(
              csvDropzone,
              <FileSpreadsheet className="w-12 h-12" />,
              "Drag and drop your Excel or CSV file here",
              "AI will automatically map columns and categorize expenses",
              "Browse Files"
            )}
          </TabsContent>

          <TabsContent value="pdf">
            {renderDropZone(
              pdfDropzone,
              <FileText className="w-12 h-12" />,
              "Upload your bank statement or expense PDF",
              "AI will extract and categorize transactions automatically",
              "Upload PDF"
            )}
          </TabsContent>

          <TabsContent value="receipt">
            {renderDropZone(
              imageDropzone,
              <Camera className="w-12 h-12" />,
              "Upload an image of your receipt",
              "AI will extract the amount and categorize it automatically",
              "Upload Image"
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
