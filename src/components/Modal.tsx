import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function Modal({ title, description, onClose, children, wide = false }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.classList.add('modal-open')
    dialogRef.current?.focus()
    return () => {
      document.body.classList.remove('modal-open')
      previous?.focus()
    }
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
    if (event.key === 'Tab') {
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
      if (!nodes?.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined} tabIndex={-1} onKeyDown={handleKeyDown}>
        <div className="modal-head">
          <div><h2 id="modal-title">{title}</h2>{description && <p id="modal-description">{description}</p>}</div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ title, description, confirmLabel, destructive = false, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <Modal title={title} description={description} onClose={onCancel}>
      <div className="dialog-actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className={`button ${destructive ? 'button-danger' : 'button-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
