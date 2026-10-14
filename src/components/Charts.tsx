import { useMemo, useState } from 'react'
import { ArrowUpRight, Minus } from 'lucide-react'
import { formatMoney } from '../domain/money'
import { formatMonth } from '../domain/dates'
import type { Currency, Transaction } from '../domain/types'
import { totalsFor, transactionsForMonth } from '../domain/finance'

export function TrendChart({ transactions, months, currency, height = 230 }: { transactions: Transaction[]; months: string[]; currency: Currency; height?: number }) {
  const [activeMonth, setActiveMonth] = useState<string | null>(null)
  const { income, expenses, maxValue } = useMemo(() => {
    const income = months.map((month) => totalsFor(transactionsForMonth(transactions, month)).income / 100)
    const expenses = months.map((month) => totalsFor(transactionsForMonth(transactions, month)).expenses / 100)
    return { income, expenses, maxValue: Math.max(...income, ...expenses, 0) }
  }, [months, transactions])

  if (!transactions.length || maxValue === 0) return <div className="chart-empty"><span className="empty-chart-icon"><Minus size={17} /></span><span>No activity to chart yet</span></div>

  const width = 720
  const left = 54
  const right = 12
  const top = 20
  const bottom = 38
  const plotHeight = height - top - bottom
  const plotWidth = width - left - right
  const axisMax = maxValue * 1.15
  const xAt = (index: number) => left + (months.length < 2 ? plotWidth / 2 : (index / (months.length - 1)) * plotWidth)
  const yAt = (value: number) => top + plotHeight - (value / axisMax) * plotHeight
  const line = (series: number[]) => series.map((value, index) => `${index ? 'L' : 'M'} ${xAt(index)} ${yAt(value)}`).join(' ')
  const ticks = [0, 0.5, 1]
  const abbreviated = months.map((month) => formatMonth(month, { month: 'short' }))

  return (
    <div className="trend-chart-wrap">
      <div className="chart-tooltip-slot" aria-live="polite">{activeMonth && <><strong>{formatMonth(activeMonth)}</strong><span className="income-text">Income {formatMoney(Math.round(income[months.indexOf(activeMonth)] * 100), currency)}</span><span className="expense-text">Expenses {formatMoney(Math.round(expenses[months.indexOf(activeMonth)] * 100), currency)}</span></>}</div>
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Monthly income and expenses from ${formatMonth(months[0])} to ${formatMonth(months[months.length - 1])}`}>
        {ticks.map((tick) => {
          const value = axisMax * tick
          const y = yAt(value)
          return <g key={tick}><line x1={left} y1={y} x2={width - right} y2={y} className="chart-grid" /><text x={left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">{formatMoney(Math.round(value * 100), currency, true)}</text></g>
        })}
        <path d={line(income)} className="chart-income-line" />
        <path d={line(expenses)} className="chart-expense-line" />
        {months.map((month, index) => <g key={month} onMouseEnter={() => setActiveMonth(month)} onMouseLeave={() => setActiveMonth(null)} onFocus={() => setActiveMonth(month)} onBlur={() => setActiveMonth(null)} tabIndex={0} role="button" aria-label={`${formatMonth(month)}: income ${formatMoney(income[index] * 100, currency)}, expenses ${formatMoney(expenses[index] * 100, currency)}`}>
          <circle cx={xAt(index)} cy={yAt(income[index])} r={activeMonth === month ? 5 : 3.5} className="chart-income-dot" />
          <circle cx={xAt(index)} cy={yAt(expenses[index])} r={activeMonth === month ? 5 : 3.5} className="chart-expense-dot" />
          <rect x={xAt(index) - Math.max(14, plotWidth / months.length / 2)} y={top} width={Math.max(28, plotWidth / months.length)} height={plotHeight} fill="transparent" />
          <text x={xAt(index)} y={height - 10} textAnchor="middle" className="chart-axis-label">{abbreviated[index]}</text>
        </g>)}
      </svg>
    </div>
  )
}

export function CategoryBars({ transactions, currency, limit = 6 }: { transactions: Transaction[]; currency: Currency; limit?: number }) {
  const rows = useMemo(() => {
    const sums = new Map<string, number>()
    transactions.forEach((transaction) => {
      if (transaction.type === 'expense') sums.set(transaction.category, (sums.get(transaction.category) ?? 0) + transaction.amountMinor)
    })
    return [...sums].sort((a, b) => b[1] - a[1]).slice(0, limit)
  }, [limit, transactions])
  const max = Math.max(...rows.map(([, amount]) => amount), 0)
  if (!rows.length) return <div className="inline-empty">No expense categories to show.</div>
  return <div className="category-bars">{rows.map(([category, amount], index) => <div className="category-row" key={category}>
    <div className="category-row-top"><span><i className={`category-dot dot-${index % 6}`} />{category}</span><strong>{formatMoney(amount, currency)}</strong></div>
    <div className="category-track"><span className={`category-fill fill-${index % 6}`} style={{ width: `${Math.max(3, (amount / max) * 100)}%` }} /></div>
  </div>)}</div>
}

export function CashFlowBars({ transactions, months, currency }: { transactions: Transaction[]; months: string[]; currency: Currency }) {
  const values = months.map((month) => totalsFor(transactionsForMonth(transactions, month)).net)
  const max = Math.max(...values.map(Math.abs), 0)
  if (!transactions.length || max === 0) return <div className="chart-empty"><span className="empty-chart-icon"><Minus size={17} /></span><span>No cash flow to chart yet</span></div>
  return <div className="cash-flow-bars" role="list" aria-label="Monthly net cash flow">
    {months.map((month, index) => <div className="cash-flow-month" key={month} role="listitem" aria-label={`${formatMonth(month)} net ${formatMoney(values[index], currency)}`}>
      <div className="cash-flow-value">{formatMoney(values[index], currency, true)}</div>
      <div className="cash-flow-track"><span className={values[index] < 0 ? 'negative' : ''} style={{ height: `${Math.max(3, (Math.abs(values[index]) / max) * 100)}%` }} /></div>
      <span className="cash-flow-label">{formatMonth(month, { month: 'short' })}</span>
    </div>)}
  </div>
}

export function BudgetRing({ percent, label }: { percent: number; label: string }) {
  const safe = Math.min(percent, 100)
  return <div className={`budget-ring${percent >= 100 ? ' ring-over' : percent >= 80 ? ' ring-warn' : ''}`} style={{ '--ring-progress': `${safe}%` } as React.CSSProperties} aria-label={`${Math.round(percent)} percent of budget used`} role="img"><span>{label}</span></div>
}

export function NetBadge({ delta, percent, currency }: { delta: number; percent: number | null; currency: Currency }) {
  if (percent === null) return <span className="comparison muted"><Minus size={13} />Net change {delta >= 0 ? '+' : '−'}{formatMoney(Math.abs(delta), currency)} · percentage unavailable</span>
  return <span className={`comparison${delta >= 0 ? ' positive' : ' negative'}`}><ArrowUpRight size={13} />{delta >= 0 ? '+' : ''}{percent.toFixed(1)}% vs previous month</span>
}
