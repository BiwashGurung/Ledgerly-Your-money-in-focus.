import { EMPTY_DATA, type FinanceData, type StoreEnvelope } from './types'
import { isFinanceData } from './validation'

export const STORAGE_KEY = 'ledgerly.finance.v1'
export const STORAGE_VERSION = 1

export type LoadResult =
  | { status: 'ready'; data: FinanceData; migrated: boolean; hasSavedData: boolean }
  | { status: 'unavailable'; data: FinanceData; message: string }
  | { status: 'corrupt' | 'future-version'; data: FinanceData; message: string; raw: string }

function migrateLegacy(value: unknown): FinanceData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const legacy = value as Record<string, unknown>
  if (!Array.isArray(legacy.transactions) || !Array.isArray(legacy.budgets)) return null
  const convertAmount = (item: Record<string, unknown>) => {
    if (Number.isSafeInteger(item.amountMinor)) return item.amountMinor as number
    if (typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0) return Math.round(item.amount * 100)
    return -1
  }
  const transactions = legacy.transactions.map((item) => {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    return {
      id: row.id, title: row.title, type: row.type, amountMinor: convertAmount(row), category: row.category,
      date: row.date, ...(typeof row.paymentMethod === 'string' ? { paymentMethod: row.paymentMethod } : {}),
      ...(typeof row.notes === 'string' ? { notes: row.notes } : {}),
    }
  })
  const budgets = legacy.budgets.map((item) => {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    return { id: row.id, category: row.category, month: row.month, amountMinor: convertAmount(row) }
  })
  const prefs = typeof legacy.preferences === 'object' && legacy.preferences !== null ? legacy.preferences as Record<string, unknown> : {}
  const preferences = {
    currency: prefs.currency ?? legacy.currency ?? 'NPR',
    defaultView: prefs.defaultView ?? 'overview',
  }
  const candidate = { transactions, budgets, preferences }
  return isFinanceData(candidate) ? candidate : null
}

export function readStore(storage: Storage | null): LoadResult {
  if (!storage) return { status: 'unavailable', data: structuredClone(EMPTY_DATA), message: 'Browser storage is unavailable. Your changes will not persist in this session.' }
  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { status: 'ready', data: structuredClone(EMPTY_DATA), migrated: false, hasSavedData: false }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { status: 'corrupt', data: structuredClone(EMPTY_DATA), message: 'Saved data could not be read. Existing browser data has been preserved.', raw }
    const record = parsed as Record<string, unknown>
    if (typeof record.version === 'number' && record.version > STORAGE_VERSION) {
      return { status: 'future-version', data: structuredClone(EMPTY_DATA), message: 'This data was saved by a newer version of Ledgerly. Upgrade the app to use it safely.', raw }
    }
    if (record.version === STORAGE_VERSION && isFinanceData(record.data)) {
      return { status: 'ready', data: record.data, migrated: false, hasSavedData: true }
    }
    if (record.version === 0 || record.version === undefined) {
      const migrated = migrateLegacy(record.version === 0 ? record.data : record)
      if (migrated) return { status: 'ready', data: migrated, migrated: true, hasSavedData: true }
    }
    return { status: 'corrupt', data: structuredClone(EMPTY_DATA), message: 'Saved data is invalid. Existing browser data has been preserved.', raw }
  } catch (error) {
    if (raw !== null) return { status: 'corrupt', data: structuredClone(EMPTY_DATA), message: 'Saved data could not be read. Existing browser data has been preserved.', raw }
    const name = error instanceof DOMException ? error.name : ''
    return { status: 'unavailable', data: structuredClone(EMPTY_DATA), message: name === 'SecurityError' ? 'Browser storage access was blocked. Changes may not persist.' : 'Browser storage could not be read. Changes may not persist.' }
  }
}

export function writeStore(storage: Storage | null, data: FinanceData): { ok: true } | { ok: false; message: string } {
  if (!storage) return { ok: false, message: 'Browser storage is unavailable. Your changes are only in this session.' }
  const envelope: StoreEnvelope = { version: STORAGE_VERSION, updatedAt: new Date().toISOString(), data }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    return { ok: true }
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    return { ok: false, message: name === 'QuotaExceededError' ? 'Storage is full. Export a backup and remove some browser data before saving again.' : 'Could not save to browser storage. Your last saved data is unchanged.' }
  }
}

export function parseBackup(text: string): FinanceData {
  const parsed: unknown = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The file does not contain a Ledgerly backup.')
  const envelope = parsed as Record<string, unknown>
  if (envelope.version !== STORAGE_VERSION || !isFinanceData(envelope.data)) throw new Error('This backup is invalid or uses an unsupported version. Your current data was not changed.')
  return envelope.data
}

export function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ll-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
