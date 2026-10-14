import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Edit3, Plus, ShieldCheck, Trash2, WalletCards } from 'lucide-react'
import { EmptyState, PageHeading, Panel } from '../components/Layout'
import { BudgetForm } from '../components/BudgetForm'
import { ConfirmDialog, Modal } from '../components/Modal'
import { budgetProgress } from '../domain/finance'
import { formatMonth, shiftMonth } from '../domain/dates'
import { formatMoney } from '../domain/money'
import { createId } from '../domain/storage'
import type { Budget, ExpenseCategory, FinanceData } from '../domain/types'

export function Budgets({ data, month, setMonth, onSave, onDelete }: { data: FinanceData; month: string; setMonth: (month: string) => void; onSave: (budget: Budget) => void; onDelete: (id: string) => void }) {
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [deleting, setDeleting] = useState<Budget | null>(null)
  const monthBudgets = useMemo(() => data.budgets.filter((budget) => budget.month === month).sort((a, b) => a.category.localeCompare(b.category)), [data.budgets, month])
  const summary = monthBudgets.reduce((acc, budget) => {
    const progress = budgetProgress(budget, data.transactions)
    acc.budgeted += budget.amountMinor
    acc.spent += progress.spentMinor
    return acc
  }, { budgeted: 0, spent: 0 })
  const remaining = summary.budgeted - summary.spent
  const overCount = monthBudgets.filter((budget) => budgetProgress(budget, data.transactions).exceeded).length

  function save(category: ExpenseCategory, selectedMonth: string, amountMinor: number, existing?: Budget) {
    const duplicate = data.budgets.some((budget) => budget.id !== existing?.id && budget.category === category && budget.month === selectedMonth)
    if (duplicate) return `A ${category} budget already exists for ${formatMonth(selectedMonth)}. Edit that budget instead.`
    onSave({ id: existing?.id ?? createId(), category, month: selectedMonth, amountMinor })
    setAddOpen(false); setEditing(null)
    return null
  }

  return <>
    <PageHeading eyebrow="PLAN WITH INTENTION" title="Budgets" description="Give your spending a plan that feels right." action={<><label className="sr-only" htmlFor="budget-month-filter">Choose budget month</label><input className="month-input" id="budget-month-filter" type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} /><button type="button" className="button button-primary" onClick={() => setAddOpen(true)}><Plus size={17} />Create budget</button></>} />
    {monthBudgets.length ? <>
      <div className="month-switcher"><button type="button" className="icon-button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ArrowLeft size={17} /></button><strong>{formatMonth(month)}</strong><button type="button" className="icon-button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ArrowRight size={17} /></button></div>
      <section className="budget-summary-grid" aria-label="Budget summary">
        <SummaryCard label="Planned this month" value={formatMoney(summary.budgeted, data.preferences.currency)} icon={<WalletCards size={17} />} tone="mint" caption={`${monthBudgets.length} ${monthBudgets.length === 1 ? 'category' : 'categories'} with a limit`} />
        <SummaryCard label="Spent so far" value={formatMoney(summary.spent, data.preferences.currency)} icon={<ArrowRight size={17} />} tone="lavender" caption={summary.budgeted ? `${Math.round((summary.spent / summary.budgeted) * 100)}% of planned amount` : 'Expense transactions only'} />
        <SummaryCard label={remaining < 0 ? 'Over planned amount' : 'Remaining overall'} value={formatMoney(Math.abs(remaining), data.preferences.currency)} icon={remaining < 0 ? <AlertTriangle size={17} /> : <ShieldCheck size={17} />} tone={remaining < 0 ? 'peach' : 'mint'} caption={overCount ? `${overCount} ${overCount === 1 ? 'category is' : 'categories are'} over limit` : 'Across your monthly budgets'} />
      </section>
      <Panel className="budget-list-panel" title="Category budgets" subtitle={`Spending from expenses in ${formatMonth(month)}`}>
        <div className="budget-card-grid">{monthBudgets.map((budget) => <BudgetCard key={budget.id} budget={budget} transactions={data.transactions} currency={data.preferences.currency} onEdit={() => setEditing(budget)} onDelete={() => setDeleting(budget)} />)}</div>
      </Panel>
      <p className="budget-rule"><Check size={15} />Budget progress is calculated from expense transactions only. Moving or editing an expense updates this view automatically.</p>
    </> : <>
      <div className="month-switcher"><button type="button" className="icon-button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ArrowLeft size={17} /></button><strong>{formatMonth(month)}</strong><button type="button" className="icon-button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ArrowRight size={17} /></button></div>
      <Panel className="budget-empty-panel"><EmptyState title={`Give ${formatMonth(month, { month: 'long' })} a spending plan`} description="Create a category budget to see how your actual expenses compare with the limit you set." icon={<WalletCards size={22} />} action={<button type="button" className="button button-primary" onClick={() => setAddOpen(true)}><Plus size={17} />Create your first budget</button>} /></Panel>
    </>}
    {(addOpen || editing) && <Modal title={editing ? 'Edit budget' : 'Create a budget'} description="Set a monthly spending limit for one expense category." onClose={() => { setAddOpen(false); setEditing(null) }}><BudgetForm initial={editing ?? undefined} month={month} onCancel={() => { setAddOpen(false); setEditing(null) }} onSave={(category, selectedMonth, amountMinor) => save(category, selectedMonth, amountMinor, editing ?? undefined)} /></Modal>}
    {deleting && <ConfirmDialog title="Delete this budget?" description={`${deleting.category} spending transactions will stay in your history. Only this monthly limit will be removed.`} confirmLabel="Delete budget" destructive onCancel={() => setDeleting(null)} onConfirm={() => { onDelete(deleting.id); setDeleting(null) }} />}
  </>
}

