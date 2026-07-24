import { useEffect, useState } from 'react'
import { Button } from './Button'
import { registerConfirmHost, type PendingConfirm } from './useConfirm'

/** Mount once, near the app root. Renders whichever confirmation is pending.
 *  See {@link useConfirm} for why this exists rather than `window.confirm`. */
export function ConfirmHost() {
  const [request, setRequest] = useState<PendingConfirm | null>(null)

  useEffect(() => registerConfirmHost(setRequest), [])

  const settle = (ok: boolean) => {
    request?.resolve(ok)
    setRequest(null)
  }

  useEffect(() => {
    if (!request) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false)
      if (e.key === 'Enter') settle(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!request) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={request.title}
      onClick={() => settle(false)}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-edge bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="m-0 border-b border-edge px-4 py-3 text-base font-semibold">{request.title}</h2>
        <div className="text-small px-4 py-3 leading-relaxed text-ink-dim">{request.body}</div>
        <div className="flex justify-end gap-3 border-t border-edge px-4 py-3">
          <Button onClick={() => settle(false)}>Cancel</Button>
          <Button
            variant={request.destructive ? 'danger' : 'primary'}
            autoFocus
            onClick={() => settle(true)}
          >
            {request.confirmLabel ?? 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
