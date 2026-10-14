export const CURRENCIES = ['NPR', 'USD', 'GBP', 'EUR', 'INR', 'AUD'] as const
export type Currency = (typeof CURRENCIES)[number]
export type TransactionType = 'income' | 'expense'

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investments', 'Gifts', 'Other income'] as const
export const EXPENSE_CATEGORIES = ['Housing', 'Food & dining', 'Transport', 'Shopping', 'Health', 'Bills & utilities', 'Entertainment', 'Education', 'Travel', 'Personal care', 'Other expense'] as const
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface Transaction {
  id: string
  title: string
  type: TransactionType
  amountMinor: number
  category: string
  date: string
  paymentMethod?: string
  notes?: string
}

export interface Budget {
  id: string
  category: ExpenseCategory
  month: string
  amountMinor: number
}

export interface Preferences {
  currency: Currency
  defaultView: 'overview' | 'transactions' | 'budgets' | 'reports' | 'settings'
}

export interface FinanceData {
  transactions: Transaction[]
  budgets: Budget[]
  preferences: Preferences
}

export interface StoreEnvelope {
  version: 1
  updatedAt: string
  data: FinanceData
}

export const EMPTY_DATA: FinanceData = {
  transactions: [],
  budgets: [],
  preferences: { currency: 'NPR', defaultView: 'overview' },
}

export type PageId = Preferences['defaultView']
