import type { Currency } from './types'

export function parseAmountToMinor(value: string): number | null {
  const normalized = value.trim()
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null
}

export function formatMoney(amountMinor: number, currency: Currency, compact = false): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100)
}

export function formatSignedMoney(amountMinor: number, currency: Currency): string {
  const sign = amountMinor > 0 ? '+' : amountMinor < 0 ? '−' : ''
  return `${sign}${formatMoney(Math.abs(amountMinor), currency)}`
}
