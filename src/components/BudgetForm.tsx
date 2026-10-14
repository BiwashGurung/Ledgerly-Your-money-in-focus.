import { useState, type FormEvent } from 'react'
import { EXPENSE_CATEGORIES, type Budget } from '../domain/types'
import { parseAmountToMinor } from '../domain/money'
import { validateBudget } from '../domain/validation'

export function BudgetForm({ initial, month, onSave, onCancel }: { initial?: Budget; month: string; onSave: (category: Budget['category'], month: string, amountMinor: number) => string | null; onCancel: () => void }) {
  const [category, setCategory] = useState<Budget['category']>(initial?.category ?? EXPENSE_CATEGORIES[0])
  const [selectedMonth, setSelectedMonth] = useState(initial?.month ?? month)
  const [amount, setAmount] = useState(initial ? (initial.amountMinor / 100).toFixed(2) : '')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formValues = new FormData(event.currentTarget)
    const submittedCategory = String(formValues.get('category') ?? category) as Budget['category']
    const submittedMonth = String(formValues.get('month') ?? selectedMonth)
    const amountMinor = parseAmountToMinor(String(formValues.get('amount') ?? amount)) ?? -1
    const validation = validateBudget(submittedCategory, submittedMonth, amountMinor)
    if (validation) { setError(validation); return }
    setError(onSave(submittedCategory, submittedMonth, amountMinor))
  }

  return <form className="form-stack" onSubmit={submit} noValidate>
    <div className="form-grid">
      <label className="field field-full" htmlFor="budget-category"><span>Expense category</span><select id="budget-category" name="category" value={category} onChange={(event) => setCategory(event.target.value as Budget['category'])}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field" htmlFor="budget-month"><span>Budget month</span><input id="budget-month" name="month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
      <label className="field" htmlFor="budget-amount"><span>Monthly limit</span><input id="budget-amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" autoFocus /></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="button button-primary">{initial ? 'Save changes' : 'Create budget'}</button></div>
  </form>
}
