import { useEffect } from 'react'
import { Check, X } from 'lucide-react'

export function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timeout)
  }, [message, onDismiss])

  if (!message) return null
  return <div className="toast" role="status" aria-live="polite"><span className="toast-mark"><Check size={15} /></span><span>{message}</span><button type="button" className="toast-close" aria-label="Dismiss notification" onClick={onDismiss}><X size={16} /></button></div>
}
