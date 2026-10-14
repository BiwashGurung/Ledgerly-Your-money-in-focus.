import { ArrowUpRight, BarChart3, LayoutDashboard, ReceiptText, Settings2, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PageId } from '../domain/types'

const items: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'budgets', label: 'Budgets', icon: WalletCards },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
]

export function Layout({ page, setPage, children }: { page: PageId; setPage: (page: PageId) => void; children: ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); setPage('overview') }} aria-label="Ledgerly home"><span className="brand-mark"><span /></span><span className="brand-name">ledgerly<span>.</span></span></a>
      <div className="workspace-label">YOUR MONEY</div>
      <nav className="side-nav" aria-label="Main navigation">{items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setPage(id)} className={`nav-link${page === id ? ' active' : ''}`} aria-label={label} aria-current={page === id ? 'page' : undefined}><Icon size={19} strokeWidth={1.85} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <div className="privacy-note"><span className="privacy-orb"><span /></span><div><strong>Your data stays yours</strong><span>Stored on this device</span></div></div>
        <button type="button" onClick={() => setPage('settings')} className={`nav-link${page === 'settings' ? ' active' : ''}`} aria-label="Settings" aria-current={page === 'settings' ? 'page' : undefined}><Settings2 size={19} strokeWidth={1.85} /><span>Settings</span></button>
        <div className="sidebar-footnote">
  Made for a clearer tomorrow
  <br />
  <a
    href="https://www.biwashgurung.com.np/"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Visit Biwash Creatives portfolio"
    className="sidebar-credit-link"
  >
    Built by Biwash.Creatives
    <ArrowUpRight size={13} />
  </a>
</div>
      </div>
    </aside>
    <div className="main-column">
      <header className="mobile-brand"><a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); setPage('overview') }}><span className="brand-mark"><span /></span><span className="brand-name">ledgerly<span>.</span></span></a><span className="local-badge"><i />Built by Biwash.Creatives</span></header>
      <main className="page-content" id="main-content" tabIndex={-1}>{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{[...items, { id: 'settings' as const, label: 'Settings', icon: Settings2 }].map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setPage(id)} className={`mobile-nav-link${page === id ? ' active' : ''}`} aria-label={label} aria-current={page === id ? 'page' : undefined}><Icon size={20} strokeWidth={1.8} /><span>{label}</span></button>)}</nav>
  </div>
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow ?? 'YOUR FINANCES'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>
}

export function Panel({ title, subtitle, action, className = '', children }: { title?: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return <section className={`panel ${className}`}>{(title || subtitle || action) && <div className="panel-heading"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{action && <div className="panel-action">{action}</div>}</div>}{children}</section>
}

export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="empty-state"><span className="empty-state-icon">{icon}</span><h2>{title}</h2><p>{description}</p>{action}</div>
}