function SummaryCard({ label, value, icon, tone, caption }: { label: string; value: string; icon: React.ReactNode; tone: 'mint' | 'lavender' | 'peach'; caption: string }) {
  return <article className="stat-card"><div className="stat-top"><span className="stat-label">{label}</span><span className={`stat-icon ${tone}-icon`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{caption}</div></article>
}

function BudgetCard({ budget, transactions, currency, onEdit, onDelete }: { budget: Budget; transactions: FinanceData['transactions']; currency: FinanceData['preferences']['currency']; onEdit: () => void; onDelete: () => void }) {
  const progress = budgetProgress(budget, transactions)
  const tone = progress.exceeded ? 'over' : progress.warning ? 'warning' : 'good'
  const status = progress.exceeded ? 'Over budget' : progress.warning ? 'Nearly there' : 'On track'
  return <article className={`budget-card ${tone}`}>
    <div className="budget-card-head"><span className="budget-category-icon"><WalletCards size={17} /></span><div className="budget-card-title"><h3>{budget.category}</h3><span className={`budget-status ${tone}`}>{progress.exceeded ? <AlertTriangle size={13} /> : <Check size={13} />}{status}</span></div><div className="budget-card-actions"><button className="icon-button" type="button" aria-label={`Edit ${budget.category} budget`} onClick={onEdit}><Edit3 size={15} /></button><button className="icon-button delete-action" type="button" aria-label={`Delete ${budget.category} budget`} onClick={onDelete}><Trash2 size={15} /></button></div></div>
    <div className="budget-numbers"><strong>{formatMoney(progress.spentMinor, currency)} <span>spent</span></strong><span>of {formatMoney(budget.amountMinor, currency)}</span></div>
    <div className="budget-progress-track" aria-label={`${Math.round(progress.percent)} percent used`} role="img"><span style={{ width: `${Math.min(100, progress.percent)}%` }} /></div>
    <div className="budget-card-foot"><span>{Math.round(progress.percent)}% used</span><span className={progress.remainingMinor < 0 ? 'over-text' : ''}>{progress.remainingMinor < 0 ? `${formatMoney(Math.abs(progress.remainingMinor), currency)} over` : `${formatMoney(progress.remainingMinor, currency)} left`}</span></div>
  </article>
}
