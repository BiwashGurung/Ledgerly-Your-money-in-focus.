import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, Info } from 'lucide-react'
import { CashFlowBars, CategoryBars, NetBadge, TrendChart } from '../components/Charts'
import { EmptyState, PageHeading, Panel } from '../components/Layout'
import { formatMonth, shiftMonth } from '../domain/dates'
import { monthComparison, totalsFor, transactionsForMonth } from '../domain/finance'
import { formatMoney } from '../domain/money'
import type { FinanceData } from '../domain/types'

export function Reports({ data, month, setMonth }: { data: FinanceData; month: string; setMonth: (month: string) => void }) {
  const previousMonth = shiftMonth(month, -1)
  const currentEntries = useMemo(() => transactionsForMonth(data.transactions, month), [data.transactions, month])
  const previousEntries = useMemo(() => transactionsForMonth(data.transactions, previousMonth), [data.transactions, previousMonth])
  const current = useMemo(() => totalsFor(currentEntries), [currentEntries])
  const previous = useMemo(() => totalsFor(previousEntries), [previousEntries])
  const comparison = monthComparison(current, previous, currentEntries.length > 0, previousEntries.length > 0)
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5))

  return <>
    <PageHeading eyebrow="THE BIGGER PICTURE" title="Reports" description="Find the patterns behind your everyday choices." action={<><label className="sr-only" htmlFor="reports-month">Select report month</label><input className="month-input" id="reports-month" type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} /></>} />
    {!data.transactions.length ? <Panel className="reports-empty-panel"><EmptyState title="Your insights are taking shape" description="Once you add transactions, your monthly cash flow, category spending, and comparisons will appear here." icon={<ChartNoAxesCombined size={23} />} /></Panel> : <>
      <div className="report-context"><span className="context-dot" />Report for <strong>{formatMonth(month)}</strong></div>
      <section className="report-overview-grid" aria-label="Monthly report">
        <article className="report-highlight"><div className="report-highlight-top"><span>NET CASH FLOW</span><ArrowDownLeft size={17} /></div><strong className={current.net < 0 ? 'negative-value' : ''}>{formatMoney(current.net, data.preferences.currency)}</strong><span className="report-highlight-caption">Income minus expenses in {formatMonth(month, { month: 'short', year: 'numeric' })}</span>{comparison ? <NetBadge delta={comparison.delta} percent={comparison.percent} currency={data.preferences.currency} /> : <span className="comparison muted"><Info size={13} />Comparison available when both months have activity</span>}</article>
        <ReportMetric label="Income" value={formatMoney(current.income, data.preferences.currency)} icon={<ArrowDownLeft size={17} />} tone="mint" hasComparison={comparison !== null} current={current.income} previous={previous.income} currency={data.preferences.currency} />
        <ReportMetric label="Expenses" value={formatMoney(current.expenses, data.preferences.currency)} icon={<ArrowUpRight size={17} />} tone="lavender" hasComparison={comparison !== null} current={current.expenses} previous={previous.expenses} currency={data.preferences.currency} />
      </section>
      <section className="reports-grid">
        <Panel title="Income & expenses" subtitle="Monthly movement over the last six months" action={<span className="chart-legend"><i className="legend-income" />Income<i className="legend-expense" />Expenses</span>}><TrendChart transactions={data.transactions} months={months} currency={data.preferences.currency} /></Panel>
        <Panel title="Category spending" subtitle={`Expenses in ${formatMonth(month)}`}><CategoryBars transactions={currentEntries} currency={data.preferences.currency} limit={7} /></Panel>
      </section>
      <Panel title="Monthly net cash flow" subtitle="How much more came in than went out each month" className="cashflow-panel"><CashFlowBars transactions={data.transactions} months={months} currency={data.preferences.currency} /></Panel>
      {!comparison && <p className="comparison-note"><Info size={15} />Previous-month comparisons appear after there is at least one saved transaction in both {formatMonth(month)} and {formatMonth(previousMonth)}.</p>}
    </>}
  </>
}

function ReportMetric({ label, value, icon, tone, hasComparison, current, previous, currency }: { label: string; value: string; icon: React.ReactNode; tone: 'mint' | 'lavender'; hasComparison: boolean; current: number; previous: number; currency: FinanceData['preferences']['currency'] }) {
  const change = current - previous
  const percent = previous === 0 ? null : (change / previous) * 100
  const comparison = !hasComparison
    ? <span className="stat-foot">No previous-month baseline</span>
    : percent === null
      ? <span className="comparison muted">Change {change >= 0 ? '+' : '−'}{formatMoney(Math.abs(change), currency)} · percentage unavailable</span>
      : <span className={`comparison ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(percent).toFixed(1)}% vs previous month</span>
  return <article className="report-metric"><div className="stat-top"><span className="stat-label">{label}</span><span className={`stat-icon ${tone}-icon`}>{icon}</span></div><strong className="report-metric-value">{value}</strong>{comparison}</article>
}
