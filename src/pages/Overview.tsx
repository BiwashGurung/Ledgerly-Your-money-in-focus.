import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, TrendingUp, Wallet } from 'lucide-react'
import { BudgetRing, CategoryBars, TrendChart } from '../components/Charts'
import { EmptyState, PageHeading, Panel } from '../components/Layout'
import { Modal } from '../components/Modal'
import { TransactionForm, type TransactionDraft } from '../components/TransactionForm'
import { budgetProgress, expensesByCategory, totalsFor, transactionsForMonth } from '../domain/finance'
import { formatDate, formatMonth, shiftMonth } from '../domain/dates'
import { formatMoney } from '../domain/money'
import { createId } from '../domain/storage'
import type { Budget, Currency, FinanceData, Transaction } from '../domain/types'

export function Overview({ data, month, setMonth, onNavigate, onAddTransaction }: { data: FinanceData; month: string; setMonth: (month: string) => void; onNavigate: (page: 'transactions' | 'budgets') => void; onAddTransaction: (transaction: Transaction) => void }) {
  const [addOpen, setAddOpen] = useState(false)
  const monthTransactions = useMemo(() => transactionsForMonth(data.transactions, month), [data.transactions, month])
  const monthlyTotals = useMemo(() => totalsFor(monthTransactions), [monthTransactions])
  const lifetimeNet = useMemo(() => totalsFor(data.transactions).net, [data.transactions])
  const savingsRate = monthlyTotals.income > 0 ? (monthlyTotals.net / monthlyTotals.income) * 100 : null
  const recent = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5)
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5))
  const categoryRows = [...expensesByCategory(monthTransactions)].sort((a, b) => b[1] - a[1])
  const selectedBudgets = data.budgets.filter((budget) => budget.month === month).sort((a, b) => a.category.localeCompare(b.category))
  const hasData = data.transactions.length > 0

  function add(draft: TransactionDraft) {
    onAddTransaction({ ...draft, id: createId(), title: draft.title.trim(), paymentMethod: draft.paymentMethod.trim(), notes: draft.notes.trim() })
    setAddOpen(false)
    return null
  }

  return <>
    <PageHeading eyebrow="PERSONAL FINANCE" title="Your overview" description="A thoughtful look at where your money stands." action={<><label className="sr-only" htmlFor="overview-month">Select month</label><input className="month-input" id="overview-month" type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} /><button className="button button-primary" type="button" onClick={() => setAddOpen(true)}><Plus size={17} />Add transaction</button></>} />
    {!hasData ? <Panel className="overview-empty-panel"><EmptyState title="A clearer picture starts here" description="Add your first transaction to see your balance, monthly rhythm, and spending patterns take shape. Your numbers stay on this device." icon={<Wallet size={23} />} action={<button type="button" className="button button-primary" onClick={() => setAddOpen(true)}><Plus size={17} />Add your first transaction</button>} /></Panel> : <>
      <div className="overview-context"><span className="context-dot" />Showing <strong>{formatMonth(month)}</strong><span className="context-separator">·</span>Current balance includes all saved transactions</div>
      <section className="stat-grid" aria-label="Financial summary">
        <article className="stat-card balance-card"><div className="stat-top"><span className="stat-label">Current balance</span><span className="stat-icon dark-icon"><Wallet size={17} /></span></div><div className={`stat-value${lifetimeNet < 0 ? ' negative-value' : ''}`}>{formatMoney(lifetimeNet, data.preferences.currency)}</div><div className="stat-foot">Lifetime income minus expenses</div><div className="balance-decoration"><i /><i /><i /></div></article>
        <StatCard label="Income this month" value={formatMoney(monthlyTotals.income, data.preferences.currency)} detail={`${monthTransactions.filter((item) => item.type === 'income').length} ${monthTransactions.filter((item) => item.type === 'income').length === 1 ? 'deposit' : 'deposits'}`} icon={<ArrowDownLeft size={17} />} tone="mint" />
        <StatCard label="Spent this month" value={formatMoney(monthlyTotals.expenses, data.preferences.currency)} detail={`${monthTransactions.filter((item) => item.type === 'expense').length} ${monthTransactions.filter((item) => item.type === 'expense').length === 1 ? 'transaction' : 'transactions'}`} icon={<ArrowUpRight size={17} />} tone="lavender" />
        <article className="stat-card"><div className="stat-top"><span className="stat-label">Net cash flow</span><span className="stat-icon peach-icon"><TrendingUp size={17} /></span></div><div className={`stat-value${monthlyTotals.net < 0 ? ' negative-value' : ''}`}>{formatMoney(monthlyTotals.net, data.preferences.currency)}</div><div className="stat-foot">{savingsRate === null ? 'Savings rate —' : `Savings rate ${savingsRate.toFixed(1)}%`} · {formatMonth(month, { month: 'short' })}</div></article>
      </section>
      <section className="dashboard-grid">
        <Panel className="trend-panel" title="Income & expenses" subtitle="A six-month view of your cash flow" action={<span className="chart-legend"><i className="legend-income" />Income<i className="legend-expense" />Expenses</span>}>
          <TrendChart transactions={data.transactions} months={months} currency={data.preferences.currency} />
        </Panel>
        <Panel className="category-panel" title="Spending by category" subtitle={formatMonth(month)} action={<button type="button" className="text-action" onClick={() => onNavigate('transactions')}>Details <ArrowRight size={14} /></button>}>
          {categoryRows.length ? <><CategoryBars transactions={monthTransactions} currency={data.preferences.currency} limit={5} /><div className="category-total"><span>Total expenses</span><strong>{formatMoney(monthlyTotals.expenses, data.preferences.currency)}</strong></div></> : <div className="panel-empty"><span className="empty-chart-icon"><ArrowUpRight size={16} /></span><p>No expenses recorded for {formatMonth(month)}.</p></div>}
        </Panel>
      </section>
      <section className="dashboard-grid second-grid">
        <Panel title="Budget progress" subtitle={selectedBudgets.length ? `Your ${formatMonth(month)} limits` : 'Set a monthly limit for the categories that matter'} action={<button type="button" className="text-action" onClick={() => onNavigate('budgets')}>{selectedBudgets.length ? 'All budgets' : 'Set a budget'} <ArrowRight size={14} /></button>}>
          {selectedBudgets.length ? <div className="budget-preview-list">{selectedBudgets.slice(0, 4).map((budget) => <BudgetPreview key={budget.id} budget={budget} transactions={data.transactions} currency={data.preferences.currency} />)}{selectedBudgets.length > 4 && <button type="button" className="more-link" onClick={() => onNavigate('budgets')}>See {selectedBudgets.length - 4} more budgets</button>}</div> : <div className="panel-empty"><span className="empty-chart-icon"><Wallet size={16} /></span><p>No budgets for this month yet.</p></div>}
        </Panel>
        <Panel title="Recent transactions" subtitle="Your latest money moves" action={<button type="button" className="text-action" onClick={() => onNavigate('transactions')}>See all <ArrowRight size={14} /></button>}>
          <div className="recent-list">{recent.length ? recent.map((transaction) => <RecentRow key={transaction.id} transaction={transaction} currency={data.preferences.currency} />) : <div className="panel-empty"><p>No transactions yet.</p></div>}</div>
        </Panel>
      </section>
    </>}
    {addOpen && <Modal title="Add a transaction" description="Keep your records current and your picture clear." onClose={() => setAddOpen(false)}><TransactionForm onCancel={() => setAddOpen(false)} onSave={add} /></Modal>}
  </>
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: 'mint' | 'lavender' }) {
  return <article className="stat-card"><div className="stat-top"><span className="stat-label">{label}</span><span className={`stat-icon ${tone}-icon`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{detail}</div></article>
}

function BudgetPreview({ budget, transactions, currency }: { budget: Budget; transactions: Transaction[]; currency: Currency }) {
  const progress = budgetProgress(budget, transactions)
  return <div className="budget-preview"><div className="budget-preview-info"><div><strong>{budget.category}</strong><span>{formatMoney(progress.spentMinor, currency)} of {formatMoney(budget.amountMinor, currency)}</span></div><BudgetRing percent={progress.percent} label={`${Math.round(progress.percent)}%`} /></div><div className="budget-track"><span className={progress.exceeded ? 'over' : progress.warning ? 'warning' : ''} style={{ width: `${Math.min(progress.percent, 100)}%` }} /></div></div>
}

function RecentRow({ transaction, currency }: { transaction: Transaction; currency: Currency }) {
  const isIncome = transaction.type === 'income'
  return <div className="recent-item"><span className={`transaction-symbol ${isIncome ? 'symbol-income' : 'symbol-expense'}`}>{isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div className="recent-copy"><strong>{transaction.title}</strong><span>{transaction.category} <i>·</i> {formatDate(transaction.date, { month: 'short', day: 'numeric' })}</span></div><strong className={`recent-amount ${isIncome ? 'income-text' : ''}`}>{isIncome ? '+' : '−'}{formatMoney(transaction.amountMinor, currency)}</strong></div>
}
