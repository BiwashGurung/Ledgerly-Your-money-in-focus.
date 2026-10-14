export function toLocalISODate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function monthKey(date: string): string {
  return date.slice(0, 7)
}

export function currentMonthKey(now = new Date()): string {
  return toLocalISODate(now).slice(0, 7)
}

export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const shifted = new Date(year, monthNumber - 1 + offset, 1)
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonth(month: string, options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, monthNumber - 1, 1))
}

export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day))
}
