import { monthKey } from './dates'
import type { Budget, Transaction } from './types'

export interface Totals {
  income: number
  expenses: number
  net: number
}

export function totalsFor(transactions: Transaction[]): Totals {
  const income = transactions.reduce((sum, item) => sum + (item.type === 'income' ? item.amountMinor : 0), 0)
  const expenses = transactions.reduce((sum, item) => sum + (item.type === 'expense' ? item.amountMinor : 0), 0)
  return { income, expenses, net: income - expenses }
}

export function transactionsForMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((item) => monthKey(item.date) === month)
}

export function expensesByCategory(transactions: Transaction[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.type === 'expense') result.set(transaction.category, (result.get(transaction.category) ?? 0) + transaction.amountMinor)
  }
  return result
}

export function budgetProgress(budget: Budget, transactions: Transaction[]) {
  const spentMinor = transactions
    .filter((item) => item.type === 'expense' && item.category === budget.category && monthKey(item.date) === budget.month)
    .reduce((sum, item) => sum + item.amountMinor, 0)
  const remainingMinor = budget.amountMinor - spentMinor
  const percent = budget.amountMinor > 0 ? (spentMinor / budget.amountMinor) * 100 : 0
  return { spentMinor, remainingMinor, percent, exceeded: percent >= 100, warning: percent >= 80 }
}

export function monthComparison(current: Totals, previous: Totals, currentHasData: boolean, previousHasData: boolean) {
  if (!currentHasData || !previousHasData) return null
  const delta = current.net - previous.net
  const percent = previous.net === 0 ? null : (delta / Math.abs(previous.net)) * 100
  return { delta, percent }
}
