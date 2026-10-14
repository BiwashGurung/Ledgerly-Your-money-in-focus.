import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, HardDrive, ShieldAlert } from 'lucide-react'
import { Layout } from './components/Layout'
import { Toast } from './components/Toast'
import { Budgets } from './pages/Budgets'
import { Overview } from './pages/Overview'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { Transactions } from './pages/Transactions'
import { currentMonthKey } from './domain/dates'
import { parseBackup, readStore, STORAGE_KEY, writeStore, type LoadResult } from './domain/storage'
import { EMPTY_DATA, type Budget, type FinanceData, type PageId, type Transaction } from './domain/types'

function availableStorage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export default function App() {
  const [storage] = useState<Storage | null>(() => availableStorage())
  const [initial] = useState<LoadResult>(() => readStore(storage))
  const [data, setData] = useState<FinanceData>(initial.data)
  const [loadStatus, setLoadStatus] = useState<LoadResult['status']>(initial.status)
  const [storageMessage, setStorageMessage] = useState(initial.status === 'ready' ? '' : initial.message)
  const [saveError, setSaveError] = useState('')
  const [dirty, setDirty] = useState(initial.status === 'ready' && initial.migrated)
  const [page, setPage] = useState<PageId>(initial.status === 'ready' ? initial.data.preferences.defaultView : 'overview')
  const [month, setMonth] = useState(currentMonthKey())
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const isProtected = loadStatus === 'corrupt' || loadStatus === 'future-version'
  const storageState = saveError ? 'save-error' : loadStatus

  const notify = useCallback((message: string) => setToastMessage(message), [])
  const dismissToast = useCallback(() => setToastMessage(null), [])

  useEffect(() => {
    if (!dirty) return
    if (isProtected) {
      setDirty(false)
      return
    }
    const result = writeStore(storage, data)
    setDirty(false)
    if (result.ok) {
      setSaveError('')
      setStorageMessage('')
    } else setSaveError(result.message)
  }, [data, dirty, isProtected, storage])

  function updateData(transform: (current: FinanceData) => FinanceData) {
    if (isProtected) {
      notify('Saved data is protected. Import a valid backup or reset this app before making changes.')
      return false
    }
    setData((current) => transform(current))
    setDirty(true)
    return true
  }

  function saveTransaction(transaction: Transaction) {
    if (updateData((current) => {
      const exists = current.transactions.some((item) => item.id === transaction.id)
      return { ...current, transactions: exists ? current.transactions.map((item) => item.id === transaction.id ? transaction : item) : [...current.transactions, transaction] }
    })) notify('Transaction saved.')
  }

  function deleteTransaction(id: string) {
    if (updateData((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }))) notify('Transaction deleted.')
  }

  function saveBudget(budget: Budget) {
    if (updateData((current) => {
      const exists = current.budgets.some((item) => item.id === budget.id)
      return { ...current, budgets: exists ? current.budgets.map((item) => item.id === budget.id ? budget : item) : [...current.budgets, budget] }
    })) notify('Budget saved.')
  }

  function deleteBudget(id: string) {
    if (updateData((current) => ({ ...current, budgets: current.budgets.filter((item) => item.id !== id) }))) notify('Budget deleted.')
  }

  function updatePreferences(patch: Partial<FinanceData['preferences']>) {
    if (isProtected) {
      notify('Import a valid backup or reset this app before changing preferences.')
      return
    }
    updateData((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }))
  }

  function importBackup(text: string, mode: 'merge' | 'replace') {
    let imported: FinanceData
    try { imported = parseBackup(text) } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'This backup is invalid. Current data was not changed.' }
    }
    if (mode === 'merge' && isProtected) return { ok: false, message: 'Choose Replace to recover protected or unreadable saved data.' }
    let next = imported
    let transactionCount = imported.transactions.length
    let budgetCount = imported.budgets.length
    if (mode === 'merge') {
      const transactionIds = new Set(data.transactions.map((item) => item.id))
      const incomingTransactions = imported.transactions.filter((item) => !transactionIds.has(item.id))
      const budgetKeys = new Set(data.budgets.map((item) => `${item.category}:${item.month}`))
      const incomingBudgets = imported.budgets.filter((item) => !budgetKeys.has(`${item.category}:${item.month}`))
      transactionCount = incomingTransactions.length
      budgetCount = incomingBudgets.length
      next = { transactions: [...data.transactions, ...incomingTransactions], budgets: [...data.budgets, ...incomingBudgets], preferences: data.preferences }
    }
    const result = writeStore(storage, next)
    if (!result.ok) return { ok: false, message: result.message }
    setData(next)
    setDirty(false)
    setLoadStatus('ready')
    setStorageMessage('')
    setSaveError('')
    if (mode === 'replace') return { ok: true, message: `Restored ${transactionCount} transactions and ${budgetCount} budgets.` }
    return { ok: true, message: `Merged ${transactionCount} new transactions and ${budgetCount} new budgets. Existing records and preferences were kept.` }
  }

  function resetData() {
    if (!storage) return { ok: false, message: 'Browser storage is unavailable, so saved data could not be removed.' }
    try { storage.removeItem(STORAGE_KEY) } catch {
      return { ok: false, message: 'Could not remove saved data. Your existing browser data is unchanged.' }
    }
    setData(structuredClone(EMPTY_DATA))
    setPage('overview')
    setLoadStatus('ready')
    setStorageMessage('')
    setSaveError('')
    setDirty(false)
    return { ok: true, message: 'All Ledgerly data has been cleared from this browser.' }
  }

  const storageAlert = useMemo(() => {
    if (saveError) return { icon: <AlertTriangle size={16} />, text: saveError, tone: 'alert' }
    if (loadStatus === 'ready') return null
    if (loadStatus === 'unavailable') return { icon: <HardDrive size={16} />, text: storageMessage, tone: 'warning' }
    return { icon: <ShieldAlert size={16} />, text: storageMessage, tone: 'alert' }
  }, [loadStatus, saveError, storageMessage])

  return <Layout page={page} setPage={setPage}>
    {storageAlert && <div className={`storage-alert ${storageAlert.tone}`} role="status"><span className="storage-alert-icon">{storageAlert.icon}</span><span>{storageAlert.text}</span><button type="button" onClick={() => setPage('settings')}>Manage data <ArrowRight size={14} /></button></div>}
    {page === 'overview' && <Overview data={data} month={month} setMonth={setMonth} onNavigate={setPage} onAddTransaction={saveTransaction} />}
    {page === 'transactions' && <Transactions data={data} onSave={saveTransaction} onDelete={deleteTransaction} />}
    {page === 'budgets' && <Budgets data={data} month={month} setMonth={setMonth} onSave={saveBudget} onDelete={deleteBudget} />}
    {page === 'reports' && <Reports data={data} month={month} setMonth={setMonth} />}
    {page === 'settings' && <Settings data={data} storageStatus={storageState} preferencesLocked={isProtected} onPreferencesChange={updatePreferences} onImport={importBackup} onReset={resetData} notify={notify} />}
    <Toast message={toastMessage} onDismiss={dismissToast} />
  </Layout>
}
