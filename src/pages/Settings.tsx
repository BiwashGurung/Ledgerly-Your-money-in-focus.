import { useRef, useState } from 'react'
import { AlertCircle, ArrowDownToLine, ChevronRight, FileDown, FileUp, Globe2, HardDrive, Info, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { PageHeading, Panel } from '../components/Layout'
import { ConfirmDialog } from '../components/Modal'
import type { LoadResult } from '../domain/storage'
import { STORAGE_VERSION } from '../domain/storage'
import { CURRENCIES, type Currency, type FinanceData, type PageId } from '../domain/types'

type ImportMode = 'merge' | 'replace' | ''

export function Settings({ data, storageStatus, preferencesLocked, onPreferencesChange, onImport, onReset, notify }: {
  data: FinanceData
  storageStatus: LoadResult['status'] | 'save-error'
  preferencesLocked: boolean
  onPreferencesChange: (patch: Partial<FinanceData['preferences']>) => void
  onImport: (text: string, mode: Exclude<ImportMode, ''>) => { ok: boolean; message: string }
  onReset: () => { ok: boolean; message: string }
  notify: (message: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importText, setImportText] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [mode, setMode] = useState<ImportMode>('')
  const [importError, setImportError] = useState('')
  const [replaceConfirm, setReplaceConfirm] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  function download(name: string, text: string, type: string) {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function exportBackup() {
    const payload = { version: STORAGE_VERSION, updatedAt: new Date().toISOString(), data }
    download(`ledgerly-backup-${new Date().toISOString().slice(0, 10)}.json`, `${JSON.stringify(payload, null, 2)}\n`, 'application/json')
    notify('Your versioned JSON backup is ready to save.')
  }

  function csvCell(value: string | number) {
    let text = String(value)
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }

  function exportCsv() {
    const lines = [
      ['id', 'title', 'type', 'amount', 'currency', 'category', 'date', 'payment_method', 'notes'].map(csvCell).join(','),
      ...data.transactions.map((item) => [item.id, item.title, item.type, (item.amountMinor / 100).toFixed(2), data.preferences.currency, item.category, item.date, item.paymentMethod ?? '', item.notes ?? ''].map(csvCell).join(',')),
    ]
    download(`ledgerly-transactions-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${lines.join('\r\n')}\r\n`, 'text/csv;charset=utf-8')
    notify(`${data.transactions.length} transactions exported as CSV.`)
  }

  async function chooseFile(file: File | undefined) {
    setImportError('')
    setImportText(null)
    setFileName('')
    if (!file) return
    try {
      const text = await file.text()
      if (text.length > 20_000_000) throw new Error('The selected file is larger than 20 MB.')
      setImportText(text)
      setFileName(file.name)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not read this file.')
    }
  }

  function startImport() {
    setImportError('')
    if (!importText) { setImportError('Choose a Ledgerly JSON backup first.'); return }
    if (!mode) { setImportError('Choose whether to merge or replace your current data.'); return }
    if (mode === 'replace') {
      try {
        JSON.parse(importText)
      } catch {
        setImportError('This file is not valid JSON. Your current data was not changed.')
        return
      }
      setReplaceConfirm(true)
      return
    }
    const result = onImport(importText, 'merge')
    if (result.ok) { notify(result.message); setImportText(null); setFileName(''); setMode(''); if (fileRef.current) fileRef.current.value = '' }
    else setImportError(result.message)
  }

  const statusText = storageStatus === 'ready' ? 'Available on this browser' : storageStatus === 'corrupt' ? 'Saved data needs attention' : storageStatus === 'future-version' ? 'Saved by a newer app version' : storageStatus === 'save-error' ? 'Could not save changes' : 'Unavailable in this browser'
  const dataCount = `${data.transactions.length} ${data.transactions.length === 1 ? 'transaction' : 'transactions'} · ${data.budgets.length} ${data.budgets.length === 1 ? 'budget' : 'budgets'}`

  return <>
    <PageHeading eyebrow="PREFERENCES & PRIVACY" title="Settings" description="Make Ledgerly yours and keep your records portable." />
    <div className="settings-layout">
      <div className="settings-main">
        <Panel className="settings-panel" title="Preferences" subtitle="A few choices for your day-to-day view.">
          <label className="setting-row" htmlFor="currency-setting"><span className="setting-icon mint-icon"><Globe2 size={18} /></span><span className="setting-copy"><strong>Display currency</strong><small>{preferencesLocked ? 'Restore or reset saved data to change this preference.' : 'Changes formatting only. Amounts are never converted.'}</small></span><select id="currency-setting" className="setting-select" disabled={preferencesLocked} value={data.preferences.currency} onChange={(event) => onPreferencesChange({ currency: event.target.value as Currency })}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          <label className="setting-row" htmlFor="default-view-setting"><span className="setting-icon lavender-icon"><HardDrive size={18} /></span><span className="setting-copy"><strong>Opening screen</strong><small>{preferencesLocked ? 'Restore or reset saved data to change this preference.' : 'Choose the page you see when you return.'}</small></span><select id="default-view-setting" className="setting-select" disabled={preferencesLocked} value={data.preferences.defaultView} onChange={(event) => onPreferencesChange({ defaultView: event.target.value as PageId })}><option value="overview">Overview</option><option value="transactions">Transactions</option><option value="budgets">Budgets</option><option value="reports">Reports</option><option value="settings">Settings</option></select></label>
        </Panel>

        <Panel className="settings-panel" title="Your data" subtitle="Export, move, or restore your records at any time.">
          <div className="export-card"><div className="export-icon"><FileDown size={19} /></div><div className="export-copy"><strong>Export a backup</strong><span>Versioned JSON · transactions, budgets, and preferences</span></div><button type="button" className="button button-secondary compact-button" onClick={exportBackup}><ArrowDownToLine size={15} />Backup</button></div>
          <div className="export-card"><div className="export-icon csv-icon">CSV</div><div className="export-copy"><strong>Export transactions</strong><span>Spreadsheet-ready CSV · {data.transactions.length} records</span></div><button type="button" className="button button-secondary compact-button" onClick={exportCsv}><ArrowDownToLine size={15} />Export CSV</button></div>
          <div className="import-box">
            <div className="import-heading"><span className="export-icon import-icon"><FileUp size={19} /></span><div className="export-copy"><strong>Restore or merge a backup</strong><span>Only validated Ledgerly JSON backups are accepted.</span></div></div>
            <div className="import-controls"><input ref={fileRef} className="sr-only" id="backup-file" type="file" accept="application/json,.json" onChange={(event) => void chooseFile(event.target.files?.[0])} /><button type="button" className="button button-secondary compact-button" onClick={() => fileRef.current?.click()}><FileUp size={15} />Choose JSON file</button><span className="selected-file" aria-live="polite">{fileName || 'No file selected'}</span></div>
            {fileName && <fieldset className="import-mode"><legend>How should this backup be applied?</legend><label><input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} /><span><strong>Merge</strong><small>Add new records. Existing records and preferences are kept.</small></span></label><label><input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /><span><strong>Replace</strong><small>Replace all current records and preferences with the backup.</small></span></label></fieldset>}
            {importError && <p className="form-error" role="alert">{importError}</p>}
            <div className="import-footer"><span>Current data: {dataCount}</span><button type="button" className="button button-primary compact-button" disabled={!fileName} onClick={startImport}><RefreshCw size={15} />Import backup</button></div>
          </div>
        </Panel>

        <Panel className="settings-panel danger-panel" title="Reset this app" subtitle="Permanently remove Ledgerly data from this browser profile.">
          <div className="reset-row"><div className="reset-icon"><Trash2 size={18} /></div><div className="export-copy"><strong>Clear all local data</strong><span>Removes every transaction, budget, and saved preference.</span></div><button type="button" className="button button-danger-outline compact-button" onClick={() => setResetConfirm(true)}>Reset data</button></div>
        </Panel>
      </div>
      <aside className="settings-aside">
        <section className="privacy-card"><span className="privacy-card-icon"><LockKeyhole size={19} /></span><h2>Private by design</h2><p>Ledgerly runs entirely in your browser. Your information stays in local storage on this device and is never sent to a server.</p><div className="privacy-divider" /><div className="storage-status"><span className={`storage-status-dot ${storageStatus === 'ready' ? 'ok' : 'attention'}`} /><div><strong>{statusText}</strong><span>{dataCount}</span></div></div></section>
        <section className="settings-note"><Info size={17} /><div><strong>Good to know</strong><p>Local storage is tied to this browser profile and website origin. It is not encrypted, can be lost if site data is cleared, and does not sync between devices. Keep a JSON backup somewhere safe.</p></div></section>
        {storageStatus === 'corrupt' || storageStatus === 'future-version' || storageStatus === 'save-error' ? <section className="settings-warning"><AlertCircle size={17} /><div><strong>Data needs attention</strong><p>Export any accessible records and import a valid backup or reset the app to continue.</p></div></section> : null}
        <div className="settings-version"><ShieldCheck size={15} /><span>Ledgerly data format v{STORAGE_VERSION}</span><ChevronRight size={14} /></div>
      </aside>
    </div>
    {replaceConfirm && <ConfirmDialog title="Replace all current data?" description="This will remove your current transactions, budgets, and preferences and restore the selected backup. The backup will be fully validated before any data is changed." confirmLabel="Replace current data" destructive onCancel={() => setReplaceConfirm(false)} onConfirm={() => {
      const result = onImport(importText ?? '', 'replace')
      if (result.ok) { notify(result.message); setImportText(null); setFileName(''); setMode(''); if (fileRef.current) fileRef.current.value = '' }
      else setImportError(result.message)
      setReplaceConfirm(false)
    }} />}
    {resetConfirm && <ConfirmDialog title="Clear all Ledgerly data?" description="This permanently deletes all saved transactions, budgets, and preferences from this browser. Export a backup first if you may need these records." confirmLabel="Delete all data" destructive onCancel={() => setResetConfirm(false)} onConfirm={() => { const result = onReset(); if (result.ok) notify(result.message); else setImportError(result.message); setResetConfirm(false) }} />}
  </>
}
