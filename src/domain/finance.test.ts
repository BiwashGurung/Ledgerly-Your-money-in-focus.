import { describe, expect, it } from 'vitest'
import { budgetProgress, monthComparison, totalsFor, transactionsForMonth } from './finance'
import { isValidISODate, monthKey, shiftMonth, toLocalISODate } from './dates'
import { formatMoney, parseAmountToMinor } from './money'
import { EMPTY_DATA } from './types'
import { parseBackup, readStore, STORAGE_KEY, writeStore } from './storage'
import { validateBudget, validateTransaction } from './validation'

const rows = [
  { id: 'in', title: 'Pay', type: 'income' as const, amountMinor: 250_000, category: 'Salary', date: '2026-03-31' },
  { id: 'out', title: 'Rent', type: 'expense' as const, amountMinor: 87_500, category: 'Housing', date: '2026-03-01' },
  { id: 'old', title: 'Dinner', type: 'expense' as const, amountMinor: 3_000, category: 'Food & dining', date: '2026-02-28' },
]

function memoryStorage(initial?: string, failWrites = false): Storage {
  let current = initial ?? null
  return {
    get length() { return current === null ? 0 : 1 },
    clear() { current = null },
    key() { return current === null ? null : STORAGE_KEY },
    getItem() { return current },
    removeItem() { current = null },
    setItem(_key, value) { if (failWrites) throw new DOMException('quota', 'QuotaExceededError'); current = value },
  }
}

describe('money calculations', () => {
  it('uses integer minor units and rejects precision beyond cents', () => {
    expect(parseAmountToMinor('2500.75')).toBe(250075)
    expect(parseAmountToMinor('0.01')).toBe(1)
    expect(parseAmountToMinor('0')).toBeNull()
    expect(parseAmountToMinor('1.239')).toBeNull()
    expect(formatMoney(250075, 'NPR')).toContain('2,500.75')
  })

  it('separates income and expenses and calculates net cash flow', () => {
    expect(totalsFor(rows)).toEqual({ income: 250000, expenses: 90500, net: 159500 })
  })

  it('filters by local calendar month boundaries', () => {
    expect(transactionsForMonth(rows, '2026-03').map((row) => row.id)).toEqual(['in', 'out'])
    expect(monthKey('2026-03-01')).toBe('2026-03')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('calculates category budget spending from expenses only and flags 80% and over-limit states', () => {
    const budget = { id: 'b1', category: 'Housing' as const, month: '2026-03', amountMinor: 100000 }
    expect(budgetProgress(budget, rows)).toMatchObject({ spentMinor: 87500, remainingMinor: 12500, warning: true, exceeded: false })
    const over = { ...budget, amountMinor: 80000 }
    expect(budgetProgress(over, rows)).toMatchObject({ spentMinor: 87500, remainingMinor: -7500, warning: true, exceeded: true })
  })

  it('only compares adjacent months when both have transactions', () => {
    const current = totalsFor(rows)
    expect(monthComparison(current, current, true, false)).toBeNull()
    expect(monthComparison({ income: 200, expenses: 80, net: 120 }, { income: 200, expenses: 100, net: 100 }, true, true)).toEqual({ delta: 20, percent: 20 })
    expect(monthComparison({ income: 200, expenses: 200, net: 0 }, { income: 200, expenses: 200, net: 0 }, true, true)?.percent).toBeNull()
  })
})

describe('validation and dates', () => {
  it('validates transaction categories, positive amounts, and calendar dates', () => {
    expect(validateTransaction({ title: '  ', type: 'expense', amountMinor: 100, category: 'Housing', date: '2026-03-01', paymentMethod: '', notes: '' })).toContain('title')
    expect(validateTransaction({ title: 'Good', type: 'expense', amountMinor: 1, category: 'Salary', date: '2026-03-01', paymentMethod: '', notes: '' })).toContain('category')
    expect(validateTransaction({ title: 'Good', type: 'expense', amountMinor: 100, category: 'Housing', date: '2026-02-30', paymentMethod: '', notes: '' })).toContain('valid date')
    expect(validateTransaction({ title: 'Good', type: 'income', amountMinor: 100, category: 'Salary', date: '2026-03-01', paymentMethod: '', notes: '' })).toBeNull()
  })

  it('rejects duplicate budget keys in imported data and validates months', () => {
    expect(validateBudget('Housing', '2026-13', 100)).toContain('month')
    expect(validateBudget('Housing', '2026-03', 100)).toBeNull()
  })

  it('treats date inputs as local calendar dates', () => {
    expect(isValidISODate('2026-03-31')).toBe(true)
    expect(isValidISODate('2026-04-31')).toBe(false)
    expect(toLocalISODate(new Date(2026, 2, 31, 23, 30))).toBe('2026-03-31')
  })
})

describe('versioned local storage', () => {
  it('writes and restores the versioned data envelope', () => {
    const storage = memoryStorage()
    expect(writeStore(storage, { ...EMPTY_DATA, transactions: rows })).toEqual({ ok: true })
    expect(readStore(storage)).toMatchObject({ status: 'ready', hasSavedData: true, data: { transactions: rows } })
    expect(parseBackup(storage.getItem(STORAGE_KEY)!)).toMatchObject({ transactions: rows })
  })

  it('preserves the existing record after a failed quota write', () => {
    const original = JSON.stringify({ version: 1, updatedAt: '2026-03-31T00:00:00.000Z', data: { ...EMPTY_DATA, transactions: rows } })
    const storage = memoryStorage(original, true)
    expect(writeStore(storage, EMPTY_DATA)).toMatchObject({ ok: false })
    expect(storage.getItem(STORAGE_KEY)).toBe(original)
    expect(readStore(storage)).toMatchObject({ status: 'ready', data: { transactions: rows } })
  })

  it('does not accept or overwrite corrupt backups', () => {
    const storage = memoryStorage('{broken')
    expect(readStore(storage).status).toBe('corrupt')
    expect(() => parseBackup('{broken')).toThrow()
    expect(storage.getItem(STORAGE_KEY)).toBe('{broken')
  })
})
