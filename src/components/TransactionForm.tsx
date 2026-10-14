import { useState, type FormEvent } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Transaction, type TransactionType } from '../domain/types'
import { toLocalISODate } from '../domain/dates'
import { parseAmountToMinor } from '../domain/money'
import { validateTransaction } from '../domain/validation'

export interface TransactionDraft {
  title: string
  type: TransactionType
  amountMinor: number
  category: string
  date: string
  paymentMethod: string
  notes: string
}

export function TransactionForm({ initial, onSave, onCancel }: { initial?: Transaction; onSave: (draft: TransactionDraft) => string | null; onCancel: () => void }) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(initial ? (initial.amountMinor / 100).toFixed(2) : '')
  const [category, setCategory] = useState(initial?.category ?? 'Housing')
  const [date, setDate] = useState(initial?.date ?? toLocalISODate())
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const categories: readonly string[] = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  function updateType(next: TransactionType) {
    setType(next)
    setCategory(next === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formValues = new FormData(event.currentTarget)
    const submittedTitle = String(formValues.get('title') ?? title)
    const submittedAmount = String(formValues.get('amount') ?? amount)
    const submittedCategory = String(formValues.get('category') ?? category)
    const submittedDate = String(formValues.get('date') ?? date)
    const submittedPaymentMethod = String(formValues.get('paymentMethod') ?? paymentMethod)
    const submittedNotes = String(formValues.get('notes') ?? notes)
    const amountMinor = parseAmountToMinor(submittedAmount) ?? -1
    const draft = { title: submittedTitle, type, amountMinor, category: submittedCategory, date: submittedDate, paymentMethod: submittedPaymentMethod, notes: submittedNotes }
    const validation = validateTransaction(draft)
    if (validation) { setError(validation); return }
    setError(onSave(draft))
  }

  return <form className="form-stack" onSubmit={submit} noValidate>
    <div className="segmented-control" aria-label="Transaction type">
      <button type="button" className={type === 'expense' ? 'selected' : ''} aria-pressed={type === 'expense'} onClick={() => updateType('expense')}>Expense</button>
      <button type="button" className={type === 'income' ? 'selected' : ''} aria-pressed={type === 'income'} onClick={() => updateType('income')}>Income</button>
    </div>
    <div className="form-grid">
      <label className="field field-full" htmlFor="transaction-title"><span>Title</span><input id="transaction-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Weekly groceries" maxLength={80} autoFocus /></label>
      <label className="field" htmlFor="transaction-amount"><span>Amount</span><div className="input-prefix"><span aria-hidden="true">{type === 'income' ? '+' : '−'}</span><input id="transaction-amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></label>
      <label className="field" htmlFor="transaction-category"><span>Category</span><select id="transaction-category" name="category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field" htmlFor="transaction-date"><span>Date</span><input id="transaction-date" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="field" htmlFor="transaction-method"><span>Payment method <small>Optional</small></span><select id="transaction-method" name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="">Choose a method</option>{['Cash', 'Debit card', 'Credit card', 'Bank transfer', 'Mobile payment', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field field-full" htmlFor="transaction-notes"><span>Notes <small>Optional</small></span><textarea id="transaction-notes" name="notes" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a detail you might want to remember" /></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="button button-primary">{initial ? 'Save changes' : 'Add transaction'}</button></div>
  </form>
}
