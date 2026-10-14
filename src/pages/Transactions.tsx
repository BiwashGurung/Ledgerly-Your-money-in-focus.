import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Edit3, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { EmptyState, PageHeading, Panel } from '../components/Layout'
import { ConfirmDialog, Modal } from '../components/Modal'
import { TransactionForm, type TransactionDraft } from '../components/TransactionForm'
import { formatDate } from '../domain/dates'
import { formatMoney } from '../domain/money'
import { createId } from '../domain/storage'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type FinanceData, type Transaction, type TransactionType } from '../domain/types'

type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest'

export function Transactions({ data, onSave, onDelete }: { data: FinanceData; onSave: (transaction: Transaction) => void; onDelete: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'all' | TransactionType>('all')
  const [category, setCategory] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [page, setPage] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const pageSize = 8

  useEffect(() => setPage(0), [search, type, category, from, to, sort])
  const categories = useMemo(() => [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])], [])
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return data.transactions.filter((item) => {
      if (query && ![item.title, item.category, item.notes ?? '', item.paymentMethod ?? ''].some((value) => value.toLocaleLowerCase().includes(query))) return false
      if (type !== 'all' && item.type !== type) return false
      if (category !== 'all' && item.category !== category) return false
      if (from && item.date < from) return false
      if (to && item.date > to) return false
      return true
    }).sort((a, b) => {
      if (sort === 'oldest') return a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
      if (sort === 'highest') return b.amountMinor - a.amountMinor
      if (sort === 'lowest') return a.amountMinor - b.amountMinor
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    })
  }, [category, data.transactions, from, search, sort, to, type])
  const pageCount = Math.ceil(filtered.length / pageSize)
  const visible = filtered.slice(page * pageSize, page * pageSize + pageSize)

  function save(draft: TransactionDraft, existing?: Transaction) {
    onSave({ ...draft, id: existing?.id ?? createId(), title: draft.title.trim(), paymentMethod: draft.paymentMethod.trim(), notes: draft.notes.trim() })
    setAddOpen(false)
    setEditing(null)
    return null
  }

  function clearFilters() {
    setSearch(''); setType('all'); setCategory('all'); setFrom(''); setTo(''); setSort('newest')
  }

  return <>
    <PageHeading eyebrow="YOUR ACTIVITY" title="Transactions" description="Every dollar, thoughtfully accounted for." action={<button type="button" className="button button-primary" onClick={() => setAddOpen(true)}><Plus size={17} />Add transaction</button>} />
    <Panel className="transactions-panel">
      {data.transactions.length ? <>
        <div className="filter-toolbar">
          <label className="search-field" htmlFor="transaction-search"><Search size={17} /><span className="sr-only">Search transactions</span><input id="transaction-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions…" /></label>
          <label className="filter-select" htmlFor="transaction-type"><span className="sr-only">Filter by type</span><select id="transaction-type" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></label>
          <label className="filter-select category-filter" htmlFor="transaction-category-filter"><span className="sr-only">Filter by category</span><select id="transaction-category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="filter-select sort-filter" htmlFor="transaction-sort"><span className="sr-only">Sort transactions</span><select id="transaction-sort" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Largest amount</option><option value="lowest">Smallest amount</option></select></label>
        </div>
        <div className="date-filter-row"><span className="date-filter-label"><SlidersHorizontal size={15} />Date range</span><label htmlFor="transaction-from"><span className="sr-only">From date</span><input id="transaction-from" type="date" value={from} onInput={(event) => setFrom(event.currentTarget.value)} onChange={(event) => setFrom(event.target.value)} /></label><span className="date-to">to</span><label htmlFor="transaction-to"><span className="sr-only">To date</span><input id="transaction-to" type="date" value={to} onInput={(event) => setTo(event.currentTarget.value)} onChange={(event) => setTo(event.target.value)} /></label>{(search || type !== 'all' || category !== 'all' || from || to || sort !== 'newest') && <button type="button" className="clear-filters" onClick={clearFilters}>Clear filters <X size={13} /></button>}</div>
        <div className="transaction-list" role="list" aria-label="Transactions">
          <div className="transaction-list-head" aria-hidden="true"><span>TRANSACTION</span><span>CATEGORY</span><span>DATE</span><span>AMOUNT</span><span className="sr-only">ACTIONS</span></div>
          {visible.length ? visible.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} currency={data.preferences.currency} onEdit={() => setEditing(transaction)} onDelete={() => setDeleting(transaction)} />) : <div className="filtered-empty"><span className="empty-chart-icon"><Search size={16} /></span><strong>No matching transactions</strong><p>Try adjusting your search or filters.</p><button type="button" className="text-action" onClick={clearFilters}>Clear filters</button></div>}
        </div>
        <div className="list-footer"><span>{filtered.length ? <>Showing <strong>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> transactions</> : '0 transactions'}</span>{pageCount > 1 && <nav className="pagination" aria-label="Transaction pages"><button type="button" className="icon-button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={17} /></button><span>Page {page + 1} of {pageCount}</span><button type="button" className="icon-button" aria-label="Next page" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}><ChevronRight size={17} /></button></nav>}</div>
      </> : <EmptyState title="Your money story starts here" description="Add income and expenses as they happen. Your transaction history powers every balance, report, and budget in Ledgerly." icon={<SlidersHorizontal size={22} />} action={<button type="button" className="button button-primary" onClick={() => setAddOpen(true)}><Plus size={17} />Add your first transaction</button>} />}
    </Panel>
    {addOpen && <Modal title="Add a transaction" description="Capture an income or expense." onClose={() => setAddOpen(false)}><TransactionForm onCancel={() => setAddOpen(false)} onSave={(draft) => save(draft)} /></Modal>}
    {editing && <Modal title="Edit transaction" description="Changes update your summaries and budgets immediately." onClose={() => setEditing(null)}><TransactionForm initial={editing} onCancel={() => setEditing(null)} onSave={(draft) => save(draft, editing)} /></Modal>}
    {deleting && <ConfirmDialog title="Delete this transaction?" description={`“${deleting.title}” will be removed from your history and all related totals and budgets will update.`} confirmLabel="Delete transaction" destructive onCancel={() => setDeleting(null)} onConfirm={() => { onDelete(deleting.id); setDeleting(null) }} />}
  </>
}

function TransactionRow({ transaction, currency, onEdit, onDelete }: { transaction: Transaction; currency: FinanceData['preferences']['currency']; onEdit: () => void; onDelete: () => void }) {
  const isIncome = transaction.type === 'income'
  return <div className="transaction-row" role="listitem">
    <div className="transaction-main"><span className={`transaction-symbol ${isIncome ? 'symbol-income' : 'symbol-expense'}`}>{isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div><strong>{transaction.title}</strong><span className="transaction-subline">{transaction.paymentMethod || transaction.type}</span></div></div>
    <span className="transaction-category">{transaction.category}<span className={`mobile-type-tag ${isIncome ? 'income-tag' : ''}`}>{isIncome ? 'Income' : 'Expense'}</span></span>
    <time className="transaction-date" dateTime={transaction.date}>{formatDate(transaction.date)}</time>
    <strong className={`transaction-amount ${isIncome ? 'income-text' : ''}`}>{isIncome ? '+' : '−'}{formatMoney(transaction.amountMinor, currency)}</strong>
    <div className="row-actions"><button type="button" className="icon-button" aria-label={`Edit ${transaction.title}`} onClick={onEdit}><Edit3 size={15} /></button><button type="button" className="icon-button delete-action" aria-label={`Delete ${transaction.title}`} onClick={onDelete}><Trash2 size={15} /></button></div>
  </div>
}
