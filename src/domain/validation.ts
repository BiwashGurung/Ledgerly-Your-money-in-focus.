import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Budget, type Currency, type FinanceData, type PageId, type Transaction, type TransactionType } from './types'
import { isValidISODate } from './dates'

export interface TransactionInput {
  title: string
  type: TransactionType
  amountMinor: number
  category: string
  date: string
  paymentMethod: string
  notes: string
}

export function validateTransaction(input: TransactionInput): string | null {
  if (!input.title.trim() || input.title.trim().length > 80) return 'Add a title between 1 and 80 characters.'
  if (input.type !== 'income' && input.type !== 'expense') return 'Choose income or expense.'
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) return 'Enter an amount greater than zero, with up to two decimal places.'
  const categories = input.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  if (!categories.includes(input.category as never)) return 'Choose a category for this transaction type.'
  if (!isValidISODate(input.date)) return 'Choose a valid date.'
  if (input.paymentMethod.trim().length > 50) return 'Payment method must be 50 characters or fewer.'
  if (input.notes.trim().length > 500) return 'Notes must be 500 characters or fewer.'
  return null
}

export function validateBudget(category: string, month: string, amountMinor: number): string | null {
  if (!EXPENSE_CATEGORIES.includes(category as never)) return 'Choose a valid expense category.'
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return 'Choose a valid month.'
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return 'Enter a budget greater than zero, with up to two decimal places.'
  return null
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isMinor = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0
const validTypes = ['income', 'expense'] as const
const validPages: PageId[] = ['overview', 'transactions', 'budgets', 'reports', 'settings']
const validCurrencies: Currency[] = ['NPR', 'USD', 'GBP', 'EUR', 'INR', 'AUD']

export function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false
  const validCategory = value.type === 'income'
    ? INCOME_CATEGORIES.includes(value.category as never)
    : value.type === 'expense' && EXPENSE_CATEGORIES.includes(value.category as never)
  return isString(value.id) && value.id.length > 0 && isString(value.title) && value.title.trim().length > 0 &&
    validTypes.includes(value.type as (typeof validTypes)[number]) && isMinor(value.amountMinor) && value.amountMinor > 0 &&
    validCategory && isString(value.date) && isValidISODate(value.date) &&
    (value.paymentMethod === undefined || isString(value.paymentMethod)) && (value.notes === undefined || isString(value.notes))
}

export function isBudget(value: unknown): value is Budget {
  return isRecord(value) && isString(value.id) && value.id.length > 0 &&
    EXPENSE_CATEGORIES.includes(value.category as never) && isString(value.month) && /^\d{4}-(0[1-9]|1[0-2])$/.test(value.month) &&
    isMinor(value.amountMinor) && value.amountMinor > 0
}

export function isFinanceData(value: unknown): value is FinanceData {
  if (!isRecord(value) || !Array.isArray(value.transactions) || !Array.isArray(value.budgets) || !isRecord(value.preferences)) return false
  const preferences = value.preferences
  if (!validCurrencies.includes(preferences.currency as Currency) || !validPages.includes(preferences.defaultView as PageId)) return false
  if (!value.transactions.every(isTransaction) || !value.budgets.every(isBudget)) return false
  const ids = new Set<string>()
  for (const transaction of value.transactions) {
    if (ids.has(transaction.id)) return false
    ids.add(transaction.id)
  }
  const budgetKeys = new Set<string>()
  for (const budget of value.budgets) {
    const key = `${budget.category}:${budget.month}`
    if (budgetKeys.has(key)) return false
    budgetKeys.add(key)
  }
  return true
}
