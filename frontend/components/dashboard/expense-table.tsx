"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: "needs" | "wants" | "desires" | "investments"
  merchant: string
}

interface ExpenseTableProps {
  transactions: Transaction[]
  className?: string
}

const categoryColors = {
  needs: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  wants: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  desires: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  investments: "bg-primary/10 text-primary border-primary/20",
}

const categoryLabels = {
  needs: "Needs",
  wants: "Wants",
  desires: "Desires",
  investments: "Investment",
}

export function ExpenseTable({ transactions, className }: ExpenseTableProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {transaction.date}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.merchant}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        categoryColors[transaction.category]
                      )}
                    >
                      {categoryLabels[transaction.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${transaction.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
