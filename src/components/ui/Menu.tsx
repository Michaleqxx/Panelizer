import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './cx'

interface MenuProps {
  /** Trigger button contents. */
  label: ReactNode
  /** Which edge the popover aligns to. */
  align?: 'left' | 'right'
  ariaLabel?: string
  /** Trigger styling — `ghost` for triggers sitting inside a segmented group,
   *  `primary` when the trigger represents the active choice. */
  variant?: 'default' | 'ghost' | 'primary'
  /** Rendered with a `close` callback so items can dismiss the menu. */
  children: (close: () => void) => ReactNode
}

/** A button that opens a popover, closing on outside click or Escape. */
export function Menu({ label, align = 'left', ariaLabel, variant = 'default', children }: MenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={variant}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </Button>
      {open && (
        <div
          className={cx(
            'absolute top-[calc(100%+4px)] z-50 min-w-max rounded border border-edge',
            'bg-surface shadow-lg shadow-black/40',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

/** A vertical list of menu items — the usual popover contents. */
export function MenuList({ children }: { children: ReactNode }) {
  return <div className="flex min-w-44 flex-col py-1">{children}</div>
}

/** One clickable row in a MenuList. */
export function MenuItem({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'cursor-pointer border-0 bg-transparent px-3 py-1.5 text-left text-ink',
        'hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40',
        danger && 'text-danger hover:bg-danger hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

/** A non-interactive heading separating groups of items. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-ink-dim uppercase">
      {children}
    </div>
  )
}

/** A row of mutually-exclusive choices (units, precision) inside a menu. */
export function MenuChoices<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 px-3 pb-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'cursor-pointer rounded border px-2 py-0.5 text-xs',
            value === o.value
              ? 'border-accent bg-accent text-white'
              : 'border-edge bg-surface-2 text-ink hover:bg-surface-3',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
